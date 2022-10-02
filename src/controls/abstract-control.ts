import {
  BehaviorSubject,
  filter,
  map,
  Observable,
  shareReplay,
  startWith,
  Subject,
  Subscription,
  skip
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
import { IMixin } from '../internal/mixin';
import { IDisposable, IHasState, IHasStream } from '../internal/interfaces';

export enum AbstractControlState {
  pristine,
  dirty
}

export interface IAbstractControl<T = any> {

  name: string;
  value: T;
  valid: boolean;
  state: AbstractControlState;

  get dirty(): boolean;
  get pristine(): boolean;

  get errors(): string[];

  get $valid(): Observable<boolean>;
  get $name(): Observable<string | undefined>;
  get $value(): Observable<T>;
  get $state(): Observable<AbstractControlState>;
  get $errors(): Observable<Map<ValidatorFn, string[]>>;
  get $loading(): Observable<boolean>;

  addLoader(): Promise<ILoader>;
  onDispose(add: () => void): void;
  dispose(): void;
  reset(): void;

  addValidator(validators: ValidatorFn<this>[]): void;
  addValidator(validator: ValidatorFn<this>): void;
  addValidator(arg: ValidatorFn<this> | ValidatorFn<this>[]): void;

  removeValidator(validator: ValidatorFn<IAbstractControl>): void;
}

export interface IAbstractControlArgs<T = any, ControlType extends IAbstractControl<T> = AbstractControl<T>> {
  value: T;
  name: string;
  equalityOperator?: (a: T, b: T) => boolean;
  validators?: ValidatorFn<ControlType>[];
}

export abstract class AbstractControl<T = any> implements IAbstractControl<T>, IMixin, IHasStream, IDisposable, IHasState {

  constructor(args: IAbstractControlArgs<T>) {
    this.#value = args.value;
    this.#name = args.name;

    this.addValidator(args.validators || []);

    this._subs.push(

      this.$value.pipe(skip(1)).subscribe({
        next: () => {
          if (args.equalityOperator)
            this.state = args.equalityOperator(args.value, this.#value) ? AbstractControlState.pristine : AbstractControlState.dirty;
          else
            this.state = args.value === this.#value ? AbstractControlState.pristine : AbstractControlState.dirty;
        }
      }),

      this.$errors.subscribe({ next: () => this.valid = this.#errors_distinct.length === 0 })
    );
  }

  protected readonly _default!: T;
  protected readonly _subs: Subscription[] = [];
  protected readonly _onDispose: (() => void)[] = [];
  protected readonly _validators = new Map<ValidatorFn<this>, { errors: string[]; sub: Subscription; }>();
  protected readonly _streams = new Map<ControlStreamCtor, Observable<any>>();
  protected readonly _$loadingQueue = new BehaviorSubject(new Set<string>());

  readonly __mixins__ = new Set<Function>();
  readonly $stream = new Subject<IControlStreamEvent>();

  getStream<TStream>({ key, fn }: { key: ControlStreamCtor<any>; fn: () => TStream; }): Observable<TStream> {
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

  #name: string = '';
  get name() {
    return this.#name;
  }

  set name(value: string) {
    if (this.#name === value)
      return;

    this.#name = value;
    this.$stream.next(new NameChange(value));
  }

  #value!: T;
  get value() {
    return this.#value;
  }

  set value(value: T) {
    if (value === this.#value)
      return;

    this.#value = value;
    this.$stream.next(new ValueChange(value));
  }

  #valid = true;
  get valid() {
    return this.#valid;
  }

  set valid(value: boolean) {
    if (value === this.#valid)
      return;

    this.#valid = value;
    this.$stream.next(new ValidChange(value));
  }

  #state = AbstractControlState.pristine;
  get dirty() {
    return this.#state === AbstractControlState.dirty;
  }

  get pristine() {
    return this.#state === AbstractControlState.pristine;
  }

  get state(): AbstractControlState {
    return this.#state;
  }

  set state(value: AbstractControlState) {
    if (this.#state === value)
      return;

    this.#state = value;
    this.$stream.next(new StateChange(value));
  }

  #errors_distinct: string[] = [];
  #error_refs = new Map<ValidatorFn, string[]>();
  get errors() {
    return this.#errors_distinct;
  }

  #loading = this._$loadingQueue.pipe(map(queue => queue.size > 0), shareReplay());
  get $loading(): Observable<boolean> {
    return this.#loading;
  }

  get $name() {
    return this.getStream({ key: NameChange, fn: () => this.name });
  }

  get $value() {
    return this.getStream({ key: ValueChange, fn: () => this.value });
  }

  get $errors() {
    return this.getStream({ key: ErrorsChange, fn: () => this.#error_refs })
  }

  get $valid() {
    return this.getStream({ key: ValidChange, fn: () => this.valid });
  }

  get $state() {
    return this.getStream({ key: StateChange, fn: () => this.state });
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
    const id = (crypto as any).randomUUID();

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

  onDispose(subscription: Subscription): void
  onDispose(add: () => void): void
  onDispose(arg: (() => void) | Subscription): void {
    this._onDispose.push(typeof arg === 'function' ? arg : () => arg.unsubscribe());
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
      this.value = (Object.assign({}, this._default));
    else
      this.value = this._default;

    this.state = AbstractControlState.pristine;
  }


}