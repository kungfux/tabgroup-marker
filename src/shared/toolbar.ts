import { icon, type IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { faGear } from '@fortawesome/free-solid-svg-icons';
import browser from './browser';
import './styles.css';

export function svgIcon(definition: IconDefinition): Node {
  return icon(definition).node[0] as Node;
}

export function renderToolbar(options: { settingsButton: boolean }): void {
  const toolbar = document.getElementById('toolbar');
  if (!toolbar) return;

  toolbar.className = 'toolbar';

  const brand = document.createElement('div');
  brand.className = 'toolbar-brand';

  const logo = document.createElement('img');
  logo.className = 'toolbar-logo';
  logo.src = browser.runtime.getURL('icons/icon-48.png');
  logo.alt = '';

  const title = document.createElement('h1');
  title.className = 'toolbar-title';
  title.textContent = 'Group Tags';
  brand.append(logo, title);
  toolbar.replaceChildren(brand);

  if (!options.settingsButton) return;

  const button = document.createElement('button');
  button.className = 'icon-button';
  button.title = 'Settings';
  button.ariaLabel = 'Settings';
  button.append(svgIcon(faGear));
  button.addEventListener('click', () => {
    void browser.runtime.openOptionsPage();
    window.close();
  });
  toolbar.append(button);
}
