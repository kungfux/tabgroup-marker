import browser from './browser';

export const TAB_GROUP_COLORS = [
  'grey',
  'blue',
  'red',
  'yellow',
  'green',
  'pink',
  'purple',
  'cyan',
  'orange',
] as const;

export type TabGroupColor = (typeof TAB_GROUP_COLORS)[number];

export interface Category {
  id: string;
  name: string;
  emoji: string;
  color: TabGroupColor;
}

const STORAGE_KEY = 'categories';

const DEFAULT_CATEGORIES: Omit<Category, 'id'>[] = [
  { name: 'Work', emoji: '💼', color: 'grey' },
  { name: 'Movies', emoji: '▶️', color: 'blue' },
  { name: 'Study', emoji: '📚', color: 'green' },
  { name: 'Read Later', emoji: '🔖', color: 'red' },
  { name: 'Shopping', emoji: '🛒', color: 'yellow' },
];

const segmenter = new Intl.Segmenter();

export function isSingleEmoji(value: string): boolean {
  return (
    [...segmenter.segment(value)].length === 1 &&
    /\p{Extended_Pictographic}/u.test(value)
  );
}

function isCategory(value: unknown): value is Category {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === 'string' &&
    typeof v.name === 'string' &&
    typeof v.emoji === 'string' &&
    TAB_GROUP_COLORS.includes(v.color as TabGroupColor)
  );
}

function parse(value: unknown): Category[] {
  return Array.isArray(value) ? value.filter(isCategory) : [];
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

export function onCategoriesChanged(
  callback: (categories: Category[]) => void,
): void {
  browser.storage.onChanged.addListener((changes, area) => {
    const change = changes[STORAGE_KEY];
    if (area === 'sync' && change) callback(parse(change.newValue));
  });
}
