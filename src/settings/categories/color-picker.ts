import { type Category } from '../../shared/categories';
import {
  COLOR_HEX,
  TAB_GROUP_COLORS,
  TabGroupColor,
} from '../../shared/colors';
import { listen } from '../../shared/dom';
import { capitalizeString } from '../../shared/text';

const COLOR_OPTIONS: (TabGroupColor | null)[] = [...TAB_GROUP_COLORS, null];
const OPEN_COLOR_TRIGGER_SELECTOR =
  '.color-picker-trigger[aria-expanded="true"]';

export function closeColorMenus(keepOpen?: Element | null): void {
  for (const trigger of document.querySelectorAll<HTMLButtonElement>(
    OPEN_COLOR_TRIGGER_SELECTOR,
  )) {
    if (keepOpen && keepOpen.closest(OPEN_COLOR_TRIGGER_SELECTOR) === trigger)
      continue;
    trigger.setAttribute('aria-expanded', 'false');
    const menu = trigger.nextElementSibling;
    if (menu instanceof HTMLElement) menu.hidden = true;
  }
}

function applySwatchColor(
  swatch: HTMLElement,
  color: TabGroupColor | null,
): void {
  swatch.classList.toggle('color-swatch-none', color === null);
  swatch.style.backgroundColor = color ? COLOR_HEX[color] : '';
}

function createSwatch(color: TabGroupColor | null): HTMLSpanElement {
  const swatch = document.createElement('span');
  swatch.className = 'color-swatch';
  swatch.setAttribute('aria-hidden', 'true');
  applySwatchColor(swatch, color);
  return swatch;
}

function createColorOption(color: TabGroupColor | null): HTMLButtonElement {
  const option = document.createElement('button');
  option.type = 'button';
  option.className = 'color-option';
  option.dataset.color = color ?? '';
  option.title = capitalizeString(
    color ?? 'No color (Do not change group color)',
  );
  option.setAttribute('aria-label', color ?? 'No color');
  option.append(createSwatch(color));
  return option;
}

export function createColorPicker(
  category: Category,
  onChange: () => void,
): HTMLDivElement {
  const picker = document.createElement('div');
  picker.className = 'color-picker';

  const menu = document.createElement('div');
  menu.className = 'color-menu';
  menu.id = `color-options-${category.id}`;
  menu.hidden = true;
  menu.setAttribute('role', 'group');
  menu.setAttribute('aria-label', 'Tab group colors');

  const selectedSwatch = createSwatch(category.color);

  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = 'color-picker-trigger';
  trigger.setAttribute('aria-label', 'Choose color');
  trigger.setAttribute('aria-haspopup', 'true');
  trigger.setAttribute('aria-expanded', 'false');
  trigger.setAttribute('aria-controls', menu.id);
  trigger.append(selectedSwatch);

  const setMenuOpen = (open: boolean): void => {
    menu.hidden = !open;
    trigger.setAttribute('aria-expanded', String(open));
  };

  const updateSelectedColor = (): void => {
    applySwatchColor(selectedSwatch, category.color);
    for (const option of menu.querySelectorAll<HTMLButtonElement>(
      '[data-color]',
    )) {
      option.setAttribute(
        'aria-pressed',
        String((option.dataset.color || null) === category.color),
      );
    }
  };

  for (const color of COLOR_OPTIONS) {
    const option = createColorOption(color);
    listen(option, 'click', () => {
      category.color = color;
      updateSelectedColor();
      setMenuOpen(false);
      trigger.focus();
      onChange();
    });
    menu.append(option);
  }

  listen(trigger, 'click', () => setMenuOpen(!!menu.hidden));
  listen(picker, 'keydown', (event) => {
    if (event.key === 'Escape' && !menu.hidden) {
      setMenuOpen(false);
      trigger.focus();
    }
  });

  picker.append(trigger, menu);
  updateSelectedColor();
  return picker;
}
