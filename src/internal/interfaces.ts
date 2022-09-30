import { Observable, Subject } from "rxjs";
import { ControlStreamCtor, ControlStreamEvent } from "./events";

export interface IMixin {
  __mixins__: Map<Function, Record<string, any>>;
}

export interface IHasStream {
  $stream: Subject<ControlStreamEvent>;
  getStream: <T>({ key, fn }: { key: ControlStreamCtor<T>, fn: () => T }) => Observable<T>;
}