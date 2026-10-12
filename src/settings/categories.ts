import { faPlus, faTrash } from '@fortawesome/free-solid-svg-icons';
import {
  isSingleEmoji,
  loadCategories,
  onCategoriesChanged,
  saveCategories,
  TAB_GROUP_COLORS,
  type Category,
  type TabGroupColor,
} from '../shared/categories';
import { svgIcon } from '../shared/toolbar';

const COLOR_HEX: Record<TabGroupColor, string> = {
  grey: '#5f6368',
  blue: '#1a73e8',
  red: '#d93025',
  yellow: '#f9ab00',
  green: '#188038',
  pink: '#d01884',
  purple: '#9334e6',
  cyan: '#007b83',
  orange: '#fa7b17',
};

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

  const swatch = document.createElement('span');
  swatch.className = 'color-swatch';

  const color = document.createElement('select');
  color.ariaLabel = 'Color';
  for (const name of TAB_GROUP_COLORS) {
    const option = new Option(name, name, false, name === category.color);
    color.append(option);
  }
  const applyColor = () => {
    swatch.style.backgroundColor = COLOR_HEX[category.color];
  };
  applyColor();
  color.addEventListener('change', () => {
    category.color = color.value as TabGroupColor;
    applyColor();
    scheduleSave();
  });

  const emoji = document.createElement('input');
  emoji.className = 'emoji-input';
  emoji.value = category.emoji;
  emoji.ariaLabel = 'Emoji';
  emoji.placeholder = '🌍';
  emoji.addEventListener('input', () => {
    category.emoji = emoji.value.trim();
    scheduleSave();
  });

  const name = document.createElement('input');
  name.className = 'name-input';
  name.value = category.name;
  name.ariaLabel = 'Category name';
  name.placeholder = 'Category name';
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

  row.append(swatch, color, emoji, name, remove);
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

categories = await loadCategories();
render();

onCategoriesChanged((updated) => {
  // Skip updates while editing or when they merely echo our own save.
  if (list?.contains(document.activeElement)) return;
  if (JSON.stringify(updated) === JSON.stringify(categories)) return;
  categories = updated;
  render();
});
