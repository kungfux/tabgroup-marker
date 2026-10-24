import { faChevronRight } from '@fortawesome/free-solid-svg-icons';
import type { Category } from '../shared/categories';
import { listen } from '../shared/dom';
import { activateTabGroup, getCategoryTabGroups } from '../shared/tab-groups';
import { runAndClose } from './actions';
import { iconNode } from '../shared/dom';

type TabGroupSummary = Awaited<ReturnType<typeof getCategoryTabGroups>>[number];

const OPEN_TRIGGER_SELECTOR = '.category-groups-trigger[aria-expanded="true"]';
const UNNAMED_GROUP_TITLE = 'Unnamed tab group';

export function closeGroupMenus({ restoreFocus = false } = {}): void {
  for (const trigger of document.querySelectorAll<HTMLButtonElement>(
    OPEN_TRIGGER_SELECTOR,
  )) {
    trigger.setAttribute('aria-expanded', 'false');
    trigger.nextElementSibling?.setAttribute('hidden', '');
    if (restoreFocus) trigger.focus();
  }
}

export function registerMenuDismissal(): void {
  listen(document, 'click', (event) => {
    if (
      event.target instanceof Element &&
      event.target.closest('.category-groups-menu')
    ) {
      return;
    }
    closeGroupMenus();
  });

  listen(document, 'keydown', (event) => {
    if (event.key === 'Escape') closeGroupMenus({ restoreFocus: true });
  });
}

function createGroupOption(group: TabGroupSummary): HTMLButtonElement {
  const groupTitle = group.title || UNNAMED_GROUP_TITLE;

  const title = document.createElement('span');
  title.className = 'category-group-title';
  title.textContent = groupTitle;

  const count = document.createElement('span');
  count.className = 'category-group-count';
  count.textContent = `${group.tabCount} ${group.tabCount === 1 ? 'tab' : 'tabs'}`;

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'category-group-option';
  button.title = `Switch to ${groupTitle}`;
  button.setAttribute('role', 'menuitem');
  button.append(title, count);

  listen(button, 'click', () =>
    runAndClose(
      () => activateTabGroup(group.id),
      'Could not switch to a tab group.',
    ),
  );

  return button;
}

async function populateGroupsMenu(
  category: Category,
  categories: Category[],
  menu: HTMLDivElement,
): Promise<void> {
  const status = document.createElement('p');
  status.className = 'category-groups-empty';
  status.textContent = 'Loading tab groups…';
  menu.replaceChildren(status);

  try {
    const groups = await getCategoryTabGroups(category, categories);
    if (menu.hidden) return;

    if (groups.length === 0) {
      status.textContent = 'No tab groups use this category.';
      return;
    }
    menu.replaceChildren(...groups.map(createGroupOption));
  } catch (error) {
    console.error('Could not load tab groups for category.', error);
    status.textContent = 'Could not load tab groups.';
  }
}

export function createGroupsMenu(category: Category): HTMLDivElement {
  const menu = document.createElement('div');
  menu.className = 'category-groups-menu';
  menu.id = `category-groups-${category.id}`;
  menu.setAttribute('role', 'menu');
  menu.setAttribute('aria-label', `${category.name} tab groups`);
  menu.hidden = true;
  return menu;
}

export function createGroupsTrigger(
  category: Category,
  categories: Category[],
  menu: HTMLDivElement,
): HTMLButtonElement {
  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = 'category-groups-trigger';
  trigger.title = `Show ${category.emoji} ${category.name} tab groups`;
  trigger.setAttribute('aria-label', `Show ${category.name} tab groups`);
  trigger.setAttribute('aria-haspopup', 'menu');
  trigger.setAttribute('aria-expanded', 'false');
  trigger.setAttribute('aria-controls', menu.id);
  trigger.append(iconNode(faChevronRight));

  listen(trigger, 'click', async (event) => {
    event.stopPropagation();

    const wasOpen = !menu.hidden;
    closeGroupMenus();

    if (wasOpen) return;

    menu.hidden = false;
    trigger.setAttribute('aria-expanded', 'true');
    await populateGroupsMenu(category, categories, menu);
  });

  return trigger;
}
