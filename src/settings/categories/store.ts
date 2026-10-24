import { saveCategories, type Category } from '../../shared/categories';
import type { Notify } from './toast';

const SAVE_DELAY_MS = 300;

type RowCheck = () => boolean;

export interface CategoryStore {
  readonly categories: Category[];
  replaceAll: (next: Category[]) => void;
  add: (category: Category) => void;
  remove: (id: string) => void;
  move: (id: string, targetIndex: number) => void;
  scheduleSave: () => void;
  registerRowCheck: (check: RowCheck) => void;
  onChange: (listener: () => void) => void;
}

interface StoreOptions {
  initial: Category[];
  notify: Notify;
  onSaved: () => void;
}

export function createCategoryStore({
  initial,
  notify,
  onSaved,
}: StoreOptions): CategoryStore {
  let categories = initial;
  let rowChecks: RowCheck[] = [];
  let saveTimer: number | undefined;
  const listeners: (() => void)[] = [];

  function changed(): void {
    rowChecks = [];
    for (const listener of listeners) listener();
  }

  async function saveNow(): Promise<void> {
    // Evaluate every row so all invalid fields get highlighted.
    const valid = rowChecks.map((check) => check()).every(Boolean);
    if (!valid) {
      notify('Fix the highlighted fields to save.', 'warning');
      return;
    }

    try {
      await saveCategories(categories);
      notify('Changes successfully saved.', 'success');
      onSaved();
    } catch (error) {
      console.error('Could not save categories.', error);
      notify('Could not save categories.', 'error');
    }
  }

  function scheduleSave(): void {
    window.clearTimeout(saveTimer);
    saveTimer = window.setTimeout(() => void saveNow(), SAVE_DELAY_MS);
  }

  return {
    get categories() {
      return categories;
    },
    replaceAll(next) {
      categories = next;
      changed();
    },
    add(category) {
      categories.push(category);
      changed();
    },
    remove(id) {
      categories = categories.filter((c) => c.id !== id);
      changed();
      scheduleSave();
    },
    move(id, targetIndex) {
      const from = categories.findIndex((c) => c.id === id);
      if (from < 0 || from === targetIndex) return;
      const [moved] = categories.splice(from, 1);
      if (!moved) return;
      categories.splice(targetIndex, 0, moved);
      changed();
      scheduleSave();
    },
    scheduleSave,
    registerRowCheck(check) {
      rowChecks.push(check);
    },
    onChange(listener) {
      listeners.push(listener);
    },
  };
}
