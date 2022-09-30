import { IInputControlArgs, InputControlAbstract } from "./input-control";
import { filter, map, fromEvent, tap } from 'rxjs';

export interface ICheckboxControlArgs extends IInputControlArgs<boolean> { }

export class CheckboxControl extends InputControlAbstract<boolean> {

  constructor(args: ICheckboxControlArgs) {
    super(args);

    const { ele } = this;

    this._subs.push(

      this.$value.pipe(
        filter((value) => value !== ele.checked)
      ).subscribe({
        next: (value) => {
          ele.checked = value;
        }
      }),

      fromEvent(ele, 'change').pipe(
        filter(() => ele.checked !== this.value),
        map(() => ele.checked)
      ).subscribe({
        next: (value) => {
          this.value = value;
        }
      })
    );
  }

}