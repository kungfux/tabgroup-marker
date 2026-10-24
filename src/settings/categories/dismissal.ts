import { listen } from '../../shared/dom';
import { closeColorMenus } from './color-picker';
import { closeEmojiMenus } from './emoji-picker';

const PICKER_SELECTOR = '.color-picker, .emoji-picker';

/** Closes open pickers when the user clicks or focuses something outside them. */
export function registerPickerDismissal(): void {
  listen(document, 'click', (event) => {
    if (
      event.target instanceof Element &&
      event.target.closest(PICKER_SELECTOR)
    ) {
      return;
    }
    closeColorMenus();
    closeEmojiMenus();
  });

  listen(document, 'focusin', (event) => {
    const focusedPicker =
      event.target instanceof Element
        ? event.target.closest(PICKER_SELECTOR)
        : null;

    closeColorMenus(focusedPicker);
    closeEmojiMenus(focusedPicker);
  });
}
