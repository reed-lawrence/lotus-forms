import { Observable } from "rxjs";
import { AbstractControlConfig, AbstractControl } from "./abstract-control";
import { TouchedChange, VisitedChange, FocusedChange } from "../events";

export interface IBoundControlConfig<T> extends AbstractControlConfig<T> {
  selector: string;
}

export interface IBoundControl<TElement extends HTMLElement = HTMLElement> {
  readonly ele: TElement;

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

export abstract class BoundControl<T, TElement extends HTMLElement = HTMLElement> extends AbstractControl<T> implements IBoundControl<TElement> {
  readonly ele: TElement;

  #touched: boolean = false;
  public get touched() {
    return this.#touched;
  }

  public set touched(value: boolean) {
    if (value === this.touched)
      return;

    this.#touched = value;
    this._broadcast(new TouchedChange(value))
  }

  #visited: boolean = false;
  public get visited() {
    return this.#visited;
  }

  public set visited(value: boolean) {
    if (value === this.visited)
      return;

    this.#visited = value;
    this._broadcast(new VisitedChange(value));
  }

  #focused: boolean = false;
  public get focused() {
    return this.#focused;
  }

  public set focused(value: boolean) {
    if (value === this.focused)
      return;

    this.#focused = value;
    this._broadcast(new FocusedChange(value));
  }

  get $touched() {
    return this._getStream({ key: TouchedChange, fn: () => this.touched });
  }

  get $focused() {
    return this._getStream({ key: FocusedChange, fn: () => this.focused });
  }

  get $visited() {
    return this._getStream({ key: VisitedChange, fn: () => this.visited });
  }

  constructor(args: IBoundControlConfig<T>) {
    super(args);

    const ele = document.querySelector(args.selector) as TElement | null;

    if (!ele)
      throw new Error(`No element found using query selector: ${args.selector}`);

    this.ele = ele;
  }

  override reset() {
    this.touched = false;

    if (!this.focused)
      this.visited = false;

    super.reset();
  }
}