import { BehaviorSubject, Observable, Subject } from "rxjs";
import { ControlStreamCtor, ControlStreamEvent, FocusedChange, TouchedChange, VisitedChange } from "../internal/events";
import { IHasStream } from "../internal/interfaces";
import { IMixin } from "../internal/mixin";
import { AbstractControl, IAbstractControlArgs } from "./abstract-control";
import { CONTROL_FACTORY } from "./control-factory";

export interface IBoundControlArgs {
  selector: string;
}

interface IBoundControlCtx<TElement extends HTMLElement = HTMLElement> {
  ele?: TElement;
  touched?: boolean;
  visited?: boolean;
  focused?: boolean;
}

export interface IBoundControl<TElement extends HTMLElement = HTMLElement> {
  selector: string;

  ele: () => TElement;

  touched: {
    (touched: boolean): void;
    (): boolean
  }

  getVisited: () => boolean;
  setVisited: (value: boolean) => void;

  getFocused: () => boolean;
  setFocused: (value: boolean) => void;

  $touched: () => Observable<boolean>;
  $focused: () => Observable<boolean>;
  $visited: () => Observable<boolean>;
}

export abstract class BoundControlAbstract<TElement extends HTMLElement = HTMLEmbedElement> implements IBoundControl<TElement>, IHasStream, IMixin {

  declare __mixins__: Set<Function>;
  declare $stream: Subject<ControlStreamEvent<any>>;
  declare getStream: <T>({ key, fn }: { key: ControlStreamCtor<any>; fn: () => T; }) => Observable<T>;


  constructor(args: IBoundControlArgs) {
    this.selector = args.selector;

    let ele: TElement | null;
    this.ele = () => {

      if (!ele) {
        if (!this.selector)
          throw new Error('No selector provided to BoundControlAbstract');

        ele = document.querySelector(this.selector);

        if (!ele)
          throw new Error(`No element found matching query selector: ${this.selector}`);
      }

      return ele;
    }
  }

  selector: string;
  ele: () => TElement;
  touched(touched: boolean): void
  touched(): boolean;
  touched(touched?: boolean) {
    if (touched === true || touched === false) {
      if (touched === touched)
        return;

      let ctx = this.__mixins__.get(BoundControlAbstract) || {};
      this.__mixins__.set(BoundControlAbstract, { ...ctx, touched });

      this.$stream.next(new TouchedChange(touched));
    }
    else {
      return this.__mixins__.get(BoundControlAbstract)?.touched || false;
    }

    return;

  }

  getVisited = () => {
    return this.__mixins__.get(BoundControlAbstract)?.visited || false;
  }

  setVisited = (visited: boolean) => {
    if (visited === this.getVisited())
      return;

    let ctx = this.__mixins__.get(BoundControlAbstract) || {};
    this.__mixins__.set(BoundControlAbstract, { ...ctx, visited });

    this.$stream.next(new VisitedChange(visited));
  }

  getFocused = () => {
    return this.__mixins__.get(BoundControlAbstract)?.focused || false;
  }

  setFocused = (focused: boolean) => {
    if (focused === this.getVisited())
      return;

    let ctx = this.__mixins__.get(BoundControlAbstract) || {};
    this.__mixins__.set(BoundControlAbstract, { ...ctx, focused });

    this.$stream.next(new FocusedChange(focused));
  }

  $touched = () => {
    return this.getStream({ key: TouchedChange, fn: () => this.touched() });
  }

  $visited = () => {
    return this.getStream({ key: VisitedChange, fn: () => this.getVisited() });
  }

  $focused = () => {
    return this.getStream({ key: FocusedChange, fn: () => this.getFocused() });
  }

}