import { AbstractControlState } from "../controls/abstract-control";
import { IsFormControl } from "../controls/form-control";
import { IsInputControl } from "../controls/inputs/input-control";
import { ControlConfig, toggleClass, canBeDisabled } from "./behavior-config";

export const DEFAULT_CONFIG: ControlConfig = {
  focus: (control) => control.$focused.subscribe({ next: (isFocused) => toggleClass(control.ele, 'focused', isFocused) }),
  loading: (control) => control.$loading.subscribe({ next: (isLoading) => toggleClass(control.ele, 'loading', isLoading) }),
  disabled: (control) => {
    const { ele } = control;
    if (IsFormControl(control) && canBeDisabled(ele))
      return control.$disabled.subscribe({
        next: (isDisabled) => {
          toggleClass(ele, 'disabled', isDisabled);
          ele.disabled = isDisabled;
        }
      });

    return undefined;
  },
  readonly: (control) => {

    if (IsInputControl(control)) {
      const { ele } = control;
      return control.$readonly.subscribe({
        next: (isReadonly) => {
          toggleClass(ele, 'readonly', isReadonly);
          ele.readOnly = isReadonly;
        }
      });
    }

    return undefined;
  },
  state: (control) => control.$state.subscribe({
    next: (state) => {
      toggleClass(control.ele, 'pristine', state === AbstractControlState.pristine);
      toggleClass(control.ele, 'dirty', state === AbstractControlState.dirty);
    }
  }),
  touched: (control) => control.$touched.subscribe({ next: (isTouched) => toggleClass(control.ele, 'touched', isTouched) }),
  valid: (control) => control.$valid.subscribe({
    next: (isValid) => {
      toggleClass(control.ele, 'valid', isValid);
      toggleClass(control.ele, 'invalid', !isValid);
    }
  }),
  visited: (control) => control.$visited.subscribe({ next: (isVisited) => toggleClass(control.ele, 'visited', isVisited) })
}