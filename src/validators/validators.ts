import { Observable, switchMap, firstValueFrom, map } from "rxjs";
import { IAbstractControl } from "../controls/abstract-control";

export type ValidationError = { [index: string]: string };

export type ValidatorFn<T extends IAbstractControl = IAbstractControl> = (control: T) => Observable<ValidationError | undefined>;

export interface IValidatorArgs {
  signal?: Observable<any>;
}

export class Validators {

  static create(fn: ValidatorFn, args?: IValidatorArgs): ValidatorFn {
    if (args?.signal)
      return (control) => args.signal!.pipe(switchMap(() => firstValueFrom(fn(control))));
    else
      return fn;
  }

  static required(args: IValidatorArgs = {}): ValidatorFn<any> {
    return this.create((control) => control.$value().pipe(
      map((value) => {

        if (!value)
          return {
            required: `${control.getName()} is required`
          } as ValidationError;
        else
          return undefined;

      })), args);
  }

  static numeric(args: IValidatorArgs = {}): ValidatorFn<any> {
    return this.create((control) => control.$value().pipe(
      map((value) => {

        if (!!value && isNaN(Number(value)))
          return {
            required: `${control.getName()} must be numeric`
          } as ValidationError;
        else
          return undefined;

      })), args);
  }

  static max(number: number, args: IValidatorArgs = {}): ValidatorFn<any> {
    return this.create((control) =>
      control.$value().pipe(
        map((value) => {
          if (!!value && Number(value) > number)
            return {
              max: `${control.getName()} cannot exceed ${number}`
            } as ValidationError
          else
            return undefined;
        })
      ), args);
  }
}