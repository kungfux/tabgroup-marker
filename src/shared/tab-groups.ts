import type { Category } from './categories';

export interface ActiveGroupInfo {
  groupId: number;
  title: string;
  color: string;
  tabCount: number;
}

export interface CategoryTabGroup {
  id: number;
  title: string;
  tabCount: number;
  windowId: number;
  collapsed: boolean;
}

const NO_GROUP = -1; // browser.tabs.TAB_GROUP_ID_NONE

// A category counts as assigned when its emoji prefixes the group title; color breaks ties.
export function findAssignedCategory(
  info: Pick<ActiveGroupInfo, 'title' | 'color'>,
  categories: Category[],
): Category | undefined {
  const emojiMatches = categories.filter(
    (category) => category.emoji && info.title.startsWith(category.emoji),
  );
  return (
    emojiMatches.find((category) => category.color === info.color) ??
    emojiMatches[0]
  );
}

export async function getCategoryTabGroups(
  category: Category,
  categories: Category[],
): Promise<CategoryTabGroup[]> {
  const groups = await browser.tabGroups.query({});
  const assignedGroups = groups.filter(
    (group) =>
      findAssignedCategory(
        { title: group.title ?? '', color: group.color },
        categories,
      )?.id === category.id,
  );

  return Promise.all(
    assignedGroups.map(async (group) => {
      const tabs = await browser.tabs.query({ groupId: group.id });
      return {
        id: group.id,
        title: group.title ?? '',
        tabCount: tabs.length,
        windowId: group.windowId,
        collapsed: group.collapsed,
      };
    }),
  );
}

export async function activateTabGroup(groupId: number): Promise<boolean> {
  const group = await browser.tabGroups.get(groupId);
  const [tab] = await browser.tabs.query({ groupId });
  if (!tab?.id) return false;

  if (group.collapsed) {
    await browser.tabGroups.update(groupId, { collapsed: false });
  }
  await browser.tabs.update(tab.id, { active: true });
  await browser.windows.update(tab.windowId, { focused: true });
  return true;
}

// Returns null when the active tab is not in a group.
export async function getActiveGroupInfo(): Promise<ActiveGroupInfo | null> {
  const [tab] = await browser.tabs.query({
    active: true,
    currentWindow: true,
  });
  if (!tab || tab.groupId < 0) return null;
  const [group, groupTabs] = await Promise.all([
    browser.tabGroups.get(tab.groupId),
    browser.tabs.query({ groupId: tab.groupId }),
  ]);
  return {
    groupId: tab.groupId,
    title: group.title ?? '',
    color: group.color,
    tabCount: groupTabs.length,
  };
}

export async function assignCategory(
  category: Category,
  allCategories: Category[],
): Promise<void> {
  const [tab] = await browser.tabs.query({
    active: true,
    currentWindow: true,
  });
  if (!tab?.id) throw new Error('No active tab is available to group.');

  const groupId =
    tab.groupId >= 0
      ? tab.groupId
      : await groupTabWithOthersUngroupedHighlightedTabs(tab.id);
  await assignCategoryToGroup(groupId, category, allCategories);
}

async function groupTabWithOthersUngroupedHighlightedTabs(
  tabId: number,
): Promise<number> {
  const allTabs = await browser.tabs.query({ currentWindow: true });
  const highlightedTabIds = allTabs
    .filter((tab) => tab.groupId < 0 && tab.highlighted)
    .map((tab) => tab.id)
    .filter((id): id is number => id !== undefined);
  if (!highlightedTabIds.length)
    throw new Error('No highlighted tab is available to group.');

  return await browser.tabs.group({ tabIds: [tabId, ...highlightedTabIds] });
}

export async function assignCategoryToGroup(
  groupId: number,
  category: Category,
  allCategories: Category[],
  previousCategory?: Category,
): Promise<void> {
  const group = await browser.tabGroups.get(groupId);
  const title = group.title ?? '';
  const assignedCategory =
    previousCategory ??
    findAssignedCategory({ title, color: group.color }, allCategories);

  const wasAutoNamed =
    !title.trim() ||
    (assignedCategory !== undefined &&
      (title === categoryTitle(assignedCategory) ||
        title === assignedCategory.emoji));

  let titleWithoutCategory = title;
  if (!wasAutoNamed) {
    const oldEmoji = assignedCategory?.emoji;
    if (oldEmoji && titleWithoutCategory.startsWith(oldEmoji)) {
      titleWithoutCategory = titleWithoutCategory
        .slice(oldEmoji.length)
        .trimStart();
    } else {
      for (const { emoji } of allCategories) {
        if (emoji && titleWithoutCategory.startsWith(emoji)) {
          titleWithoutCategory = titleWithoutCategory
            .slice(emoji.length)
            .trimStart();
          break;
        }
      }
    }
  }

  const nextTitle = wasAutoNamed
    ? categoryTitle(category)
    : category.emoji
      ? titleWithoutCategory
        ? `${category.emoji} ${titleWithoutCategory}`
        : categoryTitle(category)
      : titleWithoutCategory;

  if (category.color) {
    await browser.tabGroups.update(group.id, {
      color: category.color,
      title: nextTitle,
    });
  } else {
    await browser.tabGroups.update(group.id, { title: nextTitle });
  }
}

function categoryTitle(category: Category): string {
  return category.emoji ? `${category.emoji} ${category.name}` : category.name;
}

export async function updateGroupsForCategoryChanges(
  categories: Category[],
  previousCategories: Category[],
): Promise<void> {
  const newById = new Map(
    categories.map((category) => [category.id, category]),
  );
  const groups = await browser.tabGroups.query({});

  for (const group of groups) {
    const oldCategory = findAssignedCategory(
      { title: group.title ?? '', color: group.color },
      previousCategories,
    );
    if (!oldCategory) continue;

    const updatedCategory = newById.get(oldCategory.id);
    if (
      !updatedCategory ||
      (oldCategory.emoji === updatedCategory.emoji &&
        oldCategory.color === updatedCategory.color &&
        oldCategory.name === updatedCategory.name)
    ) {
      continue;
    }

    await assignCategoryToGroup(
      group.id,
      updatedCategory,
      categories,
      oldCategory,
    );
  }
}

export async function ungroup(groupId: number): Promise<void> {
  const tabIds = await getGroupTabIds(groupId);
  if (!isNonEmpty(tabIds)) return;
  await browser.tabs.ungroup(tabIds);
}

export async function deleteGroup(groupId: number): Promise<void> {
  const tabIds = await getGroupTabIds(groupId);
  if (!isNonEmpty(tabIds)) return;
  await browser.tabs.remove(tabIds);
}

async function getGroupTabIds(groupId: number): Promise<number[]> {
  if (groupId === NO_GROUP) return [];
  const tabs = await browser.tabs.query({ groupId });
  return tabs
    .filter((tab) => tab.groupId === groupId) // defensive re-check
    .map((tab) => tab.id)
    .filter((id): id is number => id !== undefined);
}

function isNonEmpty<T>(items: T[]): items is [T, ...T[]] {
  return items.length > 0;
}
