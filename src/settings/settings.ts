import { icon } from '@fortawesome/fontawesome-svg-core';
import { faArrowUpRightFromSquare } from '@fortawesome/free-solid-svg-icons';
import browser from '../shared/browser';
import './categories';
import '../shared/styles.css';

const currentYear = document.getElementById('current-year');
if (currentYear) currentYear.textContent = String(new Date().getFullYear());

const configureShortcuts = document.getElementById('configure-shortcuts');
const externalLinkIcon = icon(faArrowUpRightFromSquare).node[0] as SVGElement;
externalLinkIcon.setAttribute('aria-hidden', 'true');
configureShortcuts?.insertBefore(
  externalLinkIcon,
  configureShortcuts.firstChild,
);

configureShortcuts?.addEventListener('click', () => {
  if (__BROWSER__ === 'firefox') {
    const commands = browser.commands as typeof browser.commands & {
      openShortcutSettings?: () => Promise<void>;
    };
    if (commands.openShortcutSettings) {
      void commands.openShortcutSettings();
      return;
    }
    void browser.tabs.create({ url: 'about:addons' });
    return;
  }

  void browser.tabs.create({ url: 'chrome://extensions/shortcuts' });
});

const hint = document.getElementById('emoji-hint');
const platform = navigator.platform.toLowerCase();

function appendHintText(text: string): void {
  hint?.append(document.createTextNode(text));
}

function appendKey(text: string): void {
  const key = document.createElement('kbd');
  key.className = 'shortcut-key';
  key.textContent = text;
  hint?.append(key);
}

if (hint) {
  if (platform.includes('win')) {
    appendHintText('Use ');
    appendKey('Win');
    appendHintText(' + ');
    appendKey('.');
    appendHintText(' to open the emoji picker.');
  } else if (platform.includes('mac')) {
    appendHintText('Press ');
    appendKey('Control');
    appendHintText(' + ');
    appendKey('Command');
    appendHintText(' + ');
    appendKey('Space');
    appendHintText(' to open the emoji picker.');
  } else if (platform.includes('linux')) {
    appendHintText(
      "Open your desktop's emoji picker; its keyboard shortcut depends on your desktop environment.",
    );
  } else {
    appendHintText("Open your system's emoji picker.");
  }
}
