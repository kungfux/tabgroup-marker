import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import {
  faArrowRightFromBracket,
  faGear,
  faTrash,
} from '@fortawesome/free-solid-svg-icons';
import { listen } from '../shared/dom';
import type { PopupActions } from './actions';
import { iconNode } from '../shared/dom';

interface ToolbarButtonOptions {
  icon: IconDefinition;
  title: string;
  shortcut: string | null;
  enabled: boolean;
  onClick: () => Promise<void>;
}

function setupToolbarButton(
  button: HTMLButtonElement | null,
  { icon, title, shortcut, enabled, onClick }: ToolbarButtonOptions,
): void {
  if (!button) return;

  button.title = shortcut ? `${title} (${shortcut})` : title;
  button.append(iconNode(icon));

  if (shortcut) {
    button.setAttribute('aria-keyshortcuts', shortcut);
  }

  if (!enabled) {
    button.disabled = true;
    button.setAttribute('aria-disabled', 'true');
    return;
  }

  listen(button, 'click', onClick);
}

export function setupToolbar(
  actions: PopupActions,
  hasActiveGroup: boolean,
): void {
  setupToolbarButton(
    document.querySelector<HTMLButtonElement>('#toolbar-group-delete'),
    {
      icon: faTrash,
      title: 'Delete Group',
      shortcut: 'Delete',
      enabled: hasActiveGroup,
      onClick: actions.deleteActiveGroup,
    },
  );

  setupToolbarButton(
    document.querySelector<HTMLButtonElement>('#toolbar-ungroup'),
    {
      icon: faArrowRightFromBracket,
      title: 'Ungroup',
      shortcut: 'Backspace',
      enabled: hasActiveGroup,
      onClick: actions.ungroupActiveGroup,
    },
  );

  setupToolbarButton(
    document.querySelector<HTMLButtonElement>('#toolbar-settings'),
    {
      icon: faGear,
      title: 'Settings',
      shortcut: null,
      enabled: true,
      onClick: actions.openSettings,
    },
  );

  const shortcutModifier = document.getElementById('shortcut-modifier');
  if (shortcutModifier && navigator.platform.toLowerCase().includes('mac')) {
    shortcutModifier.textContent = 'Command';
  }
}
