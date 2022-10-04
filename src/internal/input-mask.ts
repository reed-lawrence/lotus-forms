export const Masks = Object.freeze({
  Date: '99/99/9999',
  DateTime: '99/99/9999 99:99:99',
  DateTimeShort: '99/99/9999 99:99',
  Time: '99:99:99',
  TimeShort: '99:99',
  Ssn: '999-99-9999',
  Phone: '(999) 999-9999'
});

const Keys = {
  '0': { code: 48, key: 'Digit0' },
  '1': { code: 49, key: 'Digit1' },
  '2': { code: 50, key: 'Digit2' },
  '3': { code: 51, key: 'Digit3' },
  '4': { code: 52, key: 'Digit4' },
  '5': { code: 53, key: 'Digit5' },
  '6': { code: 54, key: 'Digit6' },
  '7': { code: 55, key: 'Digit7' },
  '8': { code: 56, key: 'Digit8' },
  '9': { code: 57, key: 'Digit9' },
  numpad_0: { code: 96, key: 'Numpad0' },
  numpad_1: { code: 97, key: 'Numpad1' },
  numpad_2: { code: 98, key: 'Numpad2' },
  numpad_3: { code: 99, key: 'Numpad3' },
  numpad_4: { code: 100, key: 'Numpad4' },
  numpad_5: { code: 101, key: 'Numpad5' },
  numpad_6: { code: 102, key: 'Numpad6' },
  numpad_7: { code: 103, key: 'Numpad7' },
  numpad_8: { code: 104, key: 'Numpad8' },
  numpad_9: { code: 105, key: 'Numpad9' },
  A: { code: 65, key: 'KeyA' },
  B: { code: 66, key: 'KeyB' },
  C: { code: 67, key: 'KeyC' },
  D: { code: 68, key: 'KeyD' },
  E: { code: 69, key: 'KeyE' },
  F: { code: 70, key: 'KeyF' },
  G: { code: 71, key: 'KeyG' },
  H: { code: 72, key: 'KeyH' },
  I: { code: 73, key: 'KeyI' },
  J: { code: 74, key: 'KeyJ' },
  K: { code: 75, key: 'KeyK' },
  L: { code: 76, key: 'KeyL' },
  M: { code: 77, key: 'KeyM' },
  N: { code: 78, key: 'KeyN' },
  O: { code: 79, key: 'KeyO' },
  P: { code: 80, key: 'KeyP' },
  Q: { code: 81, key: 'KeyQ' },
  R: { code: 82, key: 'KeyR' },
  S: { code: 83, key: 'KeyS' },
  T: { code: 84, key: 'KeyT' },
  U: { code: 85, key: 'KeyU' },
  V: { code: 86, key: 'KeyV' },
  W: { code: 87, key: 'KeyW' },
  X: { code: 88, key: 'KeyX' },
  Y: { code: 89, key: 'KeyY' },
  Z: { code: 90, key: 'KeyZ' },
  asterisk: { code: 42, key: '*' },
  backSpace: { code: 8, key: 'Backspace' },
  tab: { code: 9, key: 'Tab' },
  delete: { code: 46, key: 'Delete' },
  left: { code: 37, key: 'ArrowLeft' },
  right: { code: 39, key: 'ArrowRight' },
  end: { code: 35, key: 'End' },
  home: { code: 36, key: 'Home' },
  shift_left: { code: 16, key: 'ShiftLeft' },
  shift_right: { code: 16, key: 'ShiftRight' },
  enter: { code: 13, key: 'Enter' },
  control_left: { code: 17, key: 'ControlLeft' },
  control_right: { code: 17, key: 'ControlRight' },
  escape: { code: 27, key: 'Escape' },
  space: { code: 32, key: 'Space' }
} as const;

const KeyCodes = Object.fromEntries(
  Object.entries(Keys).map(([key, value]) => [value.key, value.code])
);

const KEYS_CUT_COPY_PASTE = new Set<number>([Keys.C.code, Keys.X.code, Keys.V.code]);
const KEYS_MOVEMENT = new Set<number>([Keys.left.code, Keys.right.code, Keys.tab.code]);

enum DataType {
  Date = 1,
  DateTime,
  DateTimeShort,
  Time,
  TimeShort,
}

const formatCharacters = ['-', '_', '(', ')', '[', ']', ':', '.', ',', '$', '%', '@', ' ', '/'] as const;
const formatCharacters_unicode = formatCharacters.map(o => o.charCodeAt(0));

const maskCharacters = ['A', '9', '*'] as const;

type MaskCharacter = typeof maskCharacters[number];
type FormatCharacter = typeof formatCharacters[number];

function isMaskCharacter(value: any): value is MaskCharacter {
  return value === 'A' || value === '9' || value === '*';
}

function isFormatCharacter(value: any): value is FormatCharacter {
  if (typeof value === 'string')
    return formatCharacters.includes(value as FormatCharacter);
  else
    return formatCharacters_unicode.includes(value);
}

function isCutCopyPasteKey(code: number) {
  return KEYS_CUT_COPY_PASTE.has(code);
}

const isNumericChar = (() => {

  const ll1 = Keys['0'].code;
  const ul1 = Keys['9'].code;
  const ll2 = Keys.numpad_0.code;
  const ul2 = Keys.numpad_9.code;

  return (code: number) => {
    const result = (code >= ll1 && code <= ul1) || (code >= ll2 && code <= ul2);
    console.log(code, 'is numeric');
    return result;
  };

})();

const isAlphabeticChar = (() => {

  const ll = Keys.A.code;
  const ul = Keys.Z.code;

  return (code: number) => code >= ll && code <= ul;

})();

interface IInputMaskArgs {
  mask: string;
  forceUpper: boolean;
  forceLower: boolean;
  useEnterKey: boolean;
  validateDataType: boolean;
  dataType: DataType;
  placeHolder: string;
}

export class InputMask {
  originalValue = '';
  mask: (MaskCharacter | FormatCharacter)[] = [];
  mask_keyCodes: number[] = [];
  hasMask = false;
  forceUpper = false;
  forceLower = false;
  useEnterKey = false;
  validateDataType = false;
  dataType: DataType = 0;

  constructor(elements: HTMLInputElement[], options: Partial<IInputMaskArgs>) {
    if (!elements || !options) {
      return;
    }

    if (options.mask && options.mask.length > 0) {
      this.mask = options.mask.split('') as (MaskCharacter | FormatCharacter)[];
      this.mask_keyCodes = this.mask.map(str => str.charCodeAt(0));
      this.hasMask = true;
    }

    if (options.forceUpper) {
      this.forceUpper = options.forceUpper;
    }

    if (options.forceLower) {
      this.forceLower = options.forceLower;
    }

    if (options.validateDataType) {
      this.validateDataType = options.validateDataType;
    }

    if (options.dataType) {
      this.dataType = options.dataType;
    }

    if (options.useEnterKey) {
      this.useEnterKey = options.useEnterKey;
    }

    for (const element of elements) {

      element.addEventListener('keydown', (event) => {
        console.log(event);
        if (!element.getAttribute('readonly'))
          this.onKeyDown(element, event);
      });

      element.addEventListener('paste', (event) => {
        if (!element.getAttribute('readonly'))
          this.onPaste(element, event, undefined);
      });
      if (options.placeHolder) {
        element.setAttribute('placeholder', options.placeHolder);
      }

      if (element.value.length > 0 && this.hasMask) {
        this.formatWithMask(element);
      }
    }

    document.documentElement.scrollTop = 0;
  }

  between(x: DataType, a: DataType, b: DataType) {
    return x && a && b && x >= a && x <= b;
  }

  parseDate(value: string) {
    var now = new Date();

    var date = new Date(Date.UTC(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      now.getHours(),
      now.getMinutes(),
      now.getSeconds()
    ));

    if (value) {
      if (this.between(this.dataType, 1, 3)) {
        var tempDate = new Date(value);

        if (!isNaN(tempDate.getTime())) {
          date = new Date(Date.UTC(
            tempDate.getFullYear(),
            tempDate.getMonth(),
            tempDate.getDate(),
            tempDate.getHours(),
            tempDate.getMinutes(),
            tempDate.getSeconds()
          ));
        }
      } else {
        var timeSegments = value.split(':');

        var utcHours = timeSegments.length > 0 ? Number(timeSegments[0]) : 0;
        var utcMinutes = timeSegments.length > 1 ? Number(timeSegments[1]) : 0;
        var utcSeconds = timeSegments.length > 2 ? Number(timeSegments[2]) : 0;

        date.setUTCHours(utcHours, utcMinutes, utcSeconds);
      }
    }

    return date;
  }

  getFormattedDateTime(value: string) {
    var date = this.parseDate(value);

    var day = date.getUTCDate() < 10 ? '0' + date.getUTCDate() : date.getUTCDate();
    var month = (date.getUTCMonth() + 1) < 10 ? '0' + (date.getUTCMonth() + 1) : (date.getUTCMonth() + 1);
    var year = date.getUTCFullYear();
    var hours = date.getUTCHours() < 10 ? '0' + date.getUTCHours() : date.getUTCHours();
    var minutes = date.getUTCMinutes() < 10 ? '0' + date.getUTCMinutes() : date.getUTCMinutes();
    var seconds = date.getUTCSeconds() < 10 ? '0' + date.getUTCSeconds() : date.getUTCSeconds();

    switch (this.dataType) {
      case DataType.Date:
        return month + '/' + day + '/' + year;
      case DataType.DateTime:
        return month + '/' + day + '/' + year + ' ' + hours + ':' + minutes + ':' + seconds;
      case DataType.DateTimeShort:
        return month + '/' + day + '/' + year + ' ' + hours + ':' + minutes;
      case DataType.Time:
        return hours + ':' + minutes + ':' + seconds;
      case DataType.TimeShort:
        return hours + ':' + minutes;
      default:
        return '';
    }
  }

  getCursorPosition(element: HTMLInputElement) {
    return element.selectionEnd || 0;
  }

  isValidCharacter(keyCode: number, cursorPosition: number) {

    let next = this.getNextValidCharacters(cursorPosition);

    const valid = next.includes('*') ||
      next.includes('9') && isNumericChar(keyCode) ||
      next.includes('A') && isAlphabeticChar(keyCode) ||
      (next[0] || '').charCodeAt(0) === keyCode;

    if (keyCode === next[0].charCodeAt(0))
      next = [next[0]];

    return { valid, next };
  }

  getNextValidCharacters(cursorPosition: number) {
    const output: (FormatCharacter | MaskCharacter)[] = [];

    let maskCharFound = false;

    for (let i = cursorPosition; i < this.mask.length; i++) {
      const next = this.mask[i];

      if (!maskCharFound && isFormatCharacter(next))
        output.push(next);

      if (!maskCharFound && isMaskCharacter(next))
        maskCharFound = !!output.push(next);
    }

    return output;
  }

  setCursorPosition(element: HTMLInputElement, index: number) {
    if (element) {
      if (element.selectionStart) {
        element.focus();

        element.setSelectionRange(index, index);
      } else {
        element.focus();
      }
    }
  }

  insertCharacterAtIndex(element: HTMLInputElement, index: number, character: string) {
    const newElementValue = element.value.slice(0, index) + character + element.value.slice(index);

    element.value = newElementValue;

    if (element.value.length > 0)
      this.setCursorPosition(element, index + 1);
    else
      element.focus();

    return element.value;
  }

  onKeyDown(element: HTMLInputElement, event: KeyboardEvent) {

    const { dataType, mask, useEnterKey, hasMask, forceLower, forceUpper } = this;

    let keyCode = (event.key.length > 1 ? KeyCodes[event.key] : event.key.toUpperCase().charCodeAt(0)) || 0;
    console.log(keyCode, event.key);

    const isBackspace = Keys.backSpace.code === keyCode;
    const isDelete = Keys.delete.code === keyCode;

    if (event.ctrlKey || event.metaKey || KEYS_MOVEMENT.has(keyCode) || isBackspace || isDelete)
      return;

    if (dataType && useEnterKey && keyCode === Keys.enter.code) {
      if (dataType >= 1 && dataType <= 5) {
        element.value = this.getFormattedDateTime(element.value);
      }

      event.preventDefault();

      return;
    }

    if (element.value.length === mask.length) {
      event.preventDefault();

      return;
    }

    // if (hasMask)
    //   this.checkAndInsertMaskCharacters(element, cursorPosition);

    const { valid, next } = this.isValidCharacter(keyCode, this.getCursorPosition(element));

    if (valid) {

      let { value } = element;

      for (const [i, char] of next.entries()) {
        console.log(value);
        if (isFormatCharacter(char)) {
          value = this.insertCharacterAtIndex(element, this.getCursorPosition(element), char);
        }
        else {
          if (keyCode >= Keys.numpad_0.code && keyCode <= Keys.numpad_9.code)
            keyCode -= 48;

          let character = event.shiftKey
            ? String.fromCharCode(keyCode).toUpperCase()
            : String.fromCharCode(keyCode).toLowerCase();

          if (forceUpper)
            character = character.toUpperCase();

          if (forceLower)
            character = character.toLowerCase();

          value = this.insertCharacterAtIndex(element, this.getCursorPosition(element), character);
        }
      }

      // if (hasMask)
      //   this.checkAndInsertMaskCharacters(element, this.getCursorPosition(element));

    }

    event.preventDefault();

    return;
  }

  onPaste(element: HTMLInputElement, event?: ClipboardEvent, data?: string) {

    event?.preventDefault();

    var pastedText = '';

    if (!!data && data !== '')
      pastedText = data;
    else if (!!event && event.clipboardData)
      pastedText = event.clipboardData.getData('text/plain');

    if (pastedText != null && pastedText !== '') {
      for (var j = 0; j < formatCharacters.length; j++) {
        pastedText.replace(formatCharacters[j], '');
      }

      for (var i = 0; i < pastedText.length; i++) {

        if (isFormatCharacter(pastedText[i]))
          continue;

        const keyDownEvent = new KeyboardEvent('keydown', {
          bubbles: true,
          cancelable: true,
          key: pastedText[i]
        });

        this.onKeyDown(element, keyDownEvent);

      }
    }

    return false;
  };

  formatWithMask(element: HTMLInputElement) {
    var value = element.value;

    if (this.between(this.dataType, 1, 5)) {
      value = this.getFormattedDateTime(element.value);
    }

    element.value = '';

    if (value != null && value !== '') {
      this.onPaste(element, undefined, value);
    }
  }

}


export class CurrencyMask {

  locale: string;
  currency: string;
  element: HTMLInputElement;
  decimals: number

  numeric_value: number = 0;

  constructor({
    currency,
    locale,
    element,
    decimals }: { currency?: string; locale?: string; decimals?: number; element: HTMLInputElement; }) {

    this.currency = currency || 'USD';
    this.locale = locale || 'en-US';
    this.decimals = decimals! >= 0 ? decimals! : 2;


    this.element = element;

    this.element.addEventListener('keydown', (event) => this.keydown(event, this.element));
  }

  toNumber(value: string) {
    const int = parseInt((String(value).match(/[0-9]/g) || []).join('') || '0');

    if (this.decimals)
      return int / Math.pow(10, this.decimals);
    else
      return int;
  }

  toCurrency(value: number) {
    return value.toLocaleString(this.locale, {
      style: 'currency',
      currency: this.currency,
      minimumFractionDigits: this.decimals,
      maximumFractionDigits: this.decimals
    }) || '';
  }

  setCursorPosition(element: HTMLInputElement, index: number) {
    if (element) {
      if (element.selectionStart) {
        element.focus();

        element.setSelectionRange(index, index);
      } else {
        element.focus();
      }
    }
  }

  keydown(event: KeyboardEvent, element: HTMLInputElement) {

    if (event.ctrlKey || event.metaKey || KEYS_MOVEMENT.has(KeyCodes[event.key]))
      return;

    event.preventDefault();

    let cursorPosition = element.selectionEnd || 0;
    const cursorIsAtEnd = cursorPosition === element.value.length;

    if (event.key === Keys.backSpace.key) {

      let prevNumIndex = (() => {
        for (let i = cursorPosition - 1; i > 0; i--) {
          if (!isNaN(Number(element.value[i])))
            return i;
        }

        return 0;
      })();

      const removed = element.value.slice(0, prevNumIndex) + element.value.slice(cursorPosition);

      console.log(removed, element.value.slice(0, prevNumIndex), element.value.slice(cursorPosition), cursorPosition);

      element.value = this.toCurrency(this.toNumber(removed));

      if (!cursorIsAtEnd)
        this.setCursorPosition(element, prevNumIndex);

    }

    if (event.key === Keys.backSpace.key || event.key === Keys.delete.key) {


    }

    else {
      const num = Number(event.key);

      if (isNaN(num))
        return;

      console.log('cursorPosition', element.selectionEnd || 0, element.value.length);
      const orig = String(element.value);

      const mod = orig.slice(0, cursorPosition) + String(num) + orig.slice(cursorPosition);
      const mod_num = this.toNumber(mod);

      element.value = this.toCurrency(mod_num);

      // If it's at the end, then we don't have to do any comparison to decide where to place the cursor
      if (cursorPosition !== 0 && cursorPosition !== (orig.length)) {

        let slice = String(num) + orig.slice(cursorPosition);
        let sliceNum = this.toCurrency(this.toNumber(slice)).slice(1);
        console.log(slice, sliceNum);
        this.setCursorPosition(element, element.value.indexOf(sliceNum) + 1);
      }

      // const value = String(element.value);

      // const str = value.slice(0, cursorPosition) + String(num) + value.slice(cursorPosition);

      // console.log(value);
      // console.log(element.value);
      // console.log(cursorPosition);

      // const arr = Array.from(value);
      // const arr2 = Array.from(element.value);
      // const diffs = arr.reduceRight((sum, char, i) => {
      //   if (i < 3 && arr2[i] !== arr[i])
      //     return sum + 1;
      //   return sum;
      // }, 0);

      // console.log(diffs);

      // if (cursorPosition === 0 || cursorPosition === value.length)
      //   this.setCursorPosition(element, element.value.length);
      // else
      //   this.setCursorPosition(element, cursorPosition + diffs + 1);
    }
  }
}