import { defineProperties, IMixin } from '../internal/mixin';
import { FocusedChange, ResetEvent, TouchedChange, VisitedChange } from '../internal/events';
import { IDisposable, IHasState, IHasStream } from '../internal/interfaces';
import { filter, fromEvent, Observable, Subscription } from 'rxjs';

export interface IBoundControlArgs {
  selector: string;
}

export interface IBoundControl<TElement extends HTMLElement = HTMLElement> {

  readonly ele: TElement;
  touched: boolean;
  visited: boolean;
  focused: boolean;
  readonly $touched: Observable<boolean>;
  readonly $focused: Observable<boolean>;
  readonly $visited: Observable<boolean>;

}

type BoundMixinable<TElement extends HTMLElement> = IMixin & IBoundControl<TElement> & IHasStream & IDisposable & IHasState;

const symbol = function BoundControl() { };

export function MixinBoundControl<TElement extends HTMLElement>(target: BoundMixinable<TElement>, { selector }: IBoundControlArgs) {

  let _ele: TElement;
  let _touched = false;
  let _visited = false;
  let _focused = false;

  target.__mixins__.add(symbol);

  defineProperties<IBoundControl>(target, {
    ele: {
      get() {

        if (!_ele)
          _ele = document.querySelector(selector) || (() => {
            throw new Error(`Cannot find element matching query selector: ${selector}`);
          })();

        return _ele;

      },
    },
    touched: {
      get() {
        return _touched;
      },
      set(touched) {
        if (_touched === touched)
          return;

        _touched = Boolean(touched);
        target.$stream.next(new TouchedChange(_touched));
      },
    },
    visited: {
      get() {
        return _visited;
      },
      set(visited) {
        if (_visited === visited)
          return;

        _visited = Boolean(visited);
        target.$stream.next(new VisitedChange(_visited));
      },
    },
    focused: {
      get() {
        return _focused;
      },
      set(focused) {
        if (_focused === focused)
          return;

        _focused = Boolean(focused);
        target.$stream.next(new FocusedChange(_focused));
      },
    },
    $touched: {
      get() {
        return target.getStream({ key: TouchedChange, fn: () => _touched });
      }
    },
    $focused: {
      get() {
        return target.getStream({ key: FocusedChange, fn: () => _focused });
      }
    },
    $visited: {
      get() {
        return target.getStream({ key: VisitedChange, fn: () => _visited });
      }
    }
  });

  const subs: Subscription[] = [
    target.$stream.pipe(filter(ev => ev instanceof ResetEvent)).subscribe({
      next: () => {
        target.touched = false;
        target.visited = false;
      }
    }),
    fromEvent(target.ele, 'blur').subscribe({
      next: () => {
        target.visited = true
        target.focused = false;
      }
    }),
    fromEvent(target.ele, 'focus').subscribe({
      next: () => {
        target.focused = true;
        target.touched = true;
      }
    })
  ];

  target.onDispose(() => subs.forEach(s => s.unsubscribe()));

}

export function IsBoundControl<TElement extends HTMLElement = HTMLElement>(obj: any): obj is IBoundControl<TElement> {
  return obj.__mixins__ instanceof Set && obj.__mixins__.has(symbol);
}