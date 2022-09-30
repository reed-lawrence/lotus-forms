import { combineLatest, filter, map, tap } from "rxjs";
import { Validators } from "../../src";
import { CheckboxControl } from "../../src/controls/inputs/checkbox";
import { TextInputControl } from "../../src/controls/inputs/text";

import './config';

const first_name = new TextInputControl({
  selector: '#first-name',
  value: '',
  name: 'First Name',
  validators: [
    Validators.required()
  ]
});

const last_name = new TextInputControl({
  selector: '#last-name',
  value: '',
  name: 'Last Name',
  validators: [
    Validators.required()
  ]
});

const username = new TextInputControl({
  selector: '#username',
  value: '',
  name: 'Username',
  validators: [
    Validators.required()
  ]
});

const terms_and_conditions = new CheckboxControl({
  selector: '#terms-and-conditions',
  value: false,
  name: 'Terms and Conditions',
  validators: [
    Validators.create((control) => control.$value.pipe(map(value => {

      if (value === false)
        return {
          required: 'Must agree to the terms and conditions'
        }
      else
        return;
    })))
  ]
});

username.onDispose(
  combineLatest([username.$touched, first_name.$value, last_name.$value]).pipe(
    filter(([touched]) => !touched)
  ).subscribe({
    next: ([touched, fname, lname]) => {
      if (fname && lname)
        username.value = `${fname.toLowerCase()}-${lname.toLocaleLowerCase()}`;
      else
        username.value = '';
    }
  })
);