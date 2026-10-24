import { loadCategories, onCategoriesChanged } from '../../shared/categories';
import { registerPickerDismissal } from './dismissal';
import { setupRows } from './rows';
import { createCategoryStore, type CategoryStore } from './store';
import { createToast } from './toast';
import { setupToolbar, updateResetButton } from './toolbar';

/** Picks up edits made elsewhere (e.g. another settings tab). */
function syncExternalChanges(list: HTMLElement, store: CategoryStore): void {
  onCategoriesChanged((updated) => {
    // Skip updates while editing or when they merely echo our own save.
    if (list.contains(document.activeElement)) return;
    if (JSON.stringify(updated) === JSON.stringify(store.categories)) return;
    store.replaceAll(updated);
    updateResetButton(store.categories);
  });
}

export async function initCategories(): Promise<void> {
  const list = document.getElementById('category-list');
  if (!list) return;

  const notify = createToast();
  const store = createCategoryStore({
    initial: await loadCategories(),
    notify,
    onSaved: () => updateResetButton(store.categories),
  });

  setupToolbar(store, list, notify);
  registerPickerDismissal();
  syncExternalChanges(list, store);
  updateResetButton(store.categories);
  setupRows(list, store);
}
