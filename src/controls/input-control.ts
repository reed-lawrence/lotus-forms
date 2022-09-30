import { BoundControlAbstract, IBoundControl, IBoundControlArgs } from './bound-control';
import { filter, from, fromEvent, map, Observable } from 'rxjs';
import { ReadonlyChange } from '../internal/events';
import { CONTROL_FACTORY } from './control-factory';
import { AbstractControl, IAbstractControlArgs } from './abstract-control';
import { ApplyMixin } from '../internal/mixin';
import { FormControlAbstract, IFormControl } from './form-control';

export interface IInputControlArgs<T> extends IBoundControlArgs, IAbstractControlArgs<T> { }

export interface IInputControl {
  get readonly(): boolean;
  set readonly(value: boolean);
  get $readonly(): Observable<boolean>;
}

export class InputControl<T> extends AbstractControl<T> implements IBoundControl<HTMLInputElement>, IFormControl {

  constructor(args: IInputControlArgs<T>) {
    super(args);

    ApplyMixin(this, BoundControlAbstract, { selector: '' });
    ApplyMixin(this, FormControlAbstract);

    this.selector = args.selector;

    const ele = this.ele();

    this._subs.push(

      this.$value().pipe(
        filter((value) => value !== ele.value as any)
      ).subscribe({ next: (value) => ele.value = value as any }),

      fromEvent(ele, 'input').pipe(
        map((event) => ({ value: ele.value as unknown as T, event }))
      ).subscribe({
        next: ({ value }) => {
          this.setValue(value);
        }
      })
    );
  }

  selector!: string;
  ele!: () => HTMLInputElement;
  touched: { (touched: boolean): void; (): boolean; };
  getVisited!: () => boolean;
  setVisited!: (value: boolean) => void;
  getFocused!: () => boolean;
  setFocused!: (value: boolean) => void;
  $touched!: () => Observable<boolean>;
  $focused!: () => Observable<boolean>;
  $visited!: () => Observable<boolean>;
  getRequired!: () => boolean;
  setRequired!: (value: boolean) => void;
  getDisabled!: () => boolean;
  setDisabled!: (value: boolean) => void;
  $required!: () => Observable<boolean>;
  $disabled!: () => Observable<boolean>;

}

