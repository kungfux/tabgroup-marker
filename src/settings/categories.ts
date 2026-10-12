import { faPlus, faTrash } from '@fortawesome/free-solid-svg-icons';
import {
  isSingleEmoji,
  loadCategories,
  onCategoriesChanged,
  saveCategories,
  TAB_GROUP_COLORS,
  type Category,
} from '../shared/categories';
import { svgIcon } from '../shared/toolbar';
import { COLOR_HEX } from '../shared/colors';

const SAVE_DELAY_MS = 300;

let categories: Category[] = [];
let rowChecks: (() => boolean)[] = [];
let saveTimer: number | undefined;

const list = document.getElementById('category-list');
const status = document.getElementById('category-status');
const addButton = document.getElementById('category-add');

function setStatus(text: string): void {
  if (status) status.textContent = text;
}

function scheduleSave(): void {
  window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => {
    // Evaluate every row so all invalid fields get highlighted.
    const valid = rowChecks.map((check) => check()).every(Boolean);
    if (!valid) {
      setStatus('Fix the highlighted fields to save.');
      return;
    }
    saveCategories(categories).then(
      () => setStatus('Saved.'),
      () => setStatus('Could not save categories.'),
    );
  }, SAVE_DELAY_MS);
}

function createRow(category: Category): HTMLLIElement {
  const row = document.createElement('li');
  row.className = 'category-row';

  const colorPicker = document.createElement('div');
  colorPicker.className = 'color-picker';

  const colorButton = document.createElement('button');
  colorButton.type = 'button';
  colorButton.className = 'color-picker-trigger';
  colorButton.setAttribute('aria-label', 'Choose color');
  colorButton.setAttribute('aria-haspopup', 'true');
  colorButton.setAttribute('aria-expanded', 'false');

  const selectedSwatch = document.createElement('span');
  selectedSwatch.className = 'color-swatch';
  selectedSwatch.setAttribute('aria-hidden', 'true');
  colorButton.append(selectedSwatch);

  const colorMenu = document.createElement('div');
  colorMenu.className = 'color-menu';
  colorMenu.id = `color-options-${category.id}`;
  colorMenu.setAttribute('role', 'group');
  colorMenu.setAttribute('aria-label', 'Tab group colors');
  colorMenu.hidden = true;
  colorButton.setAttribute('aria-controls', colorMenu.id);

  const updateSelectedColor = () => {
    selectedSwatch.style.backgroundColor = COLOR_HEX[category.color];
    for (const option of colorMenu.querySelectorAll<HTMLButtonElement>(
      '[data-color]',
    )) {
      option.setAttribute(
        'aria-pressed',
        String(option.dataset.color === category.color),
      );
    }
  };

  for (const color of TAB_GROUP_COLORS) {
    const option = document.createElement('button');
    option.type = 'button';
    option.className = 'color-option';
    option.setAttribute('aria-label', color);
    option.dataset.color = color;

    const swatch = document.createElement('span');
    swatch.className = 'color-swatch';
    swatch.style.backgroundColor = COLOR_HEX[color];
    swatch.setAttribute('aria-hidden', 'true');
    option.append(swatch);
    option.addEventListener('click', () => {
      category.color = color;
      updateSelectedColor();
      colorMenu.hidden = true;
      colorButton.setAttribute('aria-expanded', 'false');
      colorButton.focus();
      scheduleSave();
    });
    colorMenu.append(option);
  }

  colorButton.addEventListener('click', () => {
    colorMenu.hidden = !colorMenu.hidden;
    colorButton.setAttribute('aria-expanded', String(!colorMenu.hidden));
  });
  colorPicker.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !colorMenu.hidden) {
      colorMenu.hidden = true;
      colorButton.setAttribute('aria-expanded', 'false');
      colorButton.focus();
    }
  });
  colorPicker.append(colorButton, colorMenu);
  updateSelectedColor();

  const emoji = document.createElement('input');
  emoji.className = 'emoji-input';
  emoji.value = category.emoji;
  emoji.ariaLabel = 'Emoji';
  emoji.placeholder = '❔';
  emoji.addEventListener('input', () => {
    category.emoji = emoji.value.trim();
    scheduleSave();
  });

  const name = document.createElement('input');
  name.className = 'name-input';
  name.value = category.name;
  name.ariaLabel = 'Tag name';
  name.placeholder = 'Tag name';
  name.maxLength = 50;
  name.addEventListener('input', () => {
    category.name = name.value.trim();
    scheduleSave();
  });

  const remove = document.createElement('button');
  remove.className = 'icon-button';
  remove.title = 'Remove category';
  remove.ariaLabel = 'Remove category';
  remove.append(svgIcon(faTrash));
  remove.addEventListener('click', () => {
    categories = categories.filter((c) => c.id !== category.id);
    render();
    scheduleSave();
  });

  rowChecks.push(() => {
    const emojiOk = isSingleEmoji(category.emoji);
    const nameOk = category.name.length > 0;
    emoji.ariaInvalid = String(!emojiOk);
    name.ariaInvalid = String(!nameOk);
    return emojiOk && nameOk;
  });

  row.append(colorPicker, emoji, name, remove);
  return row;
}

function render(): void {
  if (!list) return;
  rowChecks = [];
  list.replaceChildren(...categories.map(createRow));
}

addButton?.prepend(svgIcon(faPlus));
addButton?.addEventListener('click', () => {
  categories.push({
    id: crypto.randomUUID(),
    name: '',
    emoji: '',
    color: 'blue',
  });
  render();
  list
    ?.querySelector<HTMLInputElement>('.category-row:last-child .emoji-input')
    ?.focus();
});

document.addEventListener('click', (event) => {
  if (
    event.target instanceof Element &&
    event.target.closest('.color-picker')
  ) {
    return;
  }
  document
    .querySelectorAll<HTMLButtonElement>(
      '.color-picker-trigger[aria-expanded="true"]',
    )
    .forEach((button) => {
      button.setAttribute('aria-expanded', 'false');
      const menu = button.nextElementSibling;
      if (menu instanceof HTMLElement) menu.hidden = true;
    });
});

categories = await loadCategories();
render();

onCategoriesChanged((updated) => {
  // Skip updates while editing or when they merely echo our own save.
  if (list?.contains(document.activeElement)) return;
  if (JSON.stringify(updated) === JSON.stringify(categories)) return;
  categories = updated;
  render();
});
