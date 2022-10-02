import { Observable } from 'rxjs';
import { ApplyConfig } from '../../config/behavior-config';
import { ReadonlyChange } from '../../internal/events';
import { IAbstractControlArgs, AbstractControl } from '../abstract-control';
import { IBoundControlArgs, IBoundControl, MixinBoundControl } from '../bound-control';
import { IFormControl, MixinFormControl } from '../form-control';

export interface IInputControlArgs<T> extends IBoundControlArgs, IAbstractControlArgs<T> { }

export interface IInputControl {
  get readonly(): boolean;
  set readonly(value: boolean);
  get $readonly(): Observable<boolean>;
}

export abstract class InputControlAbstract<T> extends AbstractControl<T> implements IBoundControl<HTMLInputElement>, IFormControl, IInputControl {

  constructor(args: IInputControlArgs<T>) {
    super(args);
    MixinFormControl(this);
    MixinBoundControl(this, args);
    ApplyConfig(this);
  }

  #readonly = false;
  get readonly() {
    return this.#readonly;
  }
  set readonly(readonly: boolean) {
    if (readonly === this.#readonly)
      return;

    this.#readonly = Boolean(readonly);
    this.$stream.next(new ReadonlyChange(this.#readonly));
  }

  get $readonly() {
    return this.getStream({ key: ReadonlyChange, fn: () => this.#readonly });
  }

  required!: boolean;
  disabled!: boolean;
  $required!: Observable<boolean>;
  $disabled!: Observable<boolean>;

  ele!: HTMLInputElement;
  touched!: boolean;
  visited!: boolean;
  focused!: boolean;
  $touched!: Observable<boolean>;
  $focused!: Observable<boolean>;
  $visited!: Observable<boolean>;

}

export function IsInputControl<T>(obj: any): obj is InputControlAbstract<T> {
  return obj instanceof InputControlAbstract;
}

