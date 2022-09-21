import { BehaviorSubject, map, shareReplay, switchMap, firstValueFrom } from 'rxjs';
export let FORM_CONTROL_CONFIG = {
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
};
export function SetConfig(config) {
    FORM_CONTROL_CONFIG = { ...FORM_CONTROL_CONFIG, ...config };
}
export function toggleClass(state, className, ele) {
    if (state)
        ele.classList.add(className);
    else
        ele.classList.remove(className);
}
export class FormControl {
    _errorsEle;
    _validators = new Map();
    _validatorRefs = {};
    _$errors = new BehaviorSubject(new Map());
    _$loadingQueue = new BehaviorSubject(new Set());
    _config = {};
    _subs = [];
    _onDispose = [
        () => this._subs.forEach(s => s.unsubscribe()),
        () => this._validators.forEach(v => v.sub.unsubscribe())
    ];
    name;
    ele;
    get value() {
        return this.$value.value;
    }
    set value(value) {
        if (value === this.value)
            return;
        this.$value.next(value);
    }
    set touched(value) {
        if (value === this.touched)
            return;
        if (this._config.onTouchedChange)
            this._config.onTouchedChange(value, this);
        this.$touched.next(value);
    }
    get touched() {
        return this.$touched.value;
    }
    get visited() {
        return this.$visited.value;
    }
    set visited(value) {
        if (value === this.visited)
            return;
        if (this._config.onVisitedChange)
            this._config.onVisitedChange(value, this);
        this.$visited.next(value);
    }
    get focused() {
        return this.$focused.value;
    }
    set focused(value) {
        if (value === this.focused)
            return;
        if (this._config.onFocusedChange)
            this._config.onFocusedChange(value, this);
        this.$focused.next(value);
    }
    get required() {
        return this.$required.value;
    }
    set required(value) {
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
        if (this._config.onRequiredChange)
            this._config.onRequiredChange(value, this);
        this.$required.next(value);
    }
    get valid() {
        return this.$valid.value;
    }
    set valid(value) {
        if (value === this.valid)
            return;
        if (this._config.onValidChange)
            this._config.onValidChange(value, this);
        this.$valid.next(value);
    }
    get disabled() {
        return this.$disabled.value;
    }
    set disabled(value) {
        if (value === this.disabled)
            return;
        this.ele.disabled = value;
        if (this._config.onDisabledChange)
            this._config.onDisabledChange(value, this);
        this.$disabled.next(value);
    }
    $value;
    $touched;
    $focused;
    $visited;
    $errors;
    $required;
    $valid;
    $disabled;
    $loading;
    constructor({ name, value, selector, config, error_container, validators }) {
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
        this.$loading = this._$loadingQueue.pipe(map(set => set.size > 0), shareReplay());
        this.$errors = this._$errors.pipe(map(errors => {
            let output = new Array();
            const set = new Set();
            for (const arr of errors.values()) {
                for (const err of arr) {
                    if (!set.has(err)) {
                        output.push(err);
                        set.add(err);
                    }
                }
            }
            return output;
        }), shareReplay());
        const control = document.querySelector(selector);
        if (control instanceof HTMLInputElement || control instanceof HTMLSelectElement || control instanceof HTMLTextAreaElement)
            this.ele = control;
        else
            throw new Error(`Cannot bind to element with given query selector: ${selector}`);
        this.valid = true;
        this._errorsEle = error_container instanceof HTMLElement ? error_container : typeof error_container === 'string' ? document.querySelector(error_container) || undefined : undefined;
        this.ele.value = this.value;
        control.addEventListener('focus', () => {
            this.focused = true;
            this.touched = true;
        });
        control.addEventListener('blur', () => {
            this.focused = false;
            this.visited = true;
        });
        control.addEventListener('input', (ev) => {
            this.value = ev.target.value;
        });
        this._subs.push(this.$errors.subscribe({
            next: (errors) => {
                console.log(errors);
                this.valid = errors.length === 0;
            }
        }));
        if (this._config.onLoadingChange)
            this._subs.push(this.$loading.subscribe({
                next: (isLoading) => {
                    this._config.onLoadingChange(isLoading, this);
                }
            }));
        if (validators?.length)
            this.addValidator(validators);
        if (this._config.onInit)
            this._config.onInit(this);
    }
    addValidator(arg) {
        let validators = Array.isArray(arg) ? arg : [arg];
        for (const validator of validators) {
            if (this._validators.has(validator))
                continue;
            let placeholder_displayed = true;
            let ele;
            let placeholder;
            if (this._errorsEle) {
                ele = document.createElement('span');
                placeholder = document.createComment(' form-error-binding ');
                this._errorsEle.appendChild(placeholder);
            }
            this._validators.set(validator, {
                errors: [],
                ele,
                placeholder,
                sub: validator(this).pipe(map(errors => Object.values(errors || {}))).subscribe({
                    next: (errors) => {
                        let dirty = false;
                        let current = new Set(this._$errors.value.get(validator) || []);
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
                                if (ele.innerHTML !== str)
                                    ele.innerHTML = str;
                                if (placeholder_displayed) {
                                    placeholder.replaceWith(ele);
                                    placeholder_displayed = false;
                                }
                            }
                        }
                        else {
                            if (this._errorsEle && !placeholder_displayed) {
                                ele.replaceWith(placeholder);
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
    removeValidator(validator) {
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
    onDispose(add) {
        this._onDispose.push(add);
    }
    dispose() {
        for (const fn of this._onDispose)
            try {
                fn(this);
            }
            catch (err) {
                console.error(err);
            }
    }
}
export class InputControl extends FormControl {
    get readonly() {
        return this.$readonly.value;
    }
    set readonly(value) {
        if (value === this.readonly)
            return;
        this.ele.readOnly = value;
        if (this._config.onReadonlyChange)
            this._config.onReadonlyChange(value, this);
        this.$readonly.next(value);
    }
    $readonly;
    constructor(args) {
        super(args);
        this.$readonly = new BehaviorSubject(false);
    }
}
export class SelectControl extends FormControl {
}
export class Validators {
    static create(fn, args) {
        if (args?.signal)
            return (control) => args.signal.pipe(switchMap(() => firstValueFrom(fn(control))));
        else
            return fn;
    }
    static required(args = {}) {
        return this.create((control) => control.$value.pipe(map((value) => {
            if (!value)
                return {
                    required: `${control.name} is required`
                };
            else
                return undefined;
        })), args);
    }
    static numeric(args = {}) {
        return this.create((control) => control.$value.pipe(map((value) => {
            if (!!value && isNaN(Number(value)))
                return {
                    required: `${control.name} must be numeric`
                };
            else
                return undefined;
        })), args);
    }
    static max(number, args = {}) {
        return this.create((control) => control.$value.pipe(map((value) => {
            if (!!value && Number(value) > number)
                return {
                    max: `${control.name} cannot exceed ${number}`
                };
            else
                return undefined;
        })), args);
    }
}
//# sourceMappingURL=index.js.map