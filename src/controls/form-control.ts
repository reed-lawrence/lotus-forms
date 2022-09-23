import { AbstractControl } from './abstract-control';
import { CONTROL_FACTORY } from './control-factory';
import { Observable } from 'rxjs';
import { RequiredChange } from '../internal/events';
import { Validators } from '../internal/validators';

export interface IFormControl {

  get required(): boolean;
  set required(value: boolean);

  get disabled(): boolean;
  set disabled(value: boolean);

  get $required(): Observable<boolean>;
  get $disabled(): Observable<boolean>;

}

export const [MixinFormControl, isFormControl] = CONTROL_FACTORY.register('form-control', (Parent) => {
  return class FormControlMixin<T> extends Parent<T> implements IFormControl {

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
      this._$stream.next(new RequiredChange(value));
    }

    get disabled(): boolean {
      throw new Error("Method not implemented.");
    }
    set disabled(value: boolean) {
      throw new Error("Method not implemented.");
    }
    get $required(): Observable<boolean> {
      throw new Error("Method not implemented.");
    }
    get $disabled(): Observable<boolean> {
      throw new Error("Method not implemented.");
    }

    constructor(...args: any[]) {
      super(args);
    }

  }
});

export class FormControl<T> extends MixinFormControl(AbstractControl)<T> { }
