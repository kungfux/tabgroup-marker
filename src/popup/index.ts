import '../shared/styles.css';
import { createActions } from './actions';
import { refreshSelection, renderCategories } from './category-list';
import { registerMenuDismissal } from './groups-menu';
import { registerShortcuts } from './keyboard';
import { loadPopupState } from './state';
import { setupToolbar } from './toolbar';

const state = await loadPopupState();
const actions = createActions(state);

registerMenuDismissal();
registerShortcuts(state, actions);
setupToolbar(actions, state.hasActiveGroup);
renderCategories(state.categories, actions.pickCategory);
await refreshSelection(state.categories);
