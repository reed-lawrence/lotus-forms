import { BoundControl } from './bound-control';
import { Observable } from 'rxjs';
import { ReadonlyChange } from '../internal/events';

export interface IInputControl {
  get readonly(): boolean;
  set readonly(value: boolean);
  get $readonly(): Observable<boolean>;
}

export class InputControl<T> extends BoundControl<T, HTMLInputElement> implements IInputControl {

  #readonly = false;
  get readonly(): boolean {
    return this.#readonly;
  }

  set readonly(value: boolean) {
    if (value === this.#readonly)
      return;

    this.#readonly = value;
    this._$stream.next(new ReadonlyChange(value));
  }

  get $readonly(): Observable<boolean> {
    return this._getStream({ key: ReadonlyChange, fn: () => this.readonly });
  }

}