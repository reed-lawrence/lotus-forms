import { Observable, Subject, Subscription } from "rxjs";
import { AbstractControlState } from "../controls/abstract-control";
import { ControlStreamCtor, ControlStreamEvent } from "./events";

export interface IMixin {
  __mixins__: Map<Function, Record<string, any>>;
}

export interface IHasStream {
  $stream: Subject<ControlStreamEvent>;
  getStream<T>({ key, fn }: { key: ControlStreamCtor<T>, fn: () => T }): Observable<T>;
}

export interface IDisposable {
  onDispose(subscription: Subscription): void
  onDispose(add: () => void): void
}

export interface IHasState {
  state: AbstractControlState;
  $state: Observable<AbstractControlState>;
}