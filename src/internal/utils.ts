export function flattenToDistinctStr(arr: IterableIterator<string[]>) {
  const output: string[] = [];

  for (const errors of arr)
    for (const err of errors)
      if (!output.includes(err))
        output.push(err);

  return output;
}

export type MapType<T, U> = { [Property in keyof T]: U };