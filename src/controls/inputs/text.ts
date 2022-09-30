import { IInputControlArgs, InputControlAbstract } from "./input-control";
import { filter, map, fromEvent } from 'rxjs';

export interface ITextInputControlArgs extends IInputControlArgs<string> { }

export class TextInputControl extends InputControlAbstract<string> {

  constructor(args: ITextInputControlArgs) {
    super(args);

    const { ele } = this;

    this._subs.push(

      this.$value.pipe(
        filter((value) => value !== ele.value)
      ).subscribe({
        next: (value) => {
          ele.value = value;
        }
      }),

      fromEvent(ele, 'input').pipe(
        filter(() => ele.value !== this.value),
        map(() => ele.value)
      ).subscribe({
        next: (value) => {
          this.value = value;
        }
      })
    );
  }

}