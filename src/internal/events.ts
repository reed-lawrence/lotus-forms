import { AbstractControlState, IAbstractControl } from "../controls/abstract-control";
import { ValidatorFn } from "../validators/validators";

export interface IControlStreamEvent<T = any> {
  value: T;
}

export abstract class ControlStreamEvent<T = any> implements IControlStreamEvent<T>{
  constructor(
    public value: T
  ) { }
}

export type ControlStreamCtor<T = any> = new (...args: any[]) => ControlStreamEvent<T>;

export class NameChange extends ControlStreamEvent<string> { }
export class ValueChange<T> extends ControlStreamEvent<T> { }
export class TouchedChange extends ControlStreamEvent<boolean>{ }
export class VisitedChange extends ControlStreamEvent<boolean>{ }
export class FocusedChange extends ControlStreamEvent<boolean> { }
export class ValidChange extends ControlStreamEvent<boolean> { }
export class DirtyChange extends ControlStreamEvent<boolean> { }
export class PristineChange extends ControlStreamEvent<boolean> { }
export class StateChange extends ControlStreamEvent<AbstractControlState> { }
export class ErrorsChange extends ControlStreamEvent<Map<ValidatorFn<any>, string[]>> { }
export class RequiredChange extends ControlStreamEvent<boolean> { }
export class DisabledChange extends ControlStreamEvent<boolean> { }
export class ReadonlyChange extends ControlStreamEvent<boolean> { }