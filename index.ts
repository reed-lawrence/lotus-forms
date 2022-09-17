import { BehaviorSubject, map, Observable, shareReplay, Subscription, switchMap, firstValueFrom } from 'rxjs';

interface ControlEventConfig {
  onTouchedChange: (value: boolean, control: FormControl<any>) => void;
  onVisitedChange: (value: boolean, control: FormControl<any>) => void;
  onFocusedChange: (value: boolean, control: FormControl<any>) => void;
  onRequiredChange: (value: boolean, control: FormControl<any>) => void;
  onValidChange: (value: boolean, control: FormControl<any>) => void;
  onDisabledChange: (value: boolean, control: FormControl<any>) => void;
  onLoadingChange: (value: boolean, control: FormControl<any>) => void;
  onReadonlyChange: (value: boolean, control: FormControl<any>) => void;
  onInit: (control: FormControl<any>) => void;
}

export let FORM_CONTROL_CONFIG: ControlEventConfig = {
  onTouchedChange: (value, control) => toggleClass(value, 'touched', control.ele),
  onDisabledChange: (value, control) => toggleClass(value, 'disabled', control.ele),
  onFocusedChange: (value, control) => toggleClass(value, 'focused', control.ele),
  onRequiredChange: (value, control) => toggleClass(value, 'required', control.ele),
  onValidChange: (value, control) => {
    toggleClass(value, 'valid', control.ele);
    toggleClass(!value, 'invalid', control.ele);
  },
  onVisitedChange: (value, control) => toggleClass(value, 'visited', control.ele),
  onLoadingChange: (value, control) => toggleClass(value, 'loading', control.ele),
  onReadonlyChange: (value, control) => toggleClass(value, 'readonly', control.ele),
  onInit: (control) => { }
}

export function SetConfig(config: Partial<ControlEventConfig>) {
  FORM_CONTROL_CONFIG = { ...FORM_CONTROL_CONFIG, ...config };
}

export function toggleClass(state: boolean, className: string, ele: HTMLElement) {
  if (state)
    ele.classList.add(className);
  else
    ele.classList.remove(className);
}

export type ValidationError = { [index: string]: string };

export type ValidatorFn<T = any> = (control: FormControl<T>) => Observable<ValidationError | undefined>;

export interface FormControlConfig<T> {
  name: string;
  selector: string;
  value: T;
  validators?: ValidatorFn<T>[];
  config?: Partial<ControlEventConfig>;
  error_container?: string | HTMLElement;
}

export abstract class FormControl<T> {

  protected _errorsEle?: HTMLElement;
  protected readonly _validators = new Map<ValidatorFn<T>, { errors: string[]; sub: Subscription; ele?: HTMLSpanElement; placeholder?: Comment; }>();
  protected readonly _validatorRefs: { [index: string]: ValidatorFn<any> } = {};
  protected readonly _$errors = new BehaviorSubject(new Map<ValidatorFn, string[]>());
  protected readonly _$loadingQueue = new BehaviorSubject(new Set<string>());
  protected readonly _config: Partial<ControlEventConfig> = {};
  protected readonly _subs: Subscription[] = [];
  protected readonly _onDispose: ((control: FormControl<T>) => void)[] = [
    () => this._subs.forEach(s => s.unsubscribe()),
    () => this._validators.forEach(v => v.sub.unsubscribe())
  ];

  public readonly name: string;
  public readonly ele: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

  public get value() {
    return (this.$value as BehaviorSubject<T>).value;
  }

  public set value(value: T) {
    if (value === this.value)
      return;

    (this.$value as BehaviorSubject<T>).next(value);
  }

  public set touched(value: boolean) {
    if (value === this.touched)
      return;

    if (this._config.onTouchedChange) this._config.onTouchedChange(value, this);
    (this.$touched as BehaviorSubject<boolean>).next(value);
  }

  public get touched() {
    return (this.$touched as BehaviorSubject<boolean>).value;
  }

  public get visited() {
    return (this.$visited as BehaviorSubject<boolean>).value;
  }

  public set visited(value: boolean) {
    if (value === this.visited)
      return;

    if (this._config.onVisitedChange) this._config.onVisitedChange(value, this);
    (this.$visited as BehaviorSubject<boolean>).next(value);
  }

  public get focused() {
    return (this.$focused as BehaviorSubject<boolean>).value;
  }

  public set focused(value: boolean) {
    if (value === this.focused)
      return;

    if (this._config.onFocusedChange) this._config.onFocusedChange(value, this);
    (this.$focused as BehaviorSubject<boolean>).next(value);
  }

  public get required() {
    return (this.$required as BehaviorSubject<boolean>).value;
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

    if (this._config.onRequiredChange) this._config.onRequiredChange(value, this);
    (this.$required as BehaviorSubject<boolean>).next(value);
  }

  public get valid() {
    return (this.$valid as BehaviorSubject<boolean>).value;
  }

  public set valid(value: boolean) {
    if (value === this.valid)
      return;

    if (this._config.onValidChange) this._config.onValidChange(value, this);
    (this.$valid as BehaviorSubject<boolean>).next(value);
  }

  public get disabled() {
    return (this.$disabled as BehaviorSubject<boolean>).value;
  }

  public set disabled(value: boolean) {
    if (value === this.disabled)
      return;

    this.ele.disabled = value;
    if (this._config.onDisabledChange) this._config.onDisabledChange(value, this);
    (this.$disabled as BehaviorSubject<boolean>).next(value);
  }

  $value: Observable<T>;
  $touched: Observable<boolean>;
  $focused: Observable<boolean>;
  $visited: Observable<boolean>;
  $errors: Observable<string[]>;
  $required: Observable<boolean>;
  $valid: Observable<boolean>;
  $disabled: Observable<boolean>;
  $loading: Observable<boolean>;

  constructor({ name, value, selector, config, error_container, validators }: FormControlConfig<T>) {
    this.name = name;

    this.$value = new BehaviorSubject(value);
    this.$touched = new BehaviorSubject(false);
    this.$focused = new BehaviorSubject(false);
    this.$visited = new BehaviorSubject(false);
    this.$required = new BehaviorSubject(false);
    this.$valid = new BehaviorSubject(true);
    this.$disabled = new BehaviorSubject(false);

    this._config = { ...FORM_CONTROL_CONFIG };
    if (config)
      this._config = { ...this._config, ...config };

    this.$loading = this._$loadingQueue.pipe(
      map(set => set.size > 0),
      shareReplay()
    );

    this.$errors = this._$errors.pipe(
      map(errors => {

        let output = new Array<string>();
        const set = new Set<string>();

        for (const arr of errors.values()) {
          for (const err of arr) {
            if (!set.has(err)) {
              output.push(err);
              set.add(err);
            }
          }
        }

        return output;
      }),
      shareReplay()
    );

    const control = document.querySelector(selector);

    if (control instanceof HTMLInputElement || control instanceof HTMLSelectElement || control instanceof HTMLTextAreaElement)
      this.ele = control;
    else
      throw new Error(`Cannot bind to element with given query selector: ${selector}`);

    this.valid = true;

    this._errorsEle = error_container instanceof HTMLElement ? error_container : typeof error_container === 'string' ? document.querySelector(error_container) || undefined : undefined

    this.ele.value = this.value as unknown as string;

    control.addEventListener('focus', () => {
      this.focused = true;
      this.touched = true;
    });

    control.addEventListener('blur', () => {
      this.focused = false;
      this.visited = true;
    });

    control.addEventListener('input', (ev) => {
      this.value = (ev.target as HTMLInputElement).value as unknown as T;
    });

    this._subs.push(
      this.$errors.subscribe({
        next: (errors) => {
          console.log(errors);
          this.valid = errors.length === 0;
        }
      })
    );

    if (this._config.onLoadingChange)
      this._subs.push(
        this.$loading.subscribe({
          next: (isLoading) => {
            this._config.onLoadingChange!(isLoading, this);
          }
        })
      );


    if (validators?.length)
      this.addValidator(validators);

    if (this._config.onInit)
      this._config.onInit(this);

  }

  addValidator(validators: ValidatorFn<T>[]): this
  addValidator(validator: ValidatorFn<T>): this
  addValidator(arg: ValidatorFn<T> | ValidatorFn<T>[]): this {

    let validators = Array.isArray(arg) ? arg : [arg];

    for (const validator of validators) {

      if (this._validators.has(validator))
        continue;

      let placeholder_displayed = true;
      let ele: HTMLSpanElement | undefined;
      let placeholder: Comment | undefined;

      if (this._errorsEle) {
        ele = document.createElement('span');
        placeholder = document.createComment(' form-error-binding ');
        this._errorsEle.appendChild(placeholder);
      }

      this._validators.set(validator, {
        errors: [],
        ele,
        placeholder,
        sub: validator(this).pipe(
          map(errors => Object.values(errors || {}))
        ).subscribe({
          next: (errors) => {

            let dirty = false;
            let current = new Set<string>(this._$errors.value.get(validator) || []);

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

              if (!!this._errorsEle) {
                const str = errors.join('<br>');

                if (ele!.innerHTML !== str)
                  ele!.innerHTML = str;

                if (placeholder_displayed) {
                  placeholder!.replaceWith(ele!);
                  placeholder_displayed = false;
                }
              }

            } else {
              if (this._errorsEle && !placeholder_displayed) {

                ele!.replaceWith(placeholder!);
                placeholder_displayed = true;

              }
            }

            if (dirty) {
              const all = this._$errors.value;
              if (current.size)
                all.set(validator, Array.from(current.values()));
              else
                all.delete(validator);

              this._$errors.next(all);
            }

          }
        })
      });
    }

    return this;
  }

  removeValidator(validator: ValidatorFn<T>) {
    if (!validator)
      return this;

    const match = this._validators.get(validator);

    if (!match)
      return this;

    match.sub.unsubscribe();
    match.ele?.remove();
    match.placeholder?.remove();

    let all = this._$errors.value;

    if (all.has(validator)) {
      all = new Map(all);
      all.delete(validator);
      this._$errors.next(all);
    }

    return this;
  }

  async addLoader() {
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

  onDispose(add: (control: FormControl<T>) => void) {
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

}

export class InputControl<T> extends FormControl<T> {

  declare readonly ele: HTMLInputElement;

  public get readonly() {
    return (this.$readonly as BehaviorSubject<boolean>).value;
  }

  public set readonly(value: boolean) {
    if (value === this.readonly)
      return;

    this.ele.readOnly = value;
    if (this._config.onReadonlyChange) this._config.onReadonlyChange(value, this);
    (this.$readonly as BehaviorSubject<boolean>).next(value);
  }

  $readonly: Observable<boolean>;

  constructor(args: FormControlConfig<T>) {
    super(args);
    this.$readonly = new BehaviorSubject(false);
  }

}

export class SelectControl<T> extends FormControl<T> {
  declare ele: HTMLSelectElement;
}

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