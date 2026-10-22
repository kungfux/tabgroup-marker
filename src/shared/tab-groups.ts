import type { Category } from './categories';
import browser from './browser';

const GROUP_CATEGORY_KEY = 'groupCategoryAssignments';

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

// A category counts as assigned when its emoji prefixes the group title; color breaks ties.
export function findAssignedCategory(
  info: ActiveGroupInfo,
  categories: Category[],
): Category | undefined {
  // 1. Filter down strictly to categories that match the emoji prefix rule
  const emojiMatches = categories.filter(
    (category) => category.emoji && info.title.startsWith(category.emoji),
  );

  if (emojiMatches.length === 0) {
    return undefined;
  }

  return (
    emojiMatches.find((category) => category.color === info.color) ??
    emojiMatches[0]
  );
}

export async function getAssignedCategory(
  info: ActiveGroupInfo,
  categories: Category[],
): Promise<Category | undefined> {
  const stored = await browser.storage.local.get(GROUP_CATEGORY_KEY);
  const assignments = stored[GROUP_CATEGORY_KEY] as
    Record<string, string> | undefined;
  const assignedId = assignments?.[String(info.groupId)];
  return (
    categories.find((category) => category.id === assignedId) ??
    findAssignedCategory(info, categories)
  );
}

export async function getCategoryTabGroups(
  category: Category,
  categories: Category[],
): Promise<CategoryTabGroup[]> {
  const [groups, stored] = await Promise.all([
    chrome.tabGroups.query({}),
    browser.storage.local.get(GROUP_CATEGORY_KEY),
  ]);
  const assignments = stored[GROUP_CATEGORY_KEY] as
    Record<string, string> | undefined;
  const assignedGroups = groups.filter((group) => {
    const assignedId = assignments?.[String(group.id)];
    if (assignedId !== undefined) return assignedId === category.id;
    return (
      findAssignedCategory(
        {
          groupId: group.id,
          title: group.title ?? '',
          color: group.color,
          tabCount: 0,
        },
        categories,
      )?.id === category.id
    );
  });

  return Promise.all(
    assignedGroups.map(async (group) => {
      const tabs = await chrome.tabs.query({ groupId: group.id });
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
  const group = await chrome.tabGroups.get(groupId);
  const [tab] = await chrome.tabs.query({ groupId });
  if (!tab?.id) return false;

  if (group.collapsed) {
    await chrome.tabGroups.update(groupId, { collapsed: false });
  }
  await chrome.tabs.update(tab.id, { active: true });
  await chrome.windows.update(tab.windowId, { focused: true });
  return true;
}

// Returns null when the active tab is not in a group.
export async function getActiveGroupInfo(): Promise<ActiveGroupInfo | null> {
  const [tab] = await chrome.tabs.query({
    active: true,
    currentWindow: true,
  });
  if (!tab || tab.groupId < 0) return null;
  const [group, groupTabs] = await Promise.all([
    chrome.tabGroups.get(tab.groupId),
    chrome.tabs.query({ groupId: tab.groupId }),
  ]);
  return {
    groupId: tab.groupId,
    title: group.title ?? '',
    color: group.color,
    tabCount: groupTabs.length,
  };
}

// Firefox lacks full tabGroups support on older versions; chrome.* is promise-based in MV3 on both.
export async function assignCategory(
  category: Category,
  allCategories: Category[],
): Promise<void> {
  const [tab] = await chrome.tabs.query({
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
  const allTabs = await chrome.tabs.query({ currentWindow: true });
  const highlightedTabIds = allTabs
    .filter((tab) => tab.groupId < 0 && tab.highlighted)
    .map((tab) => tab.id)
    .filter((id): id is number => id !== undefined);
  if (!highlightedTabIds.length)
    throw new Error('No highlighted tab is available to group.');

  return await chrome.tabs.group({ tabIds: [tabId, ...highlightedTabIds] });
}

export async function assignCategoryToGroup(
  groupId: number,
  category: Category,
  allCategories: Category[],
  previousCategory?: Category,
): Promise<void> {
  const [group, stored] = await Promise.all([
    chrome.tabGroups.get(groupId),
    browser.storage.local.get(GROUP_CATEGORY_KEY),
  ]);
  const assignments = stored[GROUP_CATEGORY_KEY] as
    Record<string, string> | undefined;
  const assignedCategory =
    previousCategory ??
    allCategories.find(
      (candidate) => candidate.id === assignments?.[String(groupId)],
    );
  const title = group.title ?? '';
  const wasAutoNamed =
    !title.trim() ||
    (assignedCategory !== undefined &&
      (title === categoryTitle(assignedCategory) ||
        title === assignedCategory.emoji));

  let titleWithoutCategory = title;
  if (!wasAutoNamed) {
    const oldEmoji = assignedCategory?.emoji ?? previousCategory?.emoji;
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
    await chrome.tabGroups.update(group.id, {
      color: category.color,
      title: nextTitle,
    });
  } else {
    await chrome.tabGroups.update(group.id, { title: nextTitle });
  }

  const nextAssignments = assignments ?? {};
  nextAssignments[String(groupId)] = category.id;
  await browser.storage.local.set({ [GROUP_CATEGORY_KEY]: nextAssignments });
}

function categoryTitle(category: Category): string {
  return category.emoji ? `${category.emoji} ${category.name}` : category.name;
}

export async function updateGroupsForCategoryChanges(
  categories: Category[],
  previousCategories: Category[],
): Promise<void> {
  const oldById = new Map(
    previousCategories.map((category) => [category.id, category]),
  );
  const newById = new Map(
    categories.map((category) => [category.id, category]),
  );
  const stored = await browser.storage.local.get(GROUP_CATEGORY_KEY);
  const assignments = stored[GROUP_CATEGORY_KEY] as
    Record<string, string> | undefined;
  const groups = await chrome.tabGroups.query({});

  for (const group of groups) {
    let oldCategory = oldById.get(assignments?.[String(group.id)] ?? '');
    if (!oldCategory) {
      const matches = previousCategories.filter(
        (category) => category.emoji && group.title?.startsWith(category.emoji),
      );
      oldCategory =
        matches.find((category) => category.color === group.color) ??
        matches[0];
    }

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
  const tabs = await chrome.tabs.query({ groupId });
  if (tabs.length === 0) {
    return;
  }

  tabs.forEach((tab) => {
    if (tab.id !== undefined) {
      void chrome.tabs.ungroup(tab.id);
    }
  });
  const stored = await browser.storage.local.get(GROUP_CATEGORY_KEY);
  const assignments = stored[GROUP_CATEGORY_KEY] as
    Record<string, string> | undefined;
  if (assignments) {
    delete assignments[String(groupId)];
    await browser.storage.local.set({ [GROUP_CATEGORY_KEY]: assignments });
  }
}

export async function deleteGroup(groupId: number): Promise<void> {
  const tabs = await chrome.tabs.query({ groupId });
  if (tabs.length === 0) {
    return;
  }

  tabs.forEach((tab) => {
    if (tab.id !== undefined) {
      void chrome.tabs.remove(tab.id);
    }
  });
  const stored = await browser.storage.local.get(GROUP_CATEGORY_KEY);
  const assignments = stored[GROUP_CATEGORY_KEY] as
    Record<string, string> | undefined;
  if (assignments) {
    delete assignments[String(groupId)];
    await browser.storage.local.set({ [GROUP_CATEGORY_KEY]: assignments });
  }
}
