import { faLightbulb } from '@fortawesome/free-solid-svg-icons';
import { loadCategories, type Category } from '../shared/categories';
import {
  assignCategory,
  findAssignedCategory,
  getActiveGroupInfo,
} from '../shared/tab-groups';
import { renderToolbar, svgIcon } from '../shared/toolbar';
import { COLOR_HEX } from '../shared/colors';

renderToolbar({ settingsButton: true });

const buttons = new Map<string, HTMLButtonElement>();

async function refresh(all: Category[]): Promise<void> {
  const info = await getActiveGroupInfo();
  const assigned = info ? findAssignedCategory(info, all) : undefined;
  for (const [id, button] of buttons) {
    const selected = id === assigned?.id;
    button.classList.toggle('selected', selected);
    button.ariaPressed = String(selected);
  }

  const el = document.getElementById('tab-count');
  if (!el) return;
  if (info === null) {
    el.textContent = 'Selected tab is not a part of the group yet.';
    return;
  }
  const { title, tabCount } = info;
  const noun = tabCount === 1 ? 'tab' : 'tabs';
  const group = title
    ? `the '${title}' tab's group`
    : "the selected tab's group";
  el.textContent = `${tabCount} ${noun} in ${group}.`;
}

const list = document.getElementById('category-pick-list');
const dialog = document.getElementById('no-group-dialog');
const status = document.getElementById('assign-status');

document.getElementById('no-group-icon')?.append(svgIcon(faLightbulb));

if (dialog instanceof HTMLDialogElement) {
  dialog
    .querySelector('button')
    ?.addEventListener('click', () => dialog.close());
}

async function pick(category: Category, all: Category[]): Promise<void> {
  try {
    const result = await assignCategory(category, all);
    if (result === 'no-group' && dialog instanceof HTMLDialogElement) {
      dialog.showModal();
    } else if (status) {
      status.textContent = `Applied "${category.name}" category.`;
      await refresh(all);
    }
  } catch {
    if (status) status.textContent = 'Could not update the tab group.';
  }
}

function createItem(category: Category, all: Category[]): HTMLLIElement {
  const swatch = document.createElement('span');
  swatch.className = 'color-swatch';
  swatch.style.backgroundColor = COLOR_HEX[category.color];

  const emoji = document.createElement('span');
  emoji.textContent = category.emoji;

  const name = document.createElement('span');
  name.textContent = category.name;

  const button = document.createElement('button');
  button.className = 'category-pick';
  button.append(swatch, emoji, name);
  button.addEventListener('click', () => void pick(category, all));
  buttons.set(category.id, button);

  const item = document.createElement('li');
  item.append(button);
  return item;
}

const categories = await loadCategories();
if (list) {
  if (categories.length === 0) {
    const empty = document.createElement('li');
    empty.className = 'status';
    empty.textContent = 'No categories yet. Add some in settings.';
    list.append(empty);
  } else {
    list.replaceChildren(...categories.map((c) => createItem(c, categories)));
  }
}

await refresh(categories);
