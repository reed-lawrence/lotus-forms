import { AbstractControl, IAbstractControlArgs } from './abstract-control';
import { Observable, Subject } from 'rxjs';
import { ControlStreamCtor, ControlStreamEvent, DisabledChange, RequiredChange } from '../internal/events';
import { defineProperties, IMixin } from '../internal/mixin';
import { IHasStream } from '../internal/interfaces';

export interface IFormControl {

  required: boolean;
  disabled: boolean;

  readonly $required: Observable<boolean>;
  readonly $disabled: Observable<boolean>;

}

const symbol = function Foo() { };

export function MixinFormControl(target: IMixin & IHasStream) {

  let _required = false;
  let _disabled = false;

  target.__mixins__.add(symbol);

  defineProperties<IFormControl>(target, {
    required: {
      get() {
        return _required;
      },
      set(required) {
        if (_required === required)
          return;

        _required = Boolean(required);
        target.$stream.next(new RequiredChange(_required));
      },
    },
    disabled: {
      get() {
        return _disabled;
      },
      set(disabled) {
        if (_disabled === disabled)
          return;

        _disabled = Boolean(disabled);
        target.$stream.next(new DisabledChange(_disabled));
      },
    },
    $required: {
      get() {
        return target.getStream({ key: RequiredChange, fn: () => _required });
      }
    },
    $disabled: {
      get() {
        return target.getStream({ key: DisabledChange, fn: () => _disabled });
      }
    },
  })

}

export function IsFormControl(obj: any): obj is IFormControl {
  return obj.__mixins__ instanceof Set && obj.__mixins__.has(symbol);
}