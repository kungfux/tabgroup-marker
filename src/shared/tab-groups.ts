import type { Category } from './categories';
import browser from './browser';

const GROUP_CATEGORY_KEY = 'groupCategoryAssignments';

export type AssignResult = 'assigned' | 'no-group';

export interface ActiveGroupInfo {
  groupId: number;
  title: string;
  color: string;
  tabCount: number;
}

// A category counts as assigned when its emoji prefixes the group title; color breaks ties.
export function findAssignedCategory(
  info: ActiveGroupInfo,
  categories: Category[],
): Category | undefined {
  const matches = categories.filter(
    (category) => category.emoji && info.title.startsWith(category.emoji),
  );
  return (
    matches.find((category) => category.color === info.color) ??
    matches[0] ??
    categories.find(
      (category) => category.color !== null && category.color === info.color,
    )
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
): Promise<AssignResult> {
  const [tab] = await chrome.tabs.query({
    active: true,
    currentWindow: true,
  });
  if (!tab || tab.groupId < 0) return 'no-group';

  await assignCategoryToGroup(tab.groupId, category, allCategories);
  return 'assigned';
}

export async function assignCategoryToGroup(
  groupId: number,
  category: Category,
  allCategories: Category[],
): Promise<void> {
  const group = await chrome.tabGroups.get(groupId);
  let title = group.title ?? '';
  // Drop an icon from a previously assigned category so icons don't stack.
  for (const { emoji } of allCategories) {
    if (emoji && title.startsWith(emoji)) {
      title = title.slice(emoji.length).trimStart();
      break;
    }
  }

  const nextTitle = category.emoji
    ? title
      ? `${category.emoji} ${title}`
      : category.emoji
    : title;
  if (category.color) {
    await chrome.tabGroups.update(group.id, {
      color: category.color,
      title: nextTitle,
    });
  } else {
    await chrome.tabGroups.update(group.id, { title: nextTitle });
  }

  const stored = await browser.storage.local.get(GROUP_CATEGORY_KEY);
  const assignments =
    (stored[GROUP_CATEGORY_KEY] as Record<string, string> | undefined) ?? {};
  assignments[String(groupId)] = category.id;
  await browser.storage.local.set({ [GROUP_CATEGORY_KEY]: assignments });
}
