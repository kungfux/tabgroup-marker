import { loadCategories, type Category } from '../shared/categories';
import { getActiveGroupInfo } from '../shared/tab-groups';

export interface PopupState {
  categories: Category[];
  activeGroupId: number;
  hasActiveGroup: boolean;
}

export async function loadPopupState(): Promise<PopupState> {
  const [activeGroupInfo, categories] = await Promise.all([
    getActiveGroupInfo(),
    loadCategories(),
  ]);
  const activeGroupId = activeGroupInfo?.groupId ?? -1;

  return {
    categories,
    activeGroupId,
    hasActiveGroup: activeGroupId >= 0,
  };
}
