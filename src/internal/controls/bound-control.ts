import { Observable } from "rxjs";

export interface IBoundControlConfig {
  selector: string;
}

export interface IBoundControl<TElement extends HTMLElement = HTMLElement> {
  get ele(): TElement;

  get touched(): boolean;
  set touched(value: boolean);

  get visited(): boolean;
  set visited(value: boolean);

  get focused(): boolean;
  set focused(value: boolean);

  get $touched(): Observable<boolean>;
  get $focused(): Observable<boolean>;
  get $visited(): Observable<boolean>;
}

