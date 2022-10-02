export const Masks = Object.freeze({
  Date: "99/99/9999",
  DateTime: "99/99/9999 99:99:99",
  DateTimeShort: "99/99/9999 99:99",
  Time: "99:99:99",
  TimeShort: "99:99",
  Ssn: "999-99-9999",
  Phone: "(999) 999-9999"
});

const Keys = Object.freeze({
  asterisk: 42,
  zero: 48,
  nine: 57,
  a: 65,
  z: 90,
  backSpace: 8,
  tab: 9,
  delete: 46,
  left: 37,
  right: 39,
  end: 35,
  home: 36,
  numberPadZero: 96,
  numberPadNine: 105,
  shift: 16,
  enter: 13,
  control: 17,
  escape: 27,
  v: 86,
  c: 67,
  x: 88
});

enum DataType {
  Date = 1,
  DateTime,
  DateTimeShort,
  Time,
  TimeShort,
}

const formatCharacters = ["-", "_", "(", ")", "[", "]", ":", ".", ",", "$", "%", "@", " ", "/"];
const maskCharacters = ["A", "9", "*"];

export class InputMask {
  originalValue = '';
  mask = '';
  hasMask = false;
  forceUpper = false;
  forceLower = false;
  useEnterKey = false;
  validateDataType = false;
  dataType: DataType;

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
        var timeSegments = value.split(":");

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

    var day = date.getUTCDate() < 10 ? "0" + date.getUTCDate() : date.getUTCDate();
    var month = (date.getUTCMonth() + 1) < 10 ? "0" + (date.getUTCMonth() + 1) : (date.getUTCMonth() + 1);
    var year = date.getUTCFullYear();
    var hours = date.getUTCHours() < 10 ? "0" + date.getUTCHours() : date.getUTCHours();
    var minutes = date.getUTCMinutes() < 10 ? "0" + date.getUTCMinutes() : date.getUTCMinutes();
    var seconds = date.getUTCSeconds() < 10 ? "0" + date.getUTCSeconds() : date.getUTCSeconds();

    switch (this.dataType) {
      case DataType.Date:
        return month + "/" + day + "/" + year;
      case DataType.DateTime:
        return month + "/" + day + "/" + year + " " + hours + ":" + minutes + ":" + seconds;
      case DataType.DateTimeShort:
        return month + "/" + day + "/" + year + " " + hours + ":" + minutes;
      case DataType.Time:
        return hours + ":" + minutes + ":" + seconds;
      case DataType.TimeShort:
        return hours + ":" + minutes;
      default:
        return "";
    }
  }

  getCursorPosition(element: HTMLInputElement) {
    return element.selectionEnd || 0;
  }

  isValidCharacter(keyCode: number, maskCharacter: string) {
    var maskCharacterCode = maskCharacter.charCodeAt(0);

    if (maskCharacterCode === Keys.asterisk) {
      return true;
    }

    var isNumber = (keyCode >= Keys.zero && keyCode <= Keys.nine) ||
      (keyCode >= Keys.numberPadZero && keyCode <= Keys.numberPadNine);

    if (maskCharacterCode === Keys.nine && isNumber) {
      return true;
    }

    if (maskCharacterCode === Keys.a && keyCode >= Keys.a && keyCode <= Keys.z) {
      return true;
    }

    return false;
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

  removeCharacterAtIndex(element: HTMLInputElement, index: number) {
    if (element.value.length > 0) {
      var newElementValue = element.value.slice(0, index) + element.value.slice(index + 1);

      element.value = newElementValue;

      if (element.value.length > 0)
        this.setCursorPosition(element, index);
      else
        element.focus();
    }
  }

  insertCharacterAtIndex(element: HTMLInputElement, index: number, character: string) {
    var newElementValue = element.value.slice(0, index) + character + element.value.slice(index);

    element.value = newElementValue;

    if (element.value.length > 0)
      this.setCursorPosition(element, index + 1);
    else
      element.focus();
  }

  checkAndInsertMaskCharacters(element: HTMLInputElement, index: number) {
    const { mask } = this;

    while (true) {
      var isMaskCharacter = formatCharacters.indexOf(mask[index]) > -1;

      var maskAlreadyThere = element.value.charAt(index) === mask[index];

      if (isMaskCharacter && !maskAlreadyThere)
        this.insertCharacterAtIndex(element, index, mask[index]);
      else
        return;

      index += 1;
    }
  }

  checkAndRemoveMaskCharacters(element: HTMLInputElement, index: number, keyCode: number) {
    if (element.value.length > 0) {
      while (true) {

        var character = element.value.charAt(index);

        var isMaskCharacter = formatCharacters.indexOf(character) > -1;

        if (!isMaskCharacter || index === 0 || index === element.value.length)
          return;

        this.removeCharacterAtIndex(element, index);

        if (keyCode === Keys.backSpace)
          index -= 1;


        if (keyCode === Keys.delete)
          index += 1;
      }
    }
  }

  validateDataEqualsDataType(element: HTMLInputElement) {
    if (element == null || element.value === "") {
      return;
    }

    var date = this.parseDate(element.value);

    if (this.between(this.dataType, 1, 3)) {
      if (isNaN(date.getDate()) || date.getFullYear() <= 1000) {
        element.value = "";

        return;
      }
    }

    if (this.dataType > 1) {
      if (isNaN(date.getTime())) {
        element.value = "";

        return;
      }
    }
  }

  onLostFocus(element: HTMLInputElement) {

    const { mask } = this;

    if (element.value.length > 0) {
      if (element.value.length !== mask.length) {
        element.value = "";

        return;
      }

      for (var i = 0; i < element.value.length; i++) {
        var elementCharacter = element.value.charAt(i);
        const elementCharacterCharCode = elementCharacter.charCodeAt(0);

        var maskCharacter = mask[i];
        const maskCharacterCode = maskCharacter.charCodeAt(0);

        if (maskCharacters.indexOf(maskCharacter) > -1) {
          if (elementCharacter === maskCharacter || maskCharacterCode === Keys.asterisk) {
            continue;
          } else {
            element.value = "";

            return;
          }
        } else {
          if (maskCharacterCode === Keys.a) {
            if (elementCharacterCharCode <= Keys.a || elementCharacterCharCode >= Keys.z) {
              element.value = "";

              return;
            }
          } else if (maskCharacterCode === Keys.nine) {
            if (elementCharacterCharCode <= Keys.zero || elementCharacterCharCode >= Keys.nine) {
              element.value = "";

              return;
            }
          }
        }
      }

      if (this.validateDataType && this.dataType) {
        this.validateDataEqualsDataType(element);
      }
    }
  }

  onKeyDown(element: HTMLInputElement, event: KeyboardEvent) {

    const { dataType, mask, useEnterKey, hasMask, forceLower, forceUpper } = this;

    var key = event.key.charCodeAt(0);

    var copyCutPasteKeys = [Keys.v, Keys.c, Keys.x].indexOf(key) > -1 && event.ctrlKey;

    var movementKeys = [Keys.left, Keys.right, Keys.tab].indexOf(key) > -1;

    var modifierKeys = event.ctrlKey || event.shiftKey;

    if (copyCutPasteKeys || movementKeys || modifierKeys) {

      return true;
    }

    if (element.selectionStart === 0 && element.selectionEnd === element.value.length) {
      this.originalValue = element.value;

      element.value = "";
    }

    if (key === Keys.escape) {
      if (this.originalValue !== "") {
        element.value = this.originalValue;
      }

      return true;
    }

    if (key === Keys.backSpace || key === Keys.delete) {
      if (key === Keys.backSpace) {
        this.checkAndRemoveMaskCharacters(element, this.getCursorPosition(element) - 1, key);

        this.removeCharacterAtIndex(element, this.getCursorPosition(element) - 1);
      }

      if (key === Keys.delete) {
        this.checkAndRemoveMaskCharacters(element, this.getCursorPosition(element), key);

        this.removeCharacterAtIndex(element, this.getCursorPosition(element));
      }

      event.preventDefault();

      return false;
    }

    if (dataType && useEnterKey && key === Keys.enter) {
      if (dataType >= 1 && dataType <= 5) {
        element.value = this.getFormattedDateTime(element.value);
      }

      event.preventDefault();

      return false;
    }

    if (element.value.length === mask.length) {
      event.preventDefault();

      return false;
    }

    if (hasMask) {
      this.checkAndInsertMaskCharacters(element, this.getCursorPosition(element));
    }

    if (this.isValidCharacter(key, mask[this.getCursorPosition(element)])) {
      if (key >= Keys.numberPadZero && key <= Keys.numberPadNine) {
        key = key - 48;
      }

      var character = event.shiftKey
        ? String.fromCharCode(key).toUpperCase()
        : String.fromCharCode(key).toLowerCase();

      if (forceUpper) {
        character = character.toUpperCase();
      }

      if (forceLower) {
        character = character.toLowerCase();
      }

      this.insertCharacterAtIndex(element, this.getCursorPosition(element), character);

      if (hasMask) {
        this.checkAndInsertMaskCharacters(element, this.getCursorPosition(element));
      }
    }

    event.preventDefault();

    return false;
  }


}

// var InputMask1 = (function () {
//   "use strict";


//   var originalValue = "";

//   var mask = null;

//   var hasMask = false;

//   var forceUpper = false;

//   var forceLower = false;

//   var useEnterKey = false;

//   var validateDataType = false;

//   var dataType = null;

//   var keys = {
//     asterisk: 42,
//     zero: 48,
//     nine: 57,
//     a: 65,
//     z: 90,
//     backSpace: 8,
//     tab: 9,
//     delete: 46,
//     left: 37,
//     right: 39,
//     end: 35,
//     home: 36,
//     numberPadZero: 96,
//     numberPadNine: 105,
//     shift: 16,
//     enter: 13,
//     control: 17,
//     escape: 27,
//     v: 86,
//     c: 67,
//     x: 88
//   };

//   var between = function (x, a, b) {
//     return x && a && b && x >= a && x <= b;
//   };

//   var parseDate = function (value) {
//     var now = new Date();

//     var date = new Date(Date.UTC(
//       now.getFullYear(),
//       now.getMonth(),
//       now.getDate(),
//       now.getHours(),
//       now.getMinutes(),
//       now.getSeconds()
//     ));

//     if (value) {
//       if (between(dataType, 1, 3)) {
//         var tempDate = new Date(value);

//         if (!isNaN(tempDate.getTime())) {
//           date = new Date(Date.UTC(
//             tempDate.getFullYear(),
//             tempDate.getMonth(),
//             tempDate.getDate(),
//             tempDate.getHours(),
//             tempDate.getMinutes(),
//             tempDate.getSeconds()
//           ));
//         }
//       } else {
//         var timeSegments = value.split(":");

//         var utcHours = timeSegments.length > 0 ? timeSegments[0] : 0;
//         var utcMinutes = timeSegments.length > 1 ? timeSegments[1] : 0;
//         var utcSeconds = timeSegments.length > 2 ? timeSegments[2] : 0;

//         date.setUTCHours(utcHours, utcMinutes, utcSeconds);
//       }
//     }

//     return date;
//   };

//   var getFormattedDateTime = function (value) {
//     var date = parseDate(value);

//     var day = date.getUTCDate() < 10 ? "0" + date.getUTCDate() : date.getUTCDate();
//     var month = (date.getUTCMonth() + 1) < 10 ? "0" + (date.getUTCMonth() + 1) : (date.getUTCMonth() + 1);
//     var year = date.getUTCFullYear();
//     var hours = date.getUTCHours() < 10 ? "0" + date.getUTCHours() : date.getUTCHours();
//     var minutes = date.getUTCMinutes() < 10 ? "0" + date.getUTCMinutes() : date.getUTCMinutes();
//     var seconds = date.getUTCSeconds() < 10 ? "0" + date.getUTCSeconds() : date.getUTCSeconds();

//     switch (dataType) {
//       case 1:
//         return month + "/" + day + "/" + year;
//       case 2:
//         return month + "/" + day + "/" + year + " " + hours + ":" + minutes + ":" + seconds;
//       case 3:
//         return month + "/" + day + "/" + year + " " + hours + ":" + minutes;
//       case 4:
//         return hours + ":" + minutes + ":" + seconds;
//       case 5:
//         return hours + ":" + minutes;
//       default:
//         return "";
//     }
//   };

//   var getCursorPosition = function (element) {
//     var position = 0;

//     if (document.selection) {
//       element.focus();

//       var selectRange = document.selection.createRange();

//       selectRange.moveStart("character", -element.value.length);

//       position = selectRange.text.length;
//     } else if (element.selectionStart || element.selectionStart === "0") {
//       position = element.selectionStart;
//     }

//     return position;
//   };

//   var isValidCharacter = function (keyCode, maskCharacter) {
//     var maskCharacterCode = maskCharacter.charCodeAt(0);

//     if (maskCharacterCode === keys.asterisk) {
//       return true;
//     }

//     var isNumber = (keyCode >= keys.zero && keyCode <= keys.nine) ||
//       (keyCode >= keys.numberPadZero && keyCode <= keys.numberPadNine);

//     if (maskCharacterCode === keys.nine && isNumber) {
//       return true;
//     }

//     if (maskCharacterCode === keys.a && keyCode >= keys.a && keyCode <= keys.z) {
//       return true;
//     }

//     return false;
//   };

//   var setCursorPosition = function (element, index) {
//     if (element != null) {
//       if (element.createTextRange) {
//         var range = element.createTextRange();

//         range.move("character", index);

//         range.select();
//       } else {
//         if (element.selectionStart) {
//           element.focus();

//           element.setSelectionRange(index, index);
//         } else {
//           element.focus();
//         }
//       }
//     }
//   };

//   var removeCharacterAtIndex = function (element, index) {
//     if (element.value.length > 0) {
//       var newElementValue = element.value.slice(0, index) + element.value.slice(index + 1);

//       element.value = newElementValue;

//       if (element.value.length > 0) {
//         setCursorPosition(element, index);
//       } else {
//         element.focus();
//       }
//     }
//   };

//   var insertCharacterAtIndex = function (element, index, character) {
//     var newElementValue = element.value.slice(0, index) + character + element.value.slice(index);

//     element.value = newElementValue;

//     if (element.value.length > 0) {
//       setCursorPosition(element, index + 1);
//     } else {
//       element.focus();
//     }
//   };

//   var checkAndInsertMaskCharacters = function (element, index) {
//     while (true) {
//       var isMaskCharacter = formatCharacters.indexOf(mask[index]) > -1;

//       var maskAlreadyThere = element.value.charAt(index) === mask[index];

//       if (isMaskCharacter && !maskAlreadyThere) {
//         insertCharacterAtIndex(element, index, mask[index]);
//       } else {
//         return;
//       }

//       index += 1;
//     }
//   };

//   var checkAndRemoveMaskCharacters = function (element, index, keyCode) {
//     if (element.value.length > 0) {
//       while (true) {
//         var character = element.value.charAt(index);

//         var isMaskCharacter = formatCharacters.indexOf(character) > -1;

//         if (!isMaskCharacter || index === 0 || index === element.value.length) {
//           return;
//         }

//         removeCharacterAtIndex(element, index);

//         if (keyCode === keys.backSpace) {
//           index -= 1;
//         }

//         if (keyCode === keys.delete) {
//           index += 1;
//         }
//       }
//     }
//   };

//   var validateDataEqualsDataType = function (element) {
//     if (element == null || element.value === "") {
//       return;
//     }

//     var date = parseDate(element.value);

//     if (between(dataType, 1, 3)) {
//       if (isNaN(date.getDate()) || date.getFullYear() <= 1000) {
//         element.value = "";

//         return;
//       }
//     }

//     if (dataType > 1) {
//       if (isNaN(date.getTime())) {
//         element.value = "";

//         return;
//       }
//     }
//   }

//   var onLostFocus = function (element) {
//     if (element.value.length > 0) {
//       if (element.value.length !== mask.length) {
//         element.value = "";

//         return;
//       }

//       for (var i = 0; i < element.value; i++) {
//         var elementCharacter = element.value.charAt(i);
//         var maskCharacter = mask[i];

//         if (maskCharacters.indexOf(maskCharacter) > -1) {
//           if (elementCharacter === maskCharacter || maskCharacter.charCodeAt(0) === keys.asterisk) {
//             continue;
//           } else {
//             element.value = "";

//             return;
//           }
//         } else {
//           if (maskCharacter.charCodeAt(0) === keys.a) {
//             if (elementCharacter.charCodeAt(0) <= keys.a || elementCharacter >= keys.z) {
//               element.value = "";

//               return;
//             }
//           } else if (maskCharacter.charCodeAt(0) === keys.nine) {
//             if (elementCharacter.charCodeAt(0) <= keys.zero || elementCharacter >= keys.nine) {
//               element.value = "";

//               return;
//             }
//           }
//         }
//       }

//       if (validateDataType && dataType) {
//         validateDataEqualsDataType(element);
//       }
//     }
//   };

//   var onKeyDown = function (element, event) {
//     var key = event.which;

//     var copyCutPasteKeys = [keys.v, keys.c, keys.x].indexOf(key) > -1 && event.ctrlKey;

//     var movementKeys = [keys.left, keys.right, keys.tab].indexOf(key) > -1;

//     var modifierKeys = event.ctrlKey || event.shiftKey;

//     if (copyCutPasteKeys || movementKeys || modifierKeys) {

//       return true;
//     }

//     if (element.selectionStart === 0 && element.selectionEnd === element.value.length) {
//       originalValue = element.value;

//       element.value = "";
//     }

//     if (key === keys.escape) {
//       if (originalValue !== "") {
//         element.value = originalValue;
//       }

//       return true;
//     }

//     if (key === keys.backSpace || key === keys.delete) {
//       if (key === keys.backSpace) {
//         checkAndRemoveMaskCharacters(element, getCursorPosition(element) - 1, key);

//         removeCharacterAtIndex(element, getCursorPosition(element) - 1);
//       }

//       if (key === keys.delete) {
//         checkAndRemoveMaskCharacters(element, getCursorPosition(element), key);

//         removeCharacterAtIndex(element, getCursorPosition(element));
//       }

//       event.preventDefault();

//       return false;
//     }

//     if (dataType && useEnterKey && key === keys.enter) {
//       if (dataType >= 1 && dataType <= 5) {
//         element.value = getFormattedDateTime();
//       }

//       event.preventDefault();

//       return false;
//     }

//     if (element.value.length === mask.length) {
//       event.preventDefault();

//       return false;
//     }

//     if (hasMask) {
//       checkAndInsertMaskCharacters(element, getCursorPosition(element));
//     }

//     if (isValidCharacter(key, mask[getCursorPosition(element)])) {
//       if (key >= keys.numberPadZero && key <= keys.numberPadNine) {
//         key = key - 48;
//       }

//       var character = event.shiftKey
//         ? String.fromCharCode(key).toUpperCase()
//         : String.fromCharCode(key).toLowerCase();

//       if (forceUpper) {
//         character = character.toUpperCase();
//       }

//       if (forceLower) {
//         character = character.toLowerCase();
//       }

//       insertCharacterAtIndex(element, getCursorPosition(element), character);

//       if (hasMask) {
//         checkAndInsertMaskCharacters(element, getCursorPosition(element));
//       }
//     }

//     event.preventDefault();

//     return false;
//   };

//   var onPaste = function (element, event, data) {
//     var pastedText = "";

//     if (data != null && data !== "") {
//       pastedText = data;
//     } else if (event != null && window.clipboardData && window.clipboardData.getData) {
//       pastedText = window.clipboardData.getData("text");
//     } else if (event != null && event.clipboardData && event.clipboardData.getData) {
//       pastedText = event.clipboardData.getData("text/plain");
//     }

//     if (pastedText != null && pastedText !== "") {
//       for (var j = 0; j < formatCharacters.length; j++) {
//         pastedText.replace(formatCharacters[j], "");
//       }

//       for (var i = 0; i < pastedText.length; i++) {
//         if (formatCharacters.indexOf(pastedText[i]) > -1) {
//           continue;
//         }

//         var keyDownEvent = document.createEventObject ? document.createEventObject() : document.createEvent("Events");

//         if (keyDownEvent.initEvent) {
//           keyDownEvent.initEvent("keydown", true, true);
//         }

//         keyDownEvent.keyCode = keyDownEvent.which = pastedText[i].charCodeAt(0);

//         onKeyDown(element, keyDownEvent);
//       }
//     }

//     return false;
//   };

//   var formatWithMask = function (element) {
//     var value = element.value;

//     if (between(dataType, 1, 5)) {
//       value = getFormattedDateTime(element.value);
//     }

//     element.value = "";

//     if (value != null && value !== "") {
//       onPaste(element, null, value);
//     }
//   };

//   return {
//     Initialize: function (elements, options) {
//       if (!elements || !options) {
//         return;
//       }

//       if (options.mask && options.mask.length > 0) {
//         mask = options.mask.split("");
//         hasMask = true;
//       }

//       if (options.forceUpper) {
//         forceUpper = options.forceUpper;
//       }

//       if (options.forceLower) {
//         forceLower = options.forceLower;
//       }

//       if (options.validateDataType) {
//         validateDataType = options.validateDataType;
//       }

//       if (options.dataType) {
//         dataType = options.dataType;
//       }

//       if (options.useEnterKey) {
//         useEnterKey = options.useEnterKey;
//       }

//       [].forEach.call(elements, function (element) {
//         element.onblur = function () {
//           if (!element.getAttribute("readonly") && hasMask) {
//             return onLostFocus(element);
//           }

//           return true;
//         };

//         element.onkeydown = function (event) {
//           if (!element.getAttribute("readonly")) {
//             return onKeyDown(element, event);
//           }

//           return true;
//         };

//         element.onpaste = function (event) {
//           if (!element.getAttribute("readonly")) {
//             return onPaste(element, event, null);
//           }

//           return true;
//         }

//         if (options.placeHolder) {
//           element.setAttribute("placeholder", options.placeHolder);
//         }

//         if (element.value.length > 0 && hasMask) {
//           formatWithMask(element);
//         }
//       });

//       document.documentElement.scrollTop = 0;
//     }
//   };
// });