import { Observable } from "rxjs";
import { FocusedChange, TouchedChange, VisitedChange } from "../internal/events";
import { AbstractControl } from "./abstract-control";
import { CONTROL_FACTORY } from "./control-factory";

export interface IBoundControlConfig {
  selector: string;
}

export interface IBoundControl<TElement extends HTMLElement = HTMLElement> {
  get ele(): TElement;

  get touched(): boolean;
  set touched(value: boolean);

  get visited(): boolean;
  set visited(value: boolean);

  get focused(): boolean;
  set focused(value: boolean);

  get $touched(): Observable<boolean>;
  get $focused(): Observable<boolean>;
  get $visited(): Observable<boolean>;
}

export const [MixinBoundControl, isBoundControl] = CONTROL_FACTORY.register('bound-control', (Parent) => {
  return class BoundControlMixin<T, TElement extends HTMLElement = HTMLElement> extends Parent<T> implements IBoundControl {

    readonly #ele: TElement;

    get ele(): TElement {
      return this.#ele;
    }

    #touched = false;
    get touched(): boolean {
      return this.#touched;
    }
    set touched(value: boolean) {
      if (value === this.#touched)
        return;

      this.#touched = value;
      this._$stream.next(new TouchedChange(value));
    }

    #visited = false;
    get visited(): boolean {
      return this.#visited;
    }
    set visited(value: boolean) {
      if (value === this.#visited)
        return;

      this.#visited = value;
      this._$stream.next(new VisitedChange(value));
    }

    #focused = false;
    get focused(): boolean {
      return this.#focused;
    }
    set focused(value: boolean) {
      if (value === this.#focused)
        return;

      this.#focused = value;
      this._$stream.next(new FocusedChange(value));
    }

    get $touched(): Observable<boolean> {
      return this._getStream({ key: TouchedChange, fn: () => this.touched });
    }

    get $focused(): Observable<boolean> {
      return this._getStream({ key: FocusedChange, fn: () => this.focused });
    }

    get $visited(): Observable<boolean> {
      return this._getStream({ key: VisitedChange, fn: () => this.#visited });
    }

    constructor(...args: any[]) {
      super(args);
    }

  }
});

export class BoundControl<T, TElement extends HTMLElement = HTMLEmbedElement> extends MixinBoundControl(AbstractControl)<T, TElement> { }