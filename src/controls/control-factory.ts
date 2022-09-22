import { BehaviorSubject, filter, map, Observable, Subject, Subscription, shareReplay, of } from "rxjs";
import { AbstractControl, AbstractControlConfig, AbstractControlState, IAbstractControl } from "../internal/controls/abstract-control";
import { IBoundControl, IBoundControlConfig } from "../internal/controls/bound-control";
import { ControlStreamCtor, ControlStreamEvent, ErrorsChange, FocusedChange, IControlStreamEvent, NameChange, StateChange, TouchedChange, ValidChange, ValueChange, VisitedChange } from "../internal/events";
import { Loader } from "../internal/loader";
import { ValidatorFn } from "../internal/validators";
import { IFormControl } from "./form-control";
import { flattenToDistinctStr } from "../internal/utils";

function Merge<T, U>(target: T, source: U): T & U {
  const output = {};

  const info = Object.getOwnPropertyDescriptors(target);

  for (const key in info) {
    const descriptor = info[key];
    console.log(key, descriptor);
    Object.defineProperty(output, key, descriptor);
  }

  return output as T & U;
}

interface BoundControlArgs {
  selector: string;
}

class FactoryOperation<T extends IAbstractControl> {

  mixin(type: 'control'): FactoryOperation<T & IFormControl>;
  mixin<TElement extends HTMLElement = HTMLElement>(type: 'bound', args: BoundControlArgs): FactoryOperation<T & IBoundControl<TElement>>;
  mixin<U>(key: string, args?: object): FactoryOperation<T & U> {
    const match = this.deps.mixins.get(key);

    if (!match)
      throw new Error(`No Mixin found matching key: ${key}`);

    return new FactoryOperation(match(this.target, this.deps, args), this.deps);
  }

  hydrate() {
    return this.target;
  }

  constructor(
    private target: T,
    private deps: Dependencies
  ) { }

}

type MixinMap = Map<string, Mixin>;
type Mixin<U = any> = (obj: IAbstractControl, deps: Dependencies, args?: any) => U;

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

  mixins: MixinMap;

}

export class ControlFactory {

  static #mixins: MixinMap = new Map<string, Mixin>([
    ['bound', (obj, deps, args: BoundControlArgs): typeof obj & IBoundControl => {

      const ele = document.querySelector(args.selector) as HTMLElement | null;

      if (!ele)
        throw new Error(`No element found matching query selector: ${args.selector}`);

      let focused = false;
      let visited = false;
      let touched = false;

      const _super = {
        reset: obj.reset
      }

      function setTouched(value: boolean) {
        if (value === touched)
          return;

        touched = value;
        deps.broadcast(new TouchedChange(value));
      }

      function setVisited(value: boolean) {
        if (value === touched)
          return;

        visited = value;
        deps.broadcast(new VisitedChange(value));
      }

      Object.defineProperties(obj, {
        ele: {
          get() { return ele; }
        },
        touched: {
          get() { return touched; },
          set: setTouched
        },
        visited: {
          get() { return visited; },
          set: setVisited
        },
        focused: {
          get() { return focused; },
          set(value: boolean) {
            if (value === focused)
              return;

            focused = value;
            deps.broadcast(new FocusedChange(value));
          }
        },
        $touched: {
          get() { return deps.getStream({ key: TouchedChange, fn: () => touched }) }
        },
        $focused: {
          get() { return deps.getStream({ key: FocusedChange, fn: () => focused }) }
        },
        $visited: {
          get() { return deps.getStream({ key: VisitedChange, fn: () => visited }) }
        },
        reset: {
          get() {
            return function reset() {
              setTouched(false);

              if (!focused)
                setVisited(false);

              _super.reset();
            }
          },
        }
      });

      return obj as typeof obj & IBoundControl;
    }],
    ['control', (obj, deps): typeof obj & IFormControl => {
      let required = false;
      let disabled = false;
      
    }]
  ]);

  static build<T>(args: AbstractControlConfig<T>): FactoryOperation<IAbstractControl<T>> {
    const deps: Dependencies = {
      $loadingQueue: new BehaviorSubject(new Set<string>()),
      $stream: new Subject<IControlStreamEvent>(),
      onDispose: [],
      streams: new Map<ControlStreamCtor, Observable<any>>(),
      subs: [],
      validators: new Map<ValidatorFn, { errors: string[]; sub: Subscription; }>(),
      validatorRefs: {},
      mixins: this.#mixins,
      broadcast: (ev) => deps.$stream.next(ev),
      getStream: ({ key, fn }) => {
        let stream = deps.streams.get(key as any) as Observable<any>;

        if (!stream) {

          stream = deps.$stream.pipe(
            filter(ev => ev instanceof key),
            map(() => fn()),
            shareReplay()
          );

          deps.streams.set(key, stream);
        }

        return stream;
      }
    }

    let name = '';
    let _value: T = args.value;
    let _default: () => T = args.default_fn || (() => {
      if (typeof args.value === 'object') {
        const value = Object.assign({}, args.value);
        return () => Object.assign({}, value);
      }
      else
        return () => args.value;
    })();
    let valid = true;
    let state = AbstractControlState.pristine;
    let errors_distinct: string[] = [];
    let error_refs = new Map<ValidatorFn, string[]>();

    function setValue(value: T) {
      if (_value === value)
        return;

      _value = value;
      deps.broadcast(new ValueChange(value));
    }

    function setState(value: AbstractControlState) {
      if (state === value)
        return;

      state = value;
      deps.broadcast(new StateChange(value));
    }

    const base: IAbstractControl = {
      get name() { return name },
      set name(value: string) {
        if (name === value)
          return;

        name = value;
        deps.broadcast(new NameChange(value));
      },

      get value() { return _value; },
      set value(value: T) {
        setValue(value);
      },

      get valid() { return valid; },
      set valid(value: boolean) {
        if (valid === value)
          return;

        valid = value;
        deps.broadcast(new ValidChange(value));
      },

      get dirty() { return state === AbstractControlState.dirty; },
      get pristine() { return state === AbstractControlState.pristine; },

      get state() { return state; },
      set state(value: AbstractControlState) {
        setState(value);
      },

      get errors() { return errors_distinct; },

      get $valid() { return deps.getStream({ key: ValidChange, fn: () => valid }) },
      get $name() { return deps.getStream({ key: NameChange, fn: () => name }) },
      get $value() { return deps.getStream({ key: ValueChange, fn: () => _value }) },
      get $state() { return deps.getStream({ key: StateChange, fn: () => state }) },
      get $errors() { return deps.getStream({ key: ErrorsChange, fn: () => error_refs }) },

      async addLoader(): Promise<Loader> {
        const id = crypto.randomUUID();

        let queue = new Set(this._$loadingQueue.value);
        queue.add(id);
        this._$loadingQueue.next(queue);

        await Promise.resolve(); // To flush UI updates

        return {
          id,
          remove: async () => {

            queue = new Set(this._$loadingQueue.value);
            queue.delete(id);
            this._$loadingQueue.next(queue);

            await Promise.resolve();

            return;
          }
        };
      },

      addValidator(arg: ValidatorFn<T> | ValidatorFn<T>[]) {

        let validators = Array.isArray(arg) ? arg : [arg];

        for (const validator of validators) {

          if (deps.validators.has(validator))
            continue;

          deps.validators.set(validator, {
            errors: [],
            sub: validator(this).pipe(
              map(errors => Object.values(errors || {})),
            ).subscribe({
              next: async (errors) => {

                let dirty = false;
                let current = new Set<string>(error_refs.get(validator) || []);

                for (const err of current) {
                  if (errors.indexOf(err) === -1) {
                    dirty = true;
                    current.delete(err);
                  }
                }

                if (errors.length) {

                  for (const err of errors)
                    if (!current.has(err)) {
                      current.add(err);
                      dirty = true;
                    }

                }

                if (dirty) {
                  const all = error_refs;

                  if (current.size)
                    all.set(validator, Array.from(current.values()));
                  else
                    all.delete(validator);

                  error_refs = all;
                  errors_distinct = flattenToDistinctStr(all.values());

                  deps.broadcast(new ErrorsChange(error_refs));

                }

              }
            })
          });
        }

      },

      removeValidator(validator: ValidatorFn<T>) {
        if (!validator)
          return this;

        const match = deps.validators.get(validator);

        if (!match)
          return this;

        match.sub.unsubscribe();

        let all = error_refs;

        if (all.has(validator)) {
          all = new Map(all);
          all.delete(validator);

          error_refs = all;
          errors_distinct = flattenToDistinctStr(all.values());

          this._broadcast(new ErrorsChange(all));
        }
      },

      onDispose(add: () => void) {
        deps.onDispose.push(add);
      },

      dispose() {
        for (const fn of deps.onDispose)
          try {
            fn();
          } catch (err) {
            console.error(err);
          }
      },

      reset() {
        setValue(_default());
        setState(AbstractControlState.pristine);
      },

    };

    return new FactoryOperation(base, deps);
  }

}

const test = ControlFactory.build({ name: 'test', value: '' }).mixin<HTMLInputElement>('bound', { selector: '' }).hydrate();