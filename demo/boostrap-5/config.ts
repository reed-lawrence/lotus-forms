import { combineLatest } from "rxjs";
import { electron } from "webpack";
import { SetConfig, toggleClass } from "../../src/config/behavior-config";
import { DEFAULT_CONFIG } from "../../src/config/default";
import { CheckboxControl } from "../../src/controls/inputs/checkbox";

SetConfig({
  ...DEFAULT_CONFIG,
  valid: (control) => combineLatest([
    control.$valid,
    control.$touched,
    control.$visited
  ]).subscribe({
    next: ([isValid, touched, visited]) => {
      const { ele } = control;

      if (control instanceof CheckboxControl) {
        toggleClass(ele, 'is-valid', isValid);
        toggleClass(ele, 'is-invalid', !isValid && touched && visited);
      }

      else {
        toggleClass(ele, 'is-valid', isValid);
        toggleClass(ele, 'is-invalid', !isValid && touched);
      }

    }
  }),
})