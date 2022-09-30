import { AbstractControlState, IAbstractControl } from '../controls/abstract-control';
import { IBoundControl } from '../controls/bound-control';
import { IsFormControl } from '../controls/form-control';
import { IsInputControl } from '../controls/inputs/input-control';
import { Subscription } from 'rxjs';
import { DEFAULT_CONFIG } from './default';


export function toggleClass(ele: HTMLElement, className: string, value: boolean) {
  if (value)
    ele.classList.add(className);
  else
    ele.classList.remove(className);
}

export function canBeDisabled(ele: any): ele is { disabled: boolean } {
  return ele instanceof HTMLElement && Object.keys(ele).includes('disabled');
}

export interface ControlConfig {
  all?: (control: IAbstractControl & IBoundControl) => Subscription | Subscription[] | undefined;
  focus?: (control: IAbstractControl & IBoundControl) => Subscription | Subscription[] | undefined;
  loading?: (control: IAbstractControl & IBoundControl) => Subscription | Subscription[] | undefined;
  state?: (control: IAbstractControl & IBoundControl) => Subscription | Subscription[] | undefined;
  touched?: (control: IAbstractControl & IBoundControl) => Subscription | Subscription[] | undefined;
  visited?: (control: IAbstractControl & IBoundControl) => Subscription | Subscription[] | undefined;
  valid?: (control: IAbstractControl & IBoundControl) => Subscription | Subscription[] | undefined;
  disabled?: (control: IAbstractControl & IBoundControl) => Subscription | Subscription[] | undefined;
  readonly?: (control: IAbstractControl & IBoundControl) => Subscription | Subscription[] | undefined;
}

let ACTIVE_CONFIG = DEFAULT_CONFIG;

export function ApplyConfig<T extends IAbstractControl & IBoundControl>(control: T, config: ControlConfig = ACTIVE_CONFIG) {
  const subs: Subscription[] = [];
  control.onDispose(() => subs.forEach(s => s.unsubscribe()));

  for (const key in config) {
    const fn = config[key as keyof typeof config] as (control: IAbstractControl & IBoundControl) => Subscription | Subscription[] | undefined;

    const output = fn(control);
    if (output) {
      if (Array.isArray(output))
        subs.push(...output);
      else
        subs.push(output);
    }
  }
}

export function SetConfig(config: ControlConfig) {
  ACTIVE_CONFIG = config;
}