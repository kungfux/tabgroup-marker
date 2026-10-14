import { icon } from '@fortawesome/fontawesome-svg-core';
import {
  faChevronRight,
  faGear,
  faLightbulb,
} from '@fortawesome/free-solid-svg-icons';
import { loadCategories, type Category } from '../shared/categories';
import browser from '../shared/browser';
import {
  assignCategory,
  activateTabGroup,
  getCategoryTabGroups,
  getAssignedCategory,
  getActiveGroupInfo,
} from '../shared/tab-groups';
import { COLOR_HEX } from '../shared/colors';
import '../shared/styles.css';

const settingsButton = document.getElementById('toolbar-settings');
settingsButton?.append(icon(faGear).node[0] as Node);
settingsButton?.addEventListener('click', () => {
  void browser.runtime.openOptionsPage();
  window.close();
});

const shortcutModifier = document.getElementById('shortcut-modifier');
if (shortcutModifier && navigator.platform.toLowerCase().includes('mac')) {
  shortcutModifier.textContent = 'Command';
}

const buttons = new Map<string, HTMLButtonElement>();

async function refresh(all: Category[]): Promise<void> {
  const info = await getActiveGroupInfo();
  const assigned = info ? await getAssignedCategory(info, all) : undefined;
  for (const [id, button] of buttons) {
    const selected = id === assigned?.id;
    button.classList.toggle('selected', selected);
    button.ariaPressed = String(selected);
  }
}

const list = document.getElementById('category-pick-list');
const dialog = document.getElementById('no-group-dialog');

document
  .getElementById('no-group-icon')
  ?.append(icon(faLightbulb).node[0] as Node);

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
    } else {
      await refresh(all);
    }
  } catch (error) {
    console.error('Could not update the tab group.', error);
  }
}

function createItem(
  category: Category,
  all: Category[],
  index: number,
): HTMLLIElement {
  const badge = document.createElement('span');
  badge.className = 'category-number';
  if (category.color) {
    badge.style.backgroundColor = COLOR_HEX[category.color];
  } else {
    badge.classList.add('category-number-none');
  }
  badge.textContent = String(index + 1);
  badge.setAttribute('aria-hidden', 'true');

  const emoji = document.createElement('span');
  emoji.className = 'category-emoji';
  emoji.textContent = category.emoji;

  const name = document.createElement('span');
  name.textContent = category.name;

  const button = document.createElement('button');
  button.className = 'category-pick';
  button.append(badge, emoji, name);
  button.addEventListener('click', () => void pick(category, all));
  buttons.set(category.id, button);

  const item = document.createElement('li');
  item.className = 'category-item';
  item.style.setProperty(
    '--category-color',
    category.color ? COLOR_HEX[category.color] : 'var(--muted)',
  );
  item.append(button);

  const groupsButton = document.createElement('button');
  groupsButton.type = 'button';
  groupsButton.className = 'category-groups-trigger';
  groupsButton.setAttribute('aria-label', `Show ${category.name} tab groups`);
  groupsButton.setAttribute('aria-haspopup', 'menu');
  groupsButton.setAttribute('aria-expanded', 'false');
  groupsButton.append(icon(faChevronRight).node[0] as Node);

  const groupsMenu = document.createElement('div');
  groupsMenu.className = 'category-groups-menu';
  groupsMenu.id = `category-groups-${category.id}`;
  groupsMenu.setAttribute('role', 'menu');
  groupsMenu.setAttribute('aria-label', `${category.name} tab groups`);
  groupsMenu.hidden = true;
  groupsButton.setAttribute('aria-controls', groupsMenu.id);

  groupsButton.addEventListener('click', (event) => {
    event.stopPropagation();
    for (const openButton of document.querySelectorAll<HTMLButtonElement>(
      '.category-groups-trigger[aria-expanded="true"]',
    )) {
      if (openButton === groupsButton) continue;
      openButton.setAttribute('aria-expanded', 'false');
      openButton.nextElementSibling?.setAttribute('hidden', '');
    }

    const open = groupsMenu.hidden;
    groupsMenu.hidden = !open;
    groupsButton.setAttribute('aria-expanded', String(open));
    if (open) {
      void populateGroupsMenu(category, all, groupsMenu);
    }
  });

  item.append(groupsButton, groupsMenu);
  return item;
}

async function populateGroupsMenu(
  category: Category,
  all: Category[],
  menu: HTMLDivElement,
): Promise<void> {
  menu.replaceChildren();
  const loading = document.createElement('p');
  loading.className = 'category-groups-empty';
  loading.textContent = 'Loading tab groups…';
  menu.append(loading);

  try {
    const groups = await getCategoryTabGroups(category, all);
    if (menu.hidden) return;
    if (groups.length === 0) {
      loading.textContent = 'No tab groups use this category.';
      return;
    }

    menu.replaceChildren(
      ...groups.map((group) => {
        const groupButton = document.createElement('button');
        groupButton.type = 'button';
        groupButton.className = 'category-group-option';
        groupButton.setAttribute('role', 'menuitem');

        const title = document.createElement('span');
        title.className = 'category-group-title';
        title.textContent = group.title || 'Unnamed tab group';

        const count = document.createElement('span');
        count.className = 'category-group-count';
        count.textContent = `${group.tabCount} ${group.tabCount === 1 ? 'tab' : 'tabs'}`;

        groupButton.append(title, count);
        groupButton.addEventListener('click', () => {
          void activateTabGroup(group.id)
            .then(() => window.close())
            .catch((error: unknown) => {
              console.error('Could not activate tab group.', error);
            });
        });
        return groupButton;
      }),
    );
  } catch (error) {
    console.error('Could not load tab groups for category.', error);
    loading.textContent = 'Could not load tab groups.';
  }
}

document.addEventListener('click', (event) => {
  if (
    event.target instanceof Element &&
    event.target.closest('.category-groups-menu')
  ) {
    return;
  }
  document
    .querySelectorAll<HTMLButtonElement>(
      '.category-groups-trigger[aria-expanded="true"]',
    )
    .forEach((button) => {
      button.setAttribute('aria-expanded', 'false');
      button.nextElementSibling?.setAttribute('hidden', '');
    });
});

document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape') return;
  document
    .querySelectorAll<HTMLButtonElement>(
      '.category-groups-trigger[aria-expanded="true"]',
    )
    .forEach((button) => {
      button.setAttribute('aria-expanded', 'false');
      button.nextElementSibling?.setAttribute('hidden', '');
      button.focus();
    });
});

const categories = await loadCategories();
if (list) {
  if (categories.length === 0) {
    const empty = document.createElement('li');
    empty.className = 'status';
    empty.textContent = 'No categories yet. Add some in settings.';
    list.append(empty);
  } else {
    list.replaceChildren(
      ...categories.map((category, index) =>
        createItem(category, categories, index),
      ),
    );
  }
}

await refresh(categories);
