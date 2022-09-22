import { Observable } from "rxjs";
import { Validators } from "../internal/validators";
import { IAbstractControl, AbstractControl, AbstractControlConfig } from "../internal/controls/abstract-control";
import { RequiredChange, DisabledChange } from "../internal/events";

export interface IFormControl  {

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