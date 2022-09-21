import { BehaviorSubject, Observable, Subscription } from 'rxjs';
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
export declare let FORM_CONTROL_CONFIG: ControlEventConfig;
export declare function SetConfig(config: Partial<ControlEventConfig>): void;
export declare function toggleClass(state: boolean, className: string, ele: HTMLElement): void;
export declare type ValidationError = {
    [index: string]: string;
};
export declare type ValidatorFn<T = any> = (control: FormControl<T>) => Observable<ValidationError | undefined>;
export interface FormControlConfig<T> {
    name: string;
    selector: string;
    value: T;
    validators?: ValidatorFn<T>[];
    config?: Partial<ControlEventConfig>;
    error_container?: string | HTMLElement;
}
export declare abstract class FormControl<T> {
    protected _errorsEle?: HTMLElement;
    protected readonly _validators: Map<ValidatorFn<T>, {
        errors: string[];
        sub: Subscription;
        ele?: HTMLSpanElement | undefined;
        placeholder?: Comment | undefined;
    }>;
    protected readonly _validatorRefs: {
        [index: string]: ValidatorFn<any>;
    };
    protected readonly _$errors: BehaviorSubject<Map<ValidatorFn<any>, string[]>>;
    protected readonly _$loadingQueue: BehaviorSubject<Set<string>>;
    protected readonly _config: Partial<ControlEventConfig>;
    protected readonly _subs: Subscription[];
    protected readonly _onDispose: ((control: FormControl<T>) => void)[];
    readonly name: string;
    readonly ele: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
    get value(): T;
    set value(value: T);
    set touched(value: boolean);
    get touched(): boolean;
    get visited(): boolean;
    set visited(value: boolean);
    get focused(): boolean;
    set focused(value: boolean);
    get required(): boolean;
    set required(value: boolean);
    get valid(): boolean;
    set valid(value: boolean);
    get disabled(): boolean;
    set disabled(value: boolean);
    $value: Observable<T>;
    $touched: Observable<boolean>;
    $focused: Observable<boolean>;
    $visited: Observable<boolean>;
    $errors: Observable<string[]>;
    $required: Observable<boolean>;
    $valid: Observable<boolean>;
    $disabled: Observable<boolean>;
    $loading: Observable<boolean>;
    constructor({ name, value, selector, config, error_container, validators }: FormControlConfig<T>);
    addValidator(validators: ValidatorFn<T>[]): this;
    addValidator(validator: ValidatorFn<T>): this;
    removeValidator(validator: ValidatorFn<T>): this;
    addLoader(): Promise<{
        id: string;
        remove: () => Promise<void>;
    }>;
    onDispose(add: (control: FormControl<T>) => void): void;
    dispose(): void;
}
export declare class InputControl<T> extends FormControl<T> {
    readonly ele: HTMLInputElement;
    get readonly(): boolean;
    set readonly(value: boolean);
    $readonly: Observable<boolean>;
    constructor(args: FormControlConfig<T>);
}
export declare class SelectControl<T> extends FormControl<T> {
    ele: HTMLSelectElement;
}
export interface IValidatorArgs {
    signal?: Observable<any>;
}
export declare class Validators {
    static create(fn: ValidatorFn, args?: IValidatorArgs): ValidatorFn;
    static required(args?: IValidatorArgs): ValidatorFn<any>;
    static numeric(args?: IValidatorArgs): ValidatorFn<any>;
    static max(number: number, args?: IValidatorArgs): ValidatorFn<number>;
}
export {};
