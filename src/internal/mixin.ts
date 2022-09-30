export interface IMixin {
  readonly __mixins__: Set<Function>;
}

type PropertyDescriptorsOf<T> = { [Prop in keyof T]: TypedPropertyDescriptor<T[Prop]> }

export function defineProperties<T>(target: object, properties: PropertyDescriptorsOf<T>) {
  Object.defineProperties(target, properties)
}

