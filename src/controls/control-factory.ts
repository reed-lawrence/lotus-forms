
interface IMixin {
  __mixins__: Set<string>;
}

type FactoryFn<T = any, TArgs = any, TSource = any> = (args: TArgs, source: TSource) => T;
type FactoryFnMerged<T = any, TArgs = any> = <Source = any>(args: TArgs, source: Source) => T & Source;

function isMixin(obj: any): obj is IMixin {
  return obj.__mixins__ instanceof Set;
}

class MixinChainNode<T = any, TArgs = any, TSource = any> {
  constructor(
    private key: string,
    private fns: (FactoryFn | FactoryFnMerged)[] = [],
  ) { }

  add<U, UArgs, USource extends TSource>(fn: FactoryFn<U, UArgs, USource> | FactoryFnMerged<U, UArgs>) {
    this.fns.push(fn);
    return new MixinChainNode<T & U & USource, TArgs & UArgs, USource>(this.key, this.fns);
  }

  build() {

    const mixin = <Source>(args: TArgs, source: Source) => {

      const __mixins__ = isMixin(source) ? source.__mixins__ : new Set<string>();
      __mixins__.add(this.key);

      return this.fns.reduce((obj, fn) => fn(args, obj), { ...source, __mixins__ }) as unknown as T & Source;

    };

    const ctor: (args: TArgs) => T = (args: TArgs) => mixin(args, {});

    const typeGuard = (obj: any): obj is (T & Parameters<typeof mixin>[1]) => {
      return isMixin(obj) && obj.__mixins__.has(this.key);
    }


    return [
      mixin as FactoryFnMerged<T & Parameters<typeof mixin>[1], TArgs>,
      ctor,
      typeGuard
    ] as const;
  }
}

export class ControlFactory {

  compose<TSource = unknown>(key: string) {
    return new MixinChainNode<unknown, unknown, TSource>(key);
  }

  create<T, TArgs>(key: string, fn: FactoryFn<T, TArgs>) {

    const mixin = <Source>(args: TArgs, source: Source) => {
      let obj = fn(args, source);

      const __mixins__ = isMixin(source) ? source.__mixins__ : new Set<string>();
      __mixins__.add(key);

      return {
        ...source,
        ...obj,
        ...<IMixin>{ __mixins__ }
      } as T & Source
    }

    const typeGuard = (obj: any): obj is T => {
      return isMixin(obj) && obj.__mixins__.has(key);
    }

    const ctor = (args: TArgs): T => {
      return mixin(args, {});
    }

    return [
      mixin as FactoryFnMerged<T & Parameters<typeof mixin>[1], TArgs>,
      ctor,
      typeGuard
    ] as const;
  }
}

export const CONTROL_FACTORY = new ControlFactory();

