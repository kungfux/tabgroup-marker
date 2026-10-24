import { faPlus, faRecycle } from '@fortawesome/free-solid-svg-icons';
import {
  loadCategories,
  removeCategories,
  type Category,
} from '../../shared/categories';
import { iconNode, listen } from '../../shared/dom';
import type { CategoryStore } from './store';
import type { Notify } from './toast';
import { TabGroupColor } from '../../shared/colors';

const DEFAULT_COLOR: TabGroupColor = 'blue';

export function updateResetButton(categories: readonly Category[]): void {
  const resetButton =
    document.querySelector<HTMLButtonElement>('#category-reset');
  if (resetButton) resetButton.disabled = categories.length > 0;
}

export function setupToolbar(
  store: CategoryStore,
  list: HTMLElement,
  notify: Notify,
): void {
  const addButton = document.querySelector<HTMLButtonElement>('#category-add');
  const resetButton =
    document.querySelector<HTMLButtonElement>('#category-reset');

  function addCategory(): void {
    store.add({
      id: crypto.randomUUID(),
      name: '',
      emoji: '',
      color: DEFAULT_COLOR,
    });

    const emojiInput = list.querySelector<HTMLInputElement>(
      '.category-row:last-child .emoji-input',
    );
    if (emojiInput) requestAnimationFrame(() => emojiInput.focus());
  }

  async function resetCategories(): Promise<void> {
    try {
      await removeCategories();
      store.replaceAll(await loadCategories());
      updateResetButton(store.categories);
    } catch (error) {
      console.error('Could not reset categories.', error);
      notify('Could not reset categories.', 'error');
    }
  }

  if (addButton) {
    addButton.prepend(iconNode(faPlus));
    addButton.setAttribute('aria-label', 'Add category');
    listen(addButton, 'click', addCategory);
  }

  if (resetButton) {
    resetButton.prepend(iconNode(faRecycle));
    resetButton.setAttribute('aria-label', 'Reset categories');
    listen(resetButton, 'click', resetCategories);
  }
}
