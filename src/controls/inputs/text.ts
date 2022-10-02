import { IInputControlArgs, InputControlAbstract } from "./input-control";
import { filter, map, fromEvent, tap } from 'rxjs';

export interface ITextInputControlArgs extends IInputControlArgs<string> {
  mask?: (value: string) => string;
}

export class TextInputControl extends InputControlAbstract<string> {

  constructor(args: ITextInputControlArgs) {
    super(args);

    const { ele } = this;

    this._subs.push(

      this.$value.pipe(
        filter((value) => value !== ele.value),
        map((value) => args.mask ? args.mask(value) : value),
      ).subscribe({
        next: (value) => {
          ele.value = value;
        }
      }),

      fromEvent(ele, 'input').pipe(
        map(() => ele.value),
        filter((value) => value !== this.value),
      ).subscribe({
        next: (value) => {
          if (args.mask) {
            const masked = args.mask(value);

            if (value !== masked) {
              ele.value = masked;
              value = masked;
            }
          }

          this.value = value;
        }
      })
    );
  }

}