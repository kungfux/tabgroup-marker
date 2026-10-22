import { icon } from '@fortawesome/fontawesome-svg-core';
import {
  faArrowRightFromBracket,
  faChevronRight,
  faGear,
  faTrash,
} from '@fortawesome/free-solid-svg-icons';
import { loadCategories, type Category } from '../shared/categories';
import browser from '../shared/browser';
import {
  assignCategory,
  activateTabGroup,
  deleteGroup,
  getCategoryTabGroups,
  getAssignedCategory,
  getActiveGroupInfo,
  ungroup,
} from '../shared/tab-groups';
import { COLOR_HEX } from '../shared/colors';
import '../shared/styles.css';

const activeGroupId = await getActiveGroupInfo().then(
  (info) => info?.groupId ?? -1,
);

const deleteGroupButton = document.getElementById('toolbar-group-delete');
if (deleteGroupButton && deleteGroupButton instanceof HTMLButtonElement) {
  const iconSpan = document.createElement('span');
  iconSpan.className = 'icon';
  iconSpan.append(icon(faTrash).node[0] as Node);

  deleteGroupButton.setAttribute('aria-shortcut', 'Delete');
  deleteGroupButton.setAttribute('title', 'Delete Group (Delete)');
  deleteGroupButton.append(iconSpan);
  deleteGroupButton.append(document.createTextNode('Delete'));

  if (activeGroupId < 0) {
    deleteGroupButton.disabled = true;
    deleteGroupButton.setAttribute('aria-disabled', 'true');
  } else {
    deleteGroupButton.addEventListener('click', () => {
      void deleteGroup(activeGroupId);
      window.close();
    });
  }
}

const ungroupButton = document.getElementById('toolbar-ungroup');
if (ungroupButton && ungroupButton instanceof HTMLButtonElement) {
  const iconSpan = document.createElement('span');
  iconSpan.className = 'icon';
  iconSpan.append(icon(faArrowRightFromBracket).node[0] as Node);

  ungroupButton?.setAttribute('aria-shortcut', 'Backspace');
  ungroupButton?.setAttribute('title', 'Ungroup (Backspace)');
  ungroupButton?.append(iconSpan);
  ungroupButton?.append(document.createTextNode('Ungroup'));

  if (activeGroupId < 0) {
    ungroupButton.disabled = true;
    ungroupButton.setAttribute('aria-disabled', 'true');
  } else {
    ungroupButton?.addEventListener('click', () => {
      void ungroup(activeGroupId);
      window.close();
    });
  }
}

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

async function pick(category: Category, all: Category[]): Promise<void> {
  try {
    await assignCategory(category, all);
    window.close();
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
  if (index <= 9) {
    badge.textContent = index < 9 ? String(index + 1) : '0';
  }

  const emoji = document.createElement('span');
  emoji.className = 'category-emoji';
  emoji.textContent = category.emoji;

  const name = document.createElement('span');
  name.textContent = category.name;

  const button = document.createElement('button');
  button.className = 'category-pick';
  button.append(badge, emoji, name);
  if (index <= 9) {
    button.setAttribute(
      'aria-keyshortcuts',
      index < 9 ? String(index + 1) : '0',
    );
  }
  button.addEventListener('click', () => void pick(category, all));
  buttons.set(category.id, button);

  const item = document.createElement('li');
  item.className = 'category-item';
  item.title = `Assign this tab group the ${category.emoji} ${category.name} category`;
  item.style.setProperty(
    '--category-color',
    category.color ? COLOR_HEX[category.color] : 'var(--muted)',
  );
  item.append(button);

  const groupsButton = document.createElement('button');
  groupsButton.type = 'button';
  groupsButton.className = 'category-groups-trigger';
  groupsButton.title = `Show ${category.emoji} ${category.name} tab groups`;
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
        groupButton.title = `Switch to ${group.title || 'Unnamed tab group'}`;
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
              console.error('Could not switch to a tab group.', error);
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

document.addEventListener('keydown', (event) => {
  if (
    event.ctrlKey ||
    event.altKey ||
    event.metaKey ||
    event.shiftKey ||
    !(event.target instanceof Element) ||
    event.target.closest('input, textarea, select, [contenteditable="true"]')
  ) {
    return;
  }

  if (event.key === 'Delete') {
    void deleteGroup(activeGroupId);
    window.close();
    return;
  }

  if (event.key === 'Backspace') {
    void ungroup(activeGroupId);
    window.close();
    return;
  }

  const match = /^[0-9]$/.exec(event.key);
  if (!match) return;

  const keyNumber = Number(match[0]);
  const category = keyNumber === 0 ? categories[9] : categories[keyNumber - 1];
  if (!category) return;

  event.preventDefault();
  document
    .querySelectorAll<HTMLButtonElement>(
      '.category-groups-trigger[aria-expanded="true"]',
    )
    .forEach((button) => {
      button.setAttribute('aria-expanded', 'false');
      button.nextElementSibling?.setAttribute('hidden', '');
    });
  void pick(category, categories);
});

await refresh(categories);
