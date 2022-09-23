import { BoundControl, IBoundControl } from "./bound-control";

export interface ISelectControl extends IBoundControl<HTMLSelectElement> { }

export class SelectControl extends BoundControl<HTMLSelectElement> { }