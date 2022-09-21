import { Observable, Subscription, Subject, BehaviorSubject, filter, map, shareReplay } from "rxjs";
import { ControlStreamCtor, ControlStreamEvent, DirtyChange, ErrorsChange, IControlStreamEvent, NameChange, PristineChange, StateChange, ValidChange, ValueChange } from "../events";
import { Loader } from "../loader";
import { flattenToDistinctStr } from "../utils";
import { ValidatorFn } from "../validators";

export enum AbstractControlState {
  pristine,
  dirty
}

export interface AbstractControlConfig<T> {
  name: string;
  value: T;
  default_fn?: () => T;
  validators?: ValidatorFn<T>[];
}

export interface IAbstractControl<T = any> {

  get name(): string;
  set name(value: string);

  get value(): T;
  set value(value: T);

  get valid(): boolean;
  set valid(value: boolean);

  get dirty(): boolean;
  set dirty(value: boolean);

  get pristine(): boolean;
  set pristine(value: boolean);

  get errors(): string[];
  get $valid(): Observable<boolean>;
  get $name(): Observable<string | undefined>;
  get $value(): Observable<T>;
  get $pristine(): Observable<boolean>;
  get $dirty(): Observable<boolean>;
  get $errors(): Observable<Map<ValidatorFn, string[]>>;

  addLoader(): Promise<Loader>;
  onDispose(add: (obj: this) => void): void;
  dispose(): void;
  reset(): void;

  addValidator(validators: ValidatorFn<T>[]): this;
  addValidator(validator: ValidatorFn<T>): this;
  addValidator(arg: ValidatorFn<T> | ValidatorFn<T>[]): this;

  removeValidator(validator: ValidatorFn<T>): this;
}

export abstract class AbstractControl<T = any> implements IAbstractControl<T> {

  protected readonly _default: () => T;
  protected readonly _subs: Subscription[] = [];
  protected readonly _onDispose: ((control: this) => void)[] = [
    () => this._subs.forEach(s => s.unsubscribe()),
    () => this._validators.forEach(obj => obj.sub.unsubscribe()),
    () => Object.keys(this._validatorRefs).forEach(key => delete this._validatorRefs[key])
  ];

  protected readonly _validators = new Map<ValidatorFn<T>, { errors: string[]; sub: Subscription; }>();
  protected readonly _validatorRefs: { [index: string]: ValidatorFn<any> } = {};

  protected readonly _streams = new Map<ControlStreamCtor, Observable<any>>();
  protected readonly _$stream = new Subject<IControlStreamEvent>();
  protected readonly _$loadingQueue = new BehaviorSubject(new Set<string>());

  protected _getStream<T>({ key, fn }: { key: ControlStreamCtor<T>; fn: () => T }): Observable<T> {
    let stream = this._streams.get(key as any) as Observable<any>;

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

  protected _broadcast(event: ControlStreamEvent) {
    this._$stream.next(event);
  }

  #name: string = '';
  public get name() {
    return this.#name;
  }

  public set name(value: string) {
    if (this.#name === value)
      return;

    this.#name = value;
    this._broadcast(new NameChange(value));
  }

  #value: T;
  public get value() {
    return this.#value;
  }

  public set value(value: T) {
    if (value === this.#value)
      return;

    this.#value = value;
    this._broadcast(new ValueChange(value));
  }

  #valid = true;
  public get valid() {
    return this.#valid;
  }

  public set valid(value: boolean) {
    if (value === this.valid)
      return;

    this.#valid = value;
    this._broadcast(new ValidChange(value));
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
    this._broadcast(new StateChange(value));
  }

  #errors_distinct: string[] = [];
  #error_refs = new Map<ValidatorFn, string[]>();
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

  get $dirty() {
    return this._getStream({ key: DirtyChange, fn: () => this.dirty });
  }

  get $pristine() {
    return this._getStream({ key: PristineChange, fn: () => this.pristine });
  }

  constructor({ name, value, default_fn, validators }: AbstractControlConfig<T>) {

    this.name = name;
    this.#value = value;
    this.$loading = this._$loadingQueue.pipe(
      map(queue => queue.size > 0),
      shareReplay()
    );

    if (default_fn)
      this._default = default_fn;
    else
      this._default = () => value;

    if (validators)
      this.addValidator(validators);

    this._subs.push(
      this.$errors.subscribe({
        next: (errors) => {
          console.log(errors);
          this.valid = errors.size === 0;
        }
      })
    );
  }

  async addLoader(): Promise<Loader> {
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

  addValidator(validators: ValidatorFn<T>[]): this
  addValidator(validator: ValidatorFn<T>): this
  addValidator(arg: ValidatorFn<T> | ValidatorFn<T>[]): this {

    let validators = Array.isArray(arg) ? arg : [arg];

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
            }

          }
        })
      });
    }

    return this;
  }

  removeValidator(validator: ValidatorFn<T>): this {
    if (!validator)
      return this;

    const match = this._validators.get(validator);

    if (!match)
      return this;

    match.sub.unsubscribe();

    let all = this.#error_refs;

    if (all.has(validator)) {
      all = new Map(all);
      all.delete(validator);

      this.#error_refs = all;
      this.#errors_distinct = flattenToDistinctStr(all.values());

      this._broadcast(new ErrorsChange(all));
    }

    return this;
  }

  onDispose(add: (control: this) => void) {
    this._onDispose.push(add);
  }

  dispose() {
    for (const fn of this._onDispose)
      try {
        fn(this);
      } catch (err) {
        console.error(err);
      }
  }

  reset() {
    if (this._default)
      this.value = this._default();

    this.state = AbstractControlState.pristine;
  }
}