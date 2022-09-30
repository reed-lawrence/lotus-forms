import { AbstractControl, IAbstractControlArgs } from './abstract-control';
import { Observable, Subject } from 'rxjs';
import { ControlStreamCtor, ControlStreamEvent, DisabledChange, RequiredChange } from '../internal/events';
import { IMixin } from '../internal/mixin';
import { IHasStream } from '../internal/interfaces';

export interface IFormControlArgs<T> extends IAbstractControlArgs<T> { }

export interface IFormControl {

  getRequired: () => boolean;
  setRequired: (value: boolean) => void;

  getDisabled: () => boolean;
  setDisabled: (value: boolean) => void;

  $required: () => Observable<boolean>;
  $disabled: () => Observable<boolean>;

}

interface IFormControlCtx {
  required?: boolean;
  disabled?: boolean;
}

export abstract class FormControlAbstract implements IFormControl, IMixin, IHasStream {

  declare __mixins__: Map<Function, IFormControlCtx>;
  declare $stream: IHasStream['$stream'];
  declare getStream: IHasStream['getStream'];

  getRequired = () => {
    return this.__mixins__.get(FormControlAbstract)?.required || false;
  }
  setRequired = (required: boolean) => {
    if (required === this.getRequired())
      return;

    const ctx = this.__mixins__.get(FormControlAbstract);
    this.__mixins__.set(FormControlAbstract, { ...ctx, required });

    this.$stream.next(new RequiredChange(required));
  }

  getDisabled = () => {
    return this.__mixins__.get(FormControlAbstract)?.disabled || false;
  }
  setDisabled = (disabled: boolean) => {
    if (disabled === this.getDisabled())
      return;

    const ctx = this.__mixins__.get(FormControlAbstract);
    this.__mixins__.set(FormControlAbstract, { ...ctx, disabled });

    this.$stream.next(new DisabledChange(disabled));
  }

  $required = () => {
    return this.getStream({ key: RequiredChange, fn: () => this.getRequired() });
  }

  $disabled = () => {
    return this.getStream({ key: DisabledChange, fn: () => this.getDisabled() });
  }

}
