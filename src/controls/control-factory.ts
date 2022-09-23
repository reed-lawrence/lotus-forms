import { AbstractControl } from './abstract-control';
import {
  BehaviorSubject,
  Observable,
  Subject,
  Subscription
  } from 'rxjs';
import { ValidatorFn } from '../internal/validators';
import {
  ControlStreamCtor,
  ControlStreamEvent,
  IControlStreamEvent,
} from '../internal/events';

type Constructor = new (...args: any[]) => {};

interface IMixin {
  __mixins__: Set<string>;
}


interface Dependencies {

  readonly subs: Subscription[];
  readonly onDispose: (() => void)[];

  readonly validators: Map<ValidatorFn, { errors: string[]; sub: Subscription; }>;
  readonly validatorRefs: { [index: string]: ValidatorFn<any> };

  readonly streams: Map<ControlStreamCtor, Observable<any>>;
  readonly $stream: Subject<IControlStreamEvent>;
  readonly $loadingQueue: BehaviorSubject<Set<string>>;

  getStream<T>({ key, fn }: { key: ControlStreamCtor<T>; fn: () => T }): Observable<T>;
  broadcast(event: ControlStreamEvent): void;

}

export class ControlFactory {

  #mixins = new Set<string>();

  register<TParent extends typeof AbstractControl, TMerged extends Constructor>(key: string, fn: (Parent: TParent) => TMerged) {

    if (this.#mixins.has(key))
      throw new Error(`Mixin already registered with key: ${key}`);
    else
      this.#mixins.add(key);

    return [
      function (Parent: TParent) {
        const ctor = fn(Parent);
        return class Mixin extends ctor implements IMixin {

          __mixins__ = new Set<string>();

          constructor(...args: any[]) {
            super(args);
            this.__mixins__.add(key);
          }
        }
      },
      function (obj: any): obj is TMerged {
        return obj.__mixins__ instanceof Set && (obj.__mixins__ as Set<string>).has(key);
      }
    ] as const;
  }

}

export const CONTROL_FACTORY = new ControlFactory();