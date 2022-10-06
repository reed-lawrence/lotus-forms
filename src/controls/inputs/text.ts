import { IInputControlArgs, InputControlAbstract } from "./input-control";
import { filter, map, fromEvent } from 'rxjs';
import { IInputMask } from "../../internal/input-mask";

export interface ITextInputControlArgs<T = string> extends IInputControlArgs<T> {
  mask?: IInputMask;
}

export class TextInputControl<T = string> extends InputControlAbstract<T> {

  constructor(args: ITextInputControlArgs<T>) {
    super(args);

    const { ele } = this;
    const { mask } = args;

    if (mask) {

      this.onDispose(() => mask.unbind());

      let raw: T | undefined;
      const { set } = mask.bind({
        element: ele, onMask: ({ detail }) => {
          raw = detail.raw;
          this.value = detail.raw as T;
        }
      });

      this._subs.push(

        // Value changes on control
        this.$value.pipe(
          filter(value => value !== raw)
        ).subscribe({
          next: (value) => {
            set(value);
          }
        })

      );
    }

    // If there is no mask, bind to the events as normal
    else {
      this._subs.push(
        this.$value.pipe(
          filter((value: unknown) => value !== ele.value),
        ).subscribe({
          next: (value) => {
            ele.value = value as string;
          }
        }),

        fromEvent(ele, 'input').pipe(
          map(() => ele.value),
        ).subscribe({
          next: (value) => {
            (this.value as unknown) = value;
          }
        })
      );
    }
  }

}