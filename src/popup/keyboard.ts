import { listen } from '../shared/dom';
import type { PopupActions } from './actions';
import { closeGroupMenus } from './groups-menu';
import type { PopupState } from './state';

const EDITABLE_SELECTOR = 'input, textarea, select, [contenteditable="true"]';

/** Maps a list index to its keyboard shortcut: 0-8 -> "1"-"9", 9 -> "0". */
export function shortcutKey(index: number): string | undefined {
  if (index < 9) return String(index + 1);
  if (index === 9) return '0';
  return undefined;
}

/** Inverse of `shortcutKey`: "1"-"9" -> 0-8, "0" -> 9. */
export function indexForShortcutKey(key: string): number {
  return key === '0' ? 9 : Number(key) - 1;
}

export function registerShortcuts(
  { categories, hasActiveGroup }: PopupState,
  actions: PopupActions,
): void {
  listen(document, 'keydown', async (event) => {
    if (
      event.ctrlKey ||
      event.altKey ||
      event.metaKey ||
      event.shiftKey ||
      !(event.target instanceof Element) ||
      event.target.closest(EDITABLE_SELECTOR)
    ) {
      return;
    }

    switch (event.key) {
      case 'Delete':
        if (hasActiveGroup) await actions.deleteActiveGroup();
        return;
      case 'Backspace':
        if (hasActiveGroup) await actions.ungroupActiveGroup();
        return;
    }

    if (!/^[0-9]$/.test(event.key)) return;

    const category = categories[indexForShortcutKey(event.key)];
    if (!category) return;

    event.preventDefault();
    closeGroupMenus();
    await actions.pickCategory(category);
  });
}
