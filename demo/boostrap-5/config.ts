import { CheckboxControl } from '../../src/controls/inputs/checkbox';
import { combineLatest } from 'rxjs';
import { DEFAULT_CONFIG } from '../../src/config/default';
import { SetConfig, toggleClass } from '../../src/config/behavior-config';

SetConfig({
  ...DEFAULT_CONFIG,
  valid: (control) => combineLatest([
    control.$valid,
    control.$touched,
    control.$visited,
    control.$loading
  ]).subscribe({
    next: ([isValid, touched, visited, loading]) => {
      const { ele } = control;

      if (loading) {
        ele.classList.remove('is-valid', 'is-invalid');
        return;
      }

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
});