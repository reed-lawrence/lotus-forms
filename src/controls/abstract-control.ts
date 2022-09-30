import {
  BehaviorSubject,
  filter,
  map,
  Observable,
  shareReplay,
  startWith,
  Subject,
  Subscription
} from 'rxjs';
import {
  ControlStreamCtor,
  ErrorsChange,
  IControlStreamEvent,
  NameChange,
  StateChange,
  ValidChange,
  ValueChange
} from '../internal/events';
import { flattenToDistinctStr } from '../internal/utils';
import { ILoader } from '../internal/loader';
import { ValidatorFn } from '../validators/validators';
import { randomUUID } from 'crypto';
import { IMixin } from '../internal/mixin';
import { IHasStream } from '../internal/interfaces';

export enum AbstractControlState {
  pristine,
  dirty
}

export interface IAbstractControl<T = any> {

  getName(): string;
  setName(value: string): void;

  getValue(): T;
  setValue(value: T): void;

  getValid(): boolean;
  setValid(value: boolean): void;

  getDirty(): boolean;
  getPristine(): boolean;

  getState(): AbstractControlState;
  setState(value: AbstractControlState): void;

  getErrors(): string[];

  $valid(): Observable<boolean>;
  $name(): Observable<string | undefined>;
  $value(): Observable<T>;
  $state(): Observable<AbstractControlState>;
  $errors(): Observable<Map<ValidatorFn, string[]>>;
  $loading(): Observable<boolean>;

  addLoader(): Promise<ILoader>;
  onDispose(add: () => void): void;
  dispose(): void;
  reset(): void;

  addValidator(validators: ValidatorFn<this>[]): void;
  addValidator(validator: ValidatorFn<this>): void;
  addValidator(arg: ValidatorFn<this> | ValidatorFn<this>[]): void;

  removeValidator(validator: ValidatorFn<IAbstractControl>): void;
}

export interface IAbstractControlArgs<T = any> {
  value: T;
  name: string;
}

export abstract class AbstractControl<T = any> implements IAbstractControl<T>, IMixin, IHasStream {

  __mixins__ = new Map<Function, Record<string, any>>();

  constructor(args: IAbstractControlArgs<T>) {
    this.#value = args.value;
  }

  getStream: <T>({ key, fn }: { key: ControlStreamCtor<any>; fn: () => T; }) => Observable<T> = ({ key, fn }) => {
    let stream = this._streams.get(key);

    if (!stream) {
      stream = this.$stream.pipe(
        filter(ev => ev instanceof key),
        map(() => fn()),
        startWith(fn()),
        shareReplay()
      );

      this._streams.set(key, stream);
    }

    return stream;
  };

  protected readonly _default!: T;
  protected readonly _subs: Subscription[] = [];
  protected readonly _onDispose: (() => void)[] = [];
  protected readonly _validators = new Map<ValidatorFn<this>, { errors: string[]; sub: Subscription; }>();
  protected readonly _streams = new Map<ControlStreamCtor, Observable<any>>();
  protected readonly _$loadingQueue = new BehaviorSubject(new Set<string>());

  readonly $stream = new Subject<IControlStreamEvent>();

  #name: string = '';
  getName() {
    return this.#name;
  }

  setName(value: string) {
    if (this.#name === value)
      return;

    this.#name = value;
    this.$stream.next(new NameChange(value));
  }

  #value!: T;
  getValue() {
    return this.#value;
  }

  setValue(value: T) {
    if (value === this.#value)
      return;

    this.#value = value;
    this.$stream.next(new ValueChange(value));
  }

  #valid = true;
  getValid() {
    return this.#valid;
  }

  setValid(value: boolean) {
    if (value === this.#valid)
      return;

    this.#valid = value;
    this.$stream.next(new ValidChange(value));
  }

  #state = AbstractControlState.pristine;
  getDirty() {
    return this.#state === AbstractControlState.dirty;
  }

  getPristine() {
    return this.#state === AbstractControlState.pristine;
  }

  getState(): AbstractControlState {
    return this.#state;
  }

  setState(value: AbstractControlState) {
    if (this.#state === value)
      return;

    this.#state = value;
    this.$stream.next(new StateChange(value));
  }

  #errors_distinct: string[] = [];
  #error_refs = new Map<ValidatorFn, string[]>();
  getErrors() {
    return this.#errors_distinct;
  }

  #loading = this._$loadingQueue.pipe(map(queue => queue.size > 0));
  $loading(): Observable<boolean> {
    return this.#loading;
  }

  $name() {
    return this.getStream({ key: NameChange, fn: () => this.getName() });
  }

  $value() {
    return this.getStream({ key: ValueChange, fn: () => this.getValue() });
  }

  $errors() {
    return this.getStream({ key: ErrorsChange, fn: () => this.#error_refs })
  }

  $valid() {
    return this.getStream({ key: ValidChange, fn: () => this.getValid() });
  }

  $state() {
    return this.getStream({ key: StateChange, fn: () => this.getState() });
  }

  addValidator(arg: unknown) {
    let validators = (Array.isArray(arg) ? arg : [arg]) as ValidatorFn<this>[];

    for (const validator of validators) {

      if (this._validators.has(validator))
        continue;

      this._validators.set(validator, {
        errors: [],
        sub: validator(this).pipe(
          map(errors => Object.values(errors || {})),
        ).subscribe({
          next: async (errors) => {

            let dirty = false;
            let current = new Set<string>(this.#error_refs.get(validator as ValidatorFn) || []);

            for (const err of current) {
              if (errors.indexOf(err) === -1) {
                dirty = true;
                current.delete(err);
              }
            }

            if (errors.length) {

              for (const err of errors)
                if (!current.has(err)) {
                  current.add(err);
                  dirty = true;
                }

            }

            if (dirty) {
              const all = this.#error_refs;

              if (current.size)
                all.set(validator as ValidatorFn, Array.from(current.values()));
              else
                all.delete(validator as ValidatorFn);

              this.#error_refs = all;
              this.#errors_distinct = flattenToDistinctStr(all.values());

              this.$stream.next(new ErrorsChange(this.#error_refs));

            }

          }
        })
      });
    }
  }

  removeValidator(validator: ValidatorFn): void {
    if (!validator)
      return;

    const match = this._validators.get(validator);

    if (!match)
      return;

    match.sub.unsubscribe();

    let all = this.#error_refs;

    if (all.has(validator)) {
      all = new Map(all);
      all.delete(validator);

      this.#error_refs = all;
      this.#errors_distinct = flattenToDistinctStr(all.values());

      this.$stream.next(new ErrorsChange(all));
    }
  }

  async addLoader(): Promise<ILoader> {
    const id = randomUUID();

    let queue = new Set(this._$loadingQueue.value);
    queue.add(id);
    this._$loadingQueue.next(queue);

    await Promise.resolve(); // To flush UI updates

    return {
      id,
      remove: async () => {

        queue = new Set(this._$loadingQueue.value);
        queue.delete(id);
        this._$loadingQueue.next(queue);

        await Promise.resolve();

        return;
      }
    };
  }

  onDispose(add: () => void): void {
    this._onDispose.push(add);
  }

  dispose(): void {
    for (const fn of this._onDispose)
      try {
        fn();
      } catch (err) {
        console.error(err);
      }
  }

  reset(): void {
    if (typeof this._default === 'object')
      this.setValue(Object.assign({}, this._default));
    else
      this.setValue(this._default);

    this.setState(AbstractControlState.pristine);
  }


}