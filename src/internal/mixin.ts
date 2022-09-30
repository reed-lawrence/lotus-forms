type AbstractConstructor = abstract new (args: any) => {}

export interface IMixin {
  __mixins__: Set<Function>;
}

// export function ApplyMixin<T extends AbstractConstructor>(target: IMixin, ctor: T, ...args: ConstructorParameters<T>) {
//   const descriptors = Object.getOwnPropertyDescriptors(ctor.prototype);

//   if (!target.__mixins__)
//     target.__mixins__ = new Set();

//   if (target.__mixins__.has(ctor))
//     throw new Error('Cannot rebind duplicate mixin');

//   target.__mixins__.add(ctor);

//   for (const key in descriptors) {
//     if (key === 'constructor')
//       continue;

//     const attrs = descriptors[key];
//     if (attrs.get)
//       attrs.get.bind(target);


//     if (attrs.set)
//       attrs.set.bind(target);

//     Object.defineProperty(target, key, attrs);
//   }
// }

export function ApplyMixin<T extends AbstractConstructor>(target: IMixin, ctor: T, ...args: ConstructorParameters<T>) {
  const descriptors = Object.getOwnPropertyDescriptors(ctor.prototype);

  ctor.constructor.call()

  if (!target.__mixins__)
    target.__mixins__ = new Set();

  if (target.__mixins__.has(ctor))
    throw new Error('Cannot rebind duplicate mixin');

  target.__mixins__.add(ctor);

  for (const key in descriptors) {
    if (key === 'constructor')
      continue;

    const attrs = descriptors[key];

    if (attrs.get)
      attrs.get.bind(target);


    if (attrs.set)
      attrs.set.bind(target);

    Object.defineProperty(target, key, attrs);
  }
}