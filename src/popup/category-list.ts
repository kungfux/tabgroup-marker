import type { Category } from '../shared/categories';
import { COLOR_HEX } from '../shared/colors';
import { listen } from '../shared/dom';
import { findAssignedCategory, getActiveGroupInfo } from '../shared/tab-groups';
import { shortcutKey } from './keyboard';
import { createGroupsMenu, createGroupsTrigger } from './groups-menu';

const categoryButtons = new Map<string, HTMLButtonElement>();

export async function refreshSelection(categories: Category[]): Promise<void> {
  const info = await getActiveGroupInfo();
  const assigned = info ? findAssignedCategory(info, categories) : undefined;
  for (const [id, button] of categoryButtons) {
    const selected = id === assigned?.id;
    button.classList.toggle('selected', selected);
    button.ariaPressed = String(selected);
  }
}

function createCategoryButton(
  category: Category,
  index: number,
  onPick: (category: Category) => Promise<void>,
): HTMLButtonElement {
  const key = shortcutKey(index);

  const badge = document.createElement('span');
  badge.className = 'category-number';
  if (category.color) {
    badge.style.backgroundColor = COLOR_HEX[category.color];
  } else {
    badge.classList.add('category-number-none');
  }
  if (key) badge.textContent = key;

  const emoji = document.createElement('span');
  emoji.className = 'category-emoji';
  emoji.textContent = category.emoji;

  const name = document.createElement('span');
  name.textContent = category.name;

  const button = document.createElement('button');
  button.className = 'category-pick';
  button.append(badge, emoji, name);
  if (key) button.setAttribute('aria-keyshortcuts', key);

  listen(button, 'click', () => onPick(category));
  categoryButtons.set(category.id, button);

  return button;
}

function createItem(
  category: Category,
  index: number,
  categories: Category[],
  onPick: (category: Category) => Promise<void>,
): HTMLLIElement {
  const menu = createGroupsMenu(category);

  const item = document.createElement('li');
  item.className = 'category-item';
  item.title = `Assign this tab group the ${category.emoji} ${category.name} category`;
  item.style.setProperty(
    '--category-color',
    category.color ? COLOR_HEX[category.color] : 'var(--muted)',
  );
  item.append(
    createCategoryButton(category, index, onPick),
    createGroupsTrigger(category, categories, menu),
    menu,
  );
  return item;
}

export function renderCategories(
  categories: Category[],
  onPick: (category: Category) => Promise<void>,
): void {
  const list = document.getElementById('category-pick-list');
  if (!list) return;

  if (categories.length === 0) {
    const empty = document.createElement('li');
    empty.className = 'status';
    empty.textContent = 'No categories yet. Add some in settings.';
    list.replaceChildren(empty);
    return;
  }

  list.replaceChildren(
    ...categories.map((category, index) =>
      createItem(category, index, categories, onPick),
    ),
  );
}
