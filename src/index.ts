import { BehaviorSubject, map, Observable, shareReplay, Subscription, switchMap, firstValueFrom, Subject, filter, fromEvent } from 'rxjs';

function flattenToDistinctStr(arr: IterableIterator<string[]>) {
  const output: string[] = [];

  for (const errors of arr)
    for (const err of errors)
      if (!output.includes(err))
        output.push(err);

  return output;
}

type MapType<T, U> = { [Property in keyof T]: U };

type EventFn<T, U extends IAbstractControl> = (args: { value: T; control: U }) => void;

interface AbstractEventConfig<T extends IAbstractControl> {
  onTouchedChange: EventFn<boolean, T>;
  onVisitedChange: EventFn<boolean, T>;
  onFocusedChange: EventFn<boolean, T>;
  onValidChange: EventFn<boolean, T>;
  onDisabledChange: EventFn<boolean, T>;
  onLoadingChange: EventFn<boolean, T>;
  onReadonlyChange: EventFn<boolean, T>;
  onDirtyChange: EventFn<boolean, T>;
  onPristineChange: EventFn<boolean, T>;
  onInit: (control: T) => void;
}

// interface ControlEventConfig<T extends FormControl = any> extends AbstractEventConfig<T> {
//   onRequiredChange: EventFn<boolean, T>
// }

// interface FormEventConfig<T extends FormControls> extends AbstractEventConfig<IForm<T>> { }

// export let FORM_CONTROL_CONFIG: ControlEventConfig = {
//   onTouchedChange: ({ value, control }) => toggleClass(value, 'touched', control.ele),
//   onDisabledChange: ({ value, control }) => toggleClass(value, 'disabled', control.ele),
//   onFocusedChange: ({ value, control }) => toggleClass(value, 'focused', control.ele),
//   onRequiredChange: ({ value, control }) => toggleClass(value, 'required', control.ele),
//   onValidChange: ({ value, control }) => {
//     toggleClass(value, 'valid', control.ele);
//     toggleClass(!value, 'invalid', control.ele);
//   },
//   onVisitedChange: ({ value, control }) => toggleClass(value, 'visited', control.ele),
//   onLoadingChange: ({ value, control }) => toggleClass(value, 'loading', control.ele),
//   onReadonlyChange: ({ value, control }) => toggleClass(value, 'readonly', control.ele),
//   onDirtyChange: ({ value, control }) => toggleClass(value, 'dirty', control.ele),
//   onPristineChange: ({ value, control }) => toggleClass(value, 'pristine', control.ele),
//   onInit: (control) => { }
// }

// export let FORM_CONFIG: FormEventConfig = {
//   onTouchedChange: (value, form) => toggleClass(value, 'touched', form.ele)
// }

// export function SetConfig(config: Partial<ControlEventConfig>) {
//   FORM_CONTROL_CONFIG = { ...FORM_CONTROL_CONFIG, ...config };
// }

export function toggleClass(state: boolean, className: string, ele: HTMLElement) {
  if (state)
    ele.classList.add(className);
  else
    ele.classList.remove(className);
}

export type ValidationError = { [index: string]: string };

export type ValidatorFn<T = any> = (control: IAbstractControl<T>) => Observable<ValidationError | undefined>;

export interface AbstractControlConfig<T> {
  name: string;
  value: T;
  default_fn?: () => T;
  validators?: ValidatorFn<T>[];
}

export interface FormControlConfig<T> extends AbstractControlConfig<T> { }

// export type FormControls = { [index: string]: IFormControl }
// export type FormValue<T extends FormControls> = { [K in keyof T]: T[K]['value'] }

// export interface IFormConfig<T extends FormControls> extends AbstractControlConfig<FormValue<T>, IForm<T>> {
//   controls: T;
//   config: Partial<FormEventConfig<T>>;
// }

export enum AbstractControlState {
  pristine,
  dirty
}

interface Loader {
  id: string;
  remove(): Promise<void>;
}

interface IControlStreamEvent<T = any> {
  value: T;
}

export abstract class ControlStreamEvent<T = any> implements IControlStreamEvent<T>{
  constructor(
    public value: T
  ) { }
}

type ControlStreamCtor<T = any> = new (...args: any[]) => ControlStreamEvent<T>;

export class NameChange extends ControlStreamEvent<string> { }
export class ValueChange<T> extends ControlStreamEvent<T> { }
export class TouchedChange extends ControlStreamEvent<boolean>{ }
export class VisitedChange extends ControlStreamEvent<boolean>{ }
export class FocusedChange extends ControlStreamEvent<boolean> { }
export class ValidChange extends ControlStreamEvent<boolean> { }
export class DirtyChange extends ControlStreamEvent<boolean> { }
export class PristineChange extends ControlStreamEvent<boolean> { }
export class StateChange extends ControlStreamEvent<AbstractControlState> { }
export class ErrorsChange extends ControlStreamEvent<Map<ValidatorFn, string[]>> { }
export class RequiredChange extends ControlStreamEvent<boolean> { }
export class DisabledChange extends ControlStreamEvent<boolean> { }
export class ReadonlyChange extends ControlStreamEvent<boolean> { }

export interface IAbstractControl<T = any> {

  get name(): string;
  set name(value: string);

  get value(): T;
  set value(value: T);

  get touched(): boolean;
  set touched(value: boolean);

  get visited(): boolean;
  set visited(value: boolean);

  get focused(): boolean;
  set focused(value: boolean);

  get valid(): boolean;
  set valid(value: boolean);

  get dirty(): boolean;
  set dirty(value: boolean);

  get pristine(): boolean;
  set pristine(value: boolean);

  get errors(): string[];

  get $valid(): Observable<boolean>;
  get $touched(): Observable<boolean>;
  get $name(): Observable<string | undefined>;
  get $value(): Observable<T>;
  get $pristine(): Observable<boolean>;
  get $dirty(): Observable<boolean>;
  get $focused(): Observable<boolean>;
  get $visited(): Observable<boolean>;
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

  protected readonly _config: Partial<AbstractEventConfig<this>> = {};
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

  #touched: boolean = false;
  public get touched() {
    return this.#touched;
  }

  public set touched(value: boolean) {
    if (value === this.touched)
      return;

    this.#touched = value;
    this._broadcast(new TouchedChange(value))
  }

  #visited: boolean = false;
  public get visited() {
    return this.#visited;
  }

  public set visited(value: boolean) {
    if (value === this.visited)
      return;

    this.#visited = value;
    this._broadcast(new VisitedChange(value));
  }

  #focused: boolean = false;
  public get focused() {
    return this.#focused;
  }

  public set focused(value: boolean) {
    if (value === this.focused)
      return;

    this.#focused = value;
    this._broadcast(new FocusedChange(value));
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

  get $touched() {
    return this._getStream({ key: TouchedChange, fn: () => this.touched });
  }

  get $focused() {
    return this._getStream({ key: FocusedChange, fn: () => this.focused });
  }

  get $visited() {
    return this._getStream({ key: VisitedChange, fn: () => this.visited });
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
    this.touched = false;
    this.visited = false;
  }
}

export interface IFormControl<T = any> extends IAbstractControl<T> {

  get required(): boolean;
  set required(value: boolean);

  get disabled(): boolean;
  set disabled(value: boolean);

  get $required(): Observable<boolean>;
  get $disabled(): Observable<boolean>;

}

export class FormControl<T = any> extends AbstractControl<T> implements IFormControl<T> {


  #required = false;
  public get required() {
    return this.#required
  }

  public set required(value: boolean) {
    if (value === this.required)
      return;

    if (value) {
      this._validatorRefs.required = Validators.required();
      this.addValidator(this._validatorRefs.required);
    }
    else {
      this.removeValidator(this._validatorRefs.required);
      delete this._validatorRefs.required;
    }

    this.#required = value;
    this._broadcast(new RequiredChange(value));
  }

  #disabled = false;
  public get disabled() {
    return this.#disabled;
  }

  public set disabled(value: boolean) {
    if (value === this.disabled)
      return;

    this.#disabled = value;
    this._broadcast(new DisabledChange(value));
  }

  get $required() {
    return this._getStream({ key: RequiredChange, fn: () => this.required });
  }

  get $disabled() {
    return this._getStream({ key: DisabledChange, fn: () => this.disabled });
  }


  constructor({ name, value, validators, default_fn }: FormControlConfig<T>) {
    super({ name, value, default_fn, validators });
  }

}

export interface IBoundControlConfig<T> extends AbstractControlConfig<T> {
  selector: string;
}

export interface IBoundControl<TElement extends HTMLElement = HTMLElement> {
  readonly ele: TElement;
}

export abstract class BoundControl<T, TElement extends HTMLElement = HTMLElement> extends AbstractControl<T> implements IBoundControl<TElement> {
  readonly ele: TElement;

  constructor(args: IBoundControlConfig<T>) {
    super(args);

    const ele = document.querySelector(args.selector) as TElement | null;

    if (!ele)
      throw new Error(`No element found using query selector: ${args.selector}`);

    this.ele = ele;
  }
}


export interface IInputControlConfig<T> extends IBoundControlConfig<T> { }
export interface IInputControl<T> extends IAbstractControl<T>, IBoundControl<HTMLInputElement> {
  get readonly(): boolean;
  get $readonly(): Observable<boolean>;
}
export class InputControl<T> extends BoundControl<T, HTMLInputElement> {

  #readonly = false;
  public get readonly() {
    return this.#readonly;
  }

  public set readonly(value: boolean) {
    if (value === this.readonly)
      return;

    this.ele.readOnly = value;
    this._broadcast(new ReadonlyChange(value));
  }

  get $readonly() {
    return this._getStream({ key: ReadonlyChange, fn: () => this.readonly });
  }

  constructor(args: IInputControlConfig<T>) {
    super(args);

    this._subs.push(
      fromEvent(this.ele, 'input')
        .subscribe({
          next: (ev) => {
            this.value = (ev.target as HTMLInputElement).value as unknown as T;
            this.state = AbstractControlState.dirty;
          }
        })
    );
  }

}

export interface ISelectControlConfig<T> extends IBoundControlConfig<T> { }
export interface ISelectControl<T> extends IAbstractControl<T>, IBoundControl<HTMLSelectElement> { }
export class SelectControl<T> extends BoundControl<T, HTMLSelectElement> {
  constructor(args: ISelectControlConfig<T>) {
    super(args);
  }
}

// export interface IForm<T extends FormControls = any> extends IAbstractControl<FormValue<T>, HTMLFormElement> {
//   controls: T;

//   $dirty: Observable<boolean>;
//   $pristine: Observable<boolean>;

//   reset(): void;
// }

// export class Form<T extends FormControls = any> extends AbstractControl<FormValue<T>, HTMLFormElement> {

//   controls: T;

//   $dirty: Observable<boolean>;
//   $pristine: Observable<boolean>;

//   constructor({ controls, name, selector, config, default_fn }: IFormConfig<T>) {
//     const value = {} as FormValue<T>;
//     const obs_dirty: Observable<boolean>[] = [];
//     const obs_pristine: Observable<boolean>[] = [];
//     const obs_value: Observable<[keyof T, any]>[] = [];

//     for (const key in controls) {
//       const control = controls[key];
//       value[key] = control.value;
//       obs_dirty.push(control.$dirty);
//       obs_pristine.push(control.$pristine);
//       obs_value.push(control.$value.pipe(map(value => [key, value])));
//     }

//     super({ name, selector, default_fn, value });
//     this.controls = controls;

//     this.$dirty = combineLatest(obs_dirty).pipe(
//       map(values => values.every(val => !!val)),
//       shareReplay()
//     );

//     this.$pristine = combineLatest(obs_pristine).pipe(
//       map(values => values.every(val => !!val)),
//       shareReplay()
//     );

//     this.$value = combineLatest(obs_value).pipe(
//       map(keyValues => Object.fromEntries(keyValues) as any),
//       shareReplay()
//     );

//   }

//   reset() {
//     super.reset();
//     Object.values(this.controls).forEach(control => control.reset());
//   }

// }

export interface IValidatorArgs {
  signal?: Observable<any>;
}

export class Validators {

  static create(fn: ValidatorFn, args?: IValidatorArgs): ValidatorFn {
    if (args?.signal)
      return (control) => args.signal!.pipe(switchMap(() => firstValueFrom(fn(control))));
    else
      return fn;
  }

  static required(args: IValidatorArgs = {}): ValidatorFn<any> {
    return this.create((control) => control.$value.pipe(
      map((value) => {

        if (!value)
          return {
            required: `${control.name} is required`
          } as ValidationError;
        else
          return undefined;

      })), args);
  }

  static numeric(args: IValidatorArgs = {}): ValidatorFn<any> {
    return this.create((control) => control.$value.pipe(
      map((value) => {

        if (!!value && isNaN(Number(value)))
          return {
            required: `${control.name} must be numeric`
          } as ValidationError;
        else
          return undefined;

      })), args);
  }

  static max(number: number, args: IValidatorArgs = {}): ValidatorFn<number> {
    return this.create((control) =>
      control.$value.pipe(
        map((value) => {
          if (!!value && Number(value) > number)
            return {
              max: `${control.name} cannot exceed ${number}`
            } as ValidationError
          else
            return undefined;
        })
      ), args);
  }
}