import {
  BehaviorSubject,
  filter,
  map,
  Observable,
  shareReplay,
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
import { ValidatorFn } from '../internal/validators';

export enum AbstractControlState {
  pristine,
  dirty
}

export interface IAbstractControl<T = any> {

  get name(): string;
  set name(value: string);

  get value(): T;
  set value(value: T);

  get valid(): boolean;
  set valid(value: boolean);

  get dirty(): boolean;
  get pristine(): boolean;

  get state(): AbstractControlState;
  set state(value: AbstractControlState);

  get errors(): string[];
  get $valid(): Observable<boolean>;
  get $name(): Observable<string | undefined>;
  get $value(): Observable<T>;
  get $state(): Observable<AbstractControlState>;
  get $errors(): Observable<Map<ValidatorFn, string[]>>;

  addLoader(): Promise<ILoader>;
  onDispose(add: () => void): void;
  dispose(): void;
  reset(): void;

  addValidator(validators: ValidatorFn<this>[]): void;
  addValidator(validator: ValidatorFn<this>): void;
  addValidator(arg: ValidatorFn<this> | ValidatorFn<this>[]): void;

  removeValidator(validator: ValidatorFn<this>): void;
}

export class AbstractControl<T> implements IAbstractControl<T> {

  constructor(...args: any[]) { }

  protected readonly _default: T;
  protected readonly _subs: Subscription[] = [];
  protected readonly _onDispose: (() => void)[] = [];
  protected readonly _validators = new Map<ValidatorFn<this>, { errors: string[]; sub: Subscription; }>();
  protected readonly _validatorRefs: { [index: string]: ValidatorFn } = {};
  protected readonly _streams = new Map<ControlStreamCtor, Observable<any>>();
  protected readonly _$stream = new Subject<IControlStreamEvent>();
  protected readonly _$loadingQueue = new BehaviorSubject(new Set<string>());
  protected _getStream<T>({ key, fn }: { key: ControlStreamCtor, fn: () => T }) {
    let stream = this._streams.get(key);

    if (!stream) {
      stream = this._$stream.pipe(
        filter(ev => ev instanceof key),
        map(() => fn()),
        shareReplay()
      );

      this._streams.set(key, stream);
    }

    return stream;
  }

  #name: string = '';
  public get name() {
    return this.#name;
  }

  public set name(value: string) {
    if (this.#name === value)
      return;

    this.#name = value;
    this._$stream.next(new NameChange(value));
  }

  #value: T;
  public get value() {
    return this.#value;
  }

  public set value(value: T) {
    if (value === this.#value)
      return;

    this.#value = value;
    this._$stream.next(new ValueChange(value));
  }

  #valid = true;
  public get valid() {
    return this.#valid;
  }

  public set valid(value: boolean) {
    if (value === this.valid)
      return;

    this.#valid = value;
    this._$stream.next(new ValidChange(value));
  }

  #state = AbstractControlState.pristine;
  public get dirty() {
    return this.#state === AbstractControlState.dirty;
  }

  public get pristine() {
    return this.#state === AbstractControlState.pristine;
  }

  public set state(value: AbstractControlState) {
    if (this.#state === value)
      return;

    this.#state = value;
    this._$stream.next(new StateChange(value));
  }

  #errors_distinct: string[] = [];
  #error_refs = new Map<ValidatorFn<this>, string[]>();
  public get errors() {
    return this.#errors_distinct;
  }

  $loading: Observable<boolean>;

  get $name() {
    return this._getStream({ key: NameChange, fn: () => this.name });
  }

  get $value() {
    return this._getStream({ key: ValueChange, fn: () => this.value });
  }

  get $errors() {
    return this._getStream({ key: ErrorsChange, fn: () => this.#error_refs })
  }

  get $valid() {
    return this._getStream({ key: ValidChange, fn: () => this.valid });
  }

  get $state() {
    return this._getStream({ key: StateChange, fn: () => this.state });
  }

  async addLoader(): Promise<ILoader> {
    const id = crypto.randomUUID();

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
      this.value = Object.assign({}, this._default);
    else
      this.value = this._default;

    this.state = AbstractControlState.pristine;
  }

  addValidator(validators: ValidatorFn<this>[]): void;
  addValidator(validator: ValidatorFn<this>): void;
  addValidator(arg: ValidatorFn<this> | ValidatorFn<this>[]): void;
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
            let current = new Set<string>(this.#error_refs.get(validator) || []);

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
                all.set(validator, Array.from(current.values()));
              else
                all.delete(validator);

              this.#error_refs = all;
              this.#errors_distinct = flattenToDistinctStr(all.values());

              this._$stream.next(new ErrorsChange(this.#error_refs));

            }

          }
        })
      });
    }
  }

  removeValidator(validator: ValidatorFn<this>): void {
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

      this._$stream.next(new ErrorsChange(all));
    }
  }
}