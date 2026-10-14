import browser from '../shared/browser';
import { loadCategories, onCategoriesChanged } from '../shared/categories';
import {
  assignCategoryToGroup,
  findAssignedCategory,
  getActiveGroupInfo,
  updateGroupsForCategoryChanges,
} from '../shared/tab-groups';

browser.runtime.onInstalled.addListener(() => {
  console.info(`TabGroup Marker installed (${__BROWSER__})`);
});

async function cycleActiveGroupCategory(): Promise<void> {
  try {
    const categories = await loadCategories();
    if (categories.length === 0) return;

    const group = await getActiveGroupInfo();
    if (!group) return;

    const current = findAssignedCategory(group, categories);
    const currentIndex = current ? categories.indexOf(current) : -1;
    const next = categories[(currentIndex + 1) % categories.length];
    if (next) await assignCategoryToGroup(group.groupId, next, categories);
  } catch (error) {
    console.error('Could not cycle the active tab group category.', error);
  }
}

browser.commands.onCommand.addListener((command) => {
  if (command === 'cycle-category') void cycleActiveGroupCategory();
});

onCategoriesChanged((categories, previousCategories) => {
  void updateGroupsForCategoryChanges(categories, previousCategories).catch(
    (error: unknown) => {
      console.error('Could not update groups after category changes.', error);
    },
  );
});
