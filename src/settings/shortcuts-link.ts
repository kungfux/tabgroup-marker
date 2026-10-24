import { faArrowUpRightFromSquare } from '@fortawesome/free-solid-svg-icons';
import browser from '../shared/browser';
import { iconNode, listen } from '../shared/dom';

type FirefoxCommands = typeof browser.commands & {
  openShortcutSettings?: () => Promise<void>;
};

const IS_FIREFOX = __BROWSER__ === 'firefox';
const CHROME_SHORTCUTS_URL = 'chrome://extensions/shortcuts';
const FIREFOX_ADDONS_URL = 'about:addons';

async function openShortcutSettings(): Promise<void> {
  if (!IS_FIREFOX) {
    await browser.tabs.create({ url: CHROME_SHORTCUTS_URL });
    return;
  }

  const commands = browser.commands as FirefoxCommands;
  if (commands.openShortcutSettings) {
    await commands.openShortcutSettings();
    return;
  }
  await browser.tabs.create({ url: FIREFOX_ADDONS_URL });
}

export function setupShortcutsLink(): void {
  const link = document.getElementById('configure-shortcuts');
  if (!link) return;

  const externalLinkIcon = iconNode(faArrowUpRightFromSquare);
  externalLinkIcon.setAttribute('aria-hidden', 'true');
  link.prepend(externalLinkIcon);

  listen(link, 'click', openShortcutSettings);
}
