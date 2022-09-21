import { IAbstractControl } from "../internal/controls/abstract-control";
import { IBoundControlConfig, IBoundControl, BoundControl } from "../internal/controls/bound-control";

export interface ISelectControlConfig<T> extends IBoundControlConfig<T> { }

export interface ISelectControl<T> extends IAbstractControl<T>, IBoundControl<HTMLSelectElement> { }

export class SelectControl<T> extends BoundControl<T, HTMLSelectElement> {
  constructor(args: ISelectControlConfig<T>) {
    super(args);
  }
}