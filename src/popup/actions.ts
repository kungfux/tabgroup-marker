import type { Category } from '../shared/categories';
import browser from '../shared/browser';
import { assignCategory, deleteGroup, ungroup } from '../shared/tab-groups';
import type { PopupState } from './state';

export async function runAndClose(
  action: () => Promise<unknown>,
  errorMessage: string,
): Promise<void> {
  try {
    await action();
    window.close();
  } catch (error) {
    console.error(errorMessage, error);
  }
}

export interface PopupActions {
  deleteActiveGroup: () => Promise<void>;
  ungroupActiveGroup: () => Promise<void>;
  pickCategory: (category: Category) => Promise<void>;
  openSettings: () => Promise<void>;
}

export function createActions({
  activeGroupId,
  categories,
}: PopupState): PopupActions {
  return {
    deleteActiveGroup: () =>
      runAndClose(
        () => deleteGroup(activeGroupId),
        'Could not delete the tab group.',
      ),
    ungroupActiveGroup: () =>
      runAndClose(
        () => ungroup(activeGroupId),
        'Could not ungroup the tab group.',
      ),
    pickCategory: (category) =>
      runAndClose(
        () => assignCategory(category, categories),
        'Could not update the tab group.',
      ),
    openSettings: () =>
      runAndClose(
        () => browser.runtime.openOptionsPage(),
        'Could not open the options page.',
      ),
  };
}
