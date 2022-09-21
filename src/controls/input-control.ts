import { Observable, fromEvent } from "rxjs";
import { IAbstractControl, AbstractControlState } from "../internal/controls/abstract-control";
import { BoundControl, IBoundControl, IBoundControlConfig } from "../internal/controls/bound-control";
import { ReadonlyChange } from "../internal/events";

export interface IInputControlConfig<T> extends IBoundControlConfig<T> { }

export interface IInputControl<T> extends IAbstractControl<T>, IBoundControl<HTMLInputElement> {
  get readonly(): boolean;
  get $readonly(): Observable<boolean>;
}

export class InputControl<T> extends BoundControl<T, HTMLInputElement> {

  #readonly = false;
  public get readonly() {
    return this.#readonly;
  }

  public set readonly(value: boolean) {
    if (value === this.readonly)
      return;

    this.ele.readOnly = value;
    this._broadcast(new ReadonlyChange(value));
  }

  get $readonly() {
    return this._getStream({ key: ReadonlyChange, fn: () => this.readonly });
  }

  constructor(args: IInputControlConfig<T>) {
    super(args);

    this._subs.push(
      fromEvent(this.ele, 'input')
        .subscribe({
          next: (ev) => {
            this.value = (ev.target as HTMLInputElement).value as unknown as T;
            this.state = AbstractControlState.dirty;
          }
        })
    );
  }

}