import browser from './browser';
import { TabGroupColor, TAB_GROUP_COLORS } from './colors';

export interface Category {
  id: string;
  name: string;
  emoji: string;
  color: TabGroupColor | null;
}

const STORAGE_KEY = 'categories';

const DEFAULT_CATEGORIES: Omit<Category, 'id'>[] = [
  { name: 'Reading', emoji: '📰', color: 'grey' },
  { name: 'Work', emoji: '💼', color: 'blue' },
  { name: 'Video', emoji: '🔴', color: 'red' },
  { name: 'Travel', emoji: '✈️', color: 'yellow' },
  { name: 'Learning', emoji: '📚', color: 'green' },
  { name: 'Personal', emoji: '🏠', color: 'pink' },
  { name: 'Entertainment', emoji: '🎮', color: 'purple' },
  { name: 'Finance', emoji: '💰', color: 'cyan' },
  { name: 'Shopping', emoji: '🛍️', color: 'orange' },
  { name: 'Other', emoji: '📌', color: null },
];

const segmenter = new Intl.Segmenter();

export function isSingleEmoji(value: string): boolean {
  return (
    [...segmenter.segment(value)].length === 1 &&
    /\p{Extended_Pictographic}/u.test(value)
  );
}

function parseCategory(value: unknown): Category | null {
  if (typeof value !== 'object' || value === null) return null;
  const v = value as Record<string, unknown>;
  if (
    typeof v.id !== 'string' ||
    typeof v.name !== 'string' ||
    (v.emoji !== undefined && typeof v.emoji !== 'string') ||
    (v.color !== undefined &&
      v.color !== null &&
      !TAB_GROUP_COLORS.includes(v.color as TabGroupColor))
  ) {
    return null;
  }
  return {
    id: v.id,
    name: v.name,
    emoji: typeof v.emoji === 'string' ? v.emoji : '',
    color: typeof v.color === 'string' ? (v.color as TabGroupColor) : null,
  };
}

function parse(value: unknown): Category[] {
  return Array.isArray(value)
    ? value.flatMap((entry) => {
        const category = parseCategory(entry);
        return category ? [category] : [];
      })
    : [];
}

// storage.sync carries the data across devices signed into the same account.
// Defaults are seeded only when the key is absent, so deleting all categories sticks.
export async function loadCategories(): Promise<Category[]> {
  const stored = await browser.storage.sync.get(STORAGE_KEY);
  if (stored[STORAGE_KEY] === undefined) {
    const defaults = DEFAULT_CATEGORIES.map((c) => ({
      ...c,
      id: crypto.randomUUID(),
    }));
    await saveCategories(defaults);
    return defaults;
  }
  return parse(stored[STORAGE_KEY]);
}

export async function saveCategories(categories: Category[]): Promise<void> {
  await browser.storage.sync.set({ [STORAGE_KEY]: categories });
}

export async function removeCategories(): Promise<void> {
  await browser.storage.sync.remove(STORAGE_KEY);
}

export function onCategoriesChanged(
  callback: (categories: Category[], previousCategories: Category[]) => void,
): void {
  browser.storage.onChanged.addListener((changes, area) => {
    const change = changes[STORAGE_KEY];
    if (area === 'sync' && change) {
      callback(parse(change.newValue), parse(change.oldValue));
    }
  });
}
