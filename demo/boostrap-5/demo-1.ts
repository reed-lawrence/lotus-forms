import { combineLatest, debounceTime, filter, map, switchMap } from "rxjs";

import { Validators, ValidationError } from "../../src";
import { CheckboxControl } from "../../src/controls/inputs/checkbox";
import { TextInputControl } from "../../src/controls/inputs/text";
import { CurrencyMask } from "../../src/internal/input-mask";

import './config';

const first_name = new TextInputControl({
  selector: '#first-name',
  value: 'Reed',
  name: 'First Name',
  validators: [
    Validators.required()
  ],
  equalityOperator: (a, b) => a.toLowerCase().trim() === b.toLowerCase().trim()
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
    Validators.required(),
    Validators.create((control) => control.$value.pipe(
      debounceTime(50),
      switchMap((value) => new Promise<ValidationError | undefined>(async (resolve, reject) => {

        const loader = await control.addLoader();

        setTimeout(() => {

          if (value === 'reed-lawrence')
            resolve(undefined);
          else
            resolve({
              invalid_username: `Invalid username`
            });

          loader.remove();
        }, 500)
      }))
    )
    )
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
  combineLatest([
    username.$touched,
    first_name.$value,
    last_name.$value
  ]).pipe(

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

const phone = new TextInputControl<number | null>({
  selector: '#phone-number',
  value: null,
  name: 'Phone Number',
  mask: new CurrencyMask(),
  validators: [(control) => control.$value.pipe(map(value => {
    if (!value || value < 5000)
      return {
        threshold: 'Must exceed $50.00'
      }

    return;
  }))]
});

phone.$value.subscribe({ next: console.log });
first_name.$value.subscribe({ next: console.log });

setTimeout(() => phone.value = 1000 as any, 3000);
