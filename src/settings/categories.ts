import { icon } from '@fortawesome/fontawesome-svg-core';
import {
  faBan,
  faGripVertical,
  faPlus,
  faTrash,
} from '@fortawesome/free-solid-svg-icons';
import {
  isSingleEmoji,
  loadCategories,
  onCategoriesChanged,
  saveCategories,
  TAB_GROUP_COLORS,
  type Category,
  type TabGroupColor,
} from '../shared/categories';
import { COLOR_HEX } from '../shared/colors';
import { capitalizeString } from '../shared/text';

const SAVE_DELAY_MS = 300;
const TOAST_DURATION_MS = 5000;
const POPULAR_EMOJIS: string[] = [
  '⭐',
  '❤️',
  '🔥',
  '🎉',
  '💡',
  '✅',
  '🔖',
  '🎵',
  '☕',
  '💼',
  '🛒',
  '🎬',
  '🏠',
  '✈️',
  '🌐',
  '📌',
  '🔔',
  '🏷️',
  '🔑',
  '🔒',
  '⚙️',
  '🛠️',
  '🔧',
  '🔨',
  '🧰',
  '💻',
  '🖥️',
  '🖨️',
  '⌨️',
  '🖱️',
  '📱',
  '☎️',
  '📡',
  '🔋',
  '🔌',
  '📷',
  '🎥',
  '🎧',
  '🎮',
  '🎨',
  '📚',
  '📖',
  '📕',
  '📗',
  '📘',
  '📙',
  '📄',
  '📝',
  '📁',
  '📂',
  '🗂️',
  '📊',
  '📈',
  '📅',
  '📆',
  '🗓️',
  '⏰',
  '💰',
  '💎',
  '🎁',
  '🌸',
  '🌻',
  '🌹',
  '🍀',
  '🌙',
  '☀️',
  '⚡',
  '💧',
  '❄️',
  '🍎',
  '🍕',
  '🍔',
  '🍰',
  '🍓',
  '🍉',
  '🍵',
  '🥑',
  '🍩',
  '🐶',
  '🐱',
  '🦊',
  '⚽',
  '🏀',
  '🎹',
  '🏆',
  '🚀',
  '🚗',
  '🚲',
  '🚆',
  '⛺',
  '🗺️',
  '🧳',
  '🏢',
  '🏫',
  '🛏️',
  '🧹',
];

let categories: Category[] = [];
let rowChecks: (() => boolean)[] = [];
let saveTimer: number | undefined;
let draggedId: string | null = null;

const list = document.getElementById('category-list');
const toast = document.getElementById('toast');
const toastMessage = toast?.querySelector<HTMLElement>('.toast__message');
const toastClose = toast?.querySelector<HTMLButtonElement>('.toast__close');
const addButton = document.getElementById('category-add');
let toastTimer: number | undefined;

function hideToast(): void {
  window.clearTimeout(toastTimer);
  toast?.classList.remove('is-visible');
}

function startToastTimer(): void {
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(hideToast, TOAST_DURATION_MS);
}

function setStatus(text: string, kind?: 'success' | 'warning' | 'error'): void {
  if (!toast || !toastMessage) return;

  toastMessage.textContent = text;
  toast.dataset.kind = kind ?? 'error';
  toast.classList.add('is-visible');
  startToastTimer();
}

toastClose?.addEventListener('click', hideToast);
// Keep the toast open while the user is reading or interacting with it.
toast?.addEventListener('pointerenter', () => window.clearTimeout(toastTimer));
toast?.addEventListener('pointerleave', () => {
  if (toast.classList.contains('is-visible')) startToastTimer();
});
toast?.addEventListener('focusin', () => window.clearTimeout(toastTimer));
toast?.addEventListener('focusout', () => {
  if (toast.classList.contains('is-visible')) startToastTimer();
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && toast?.classList.contains('is-visible')) {
    hideToast();
  }
});

function scheduleSave(): void {
  window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => {
    // Evaluate every row so all invalid fields get highlighted.
    const valid = rowChecks.map((check) => check()).every(Boolean);
    if (!valid) {
      setStatus('Fix the highlighted fields to save.', 'warning');
      return;
    }
    saveCategories(categories).then(
      () => setStatus('Changes successfully saved.', 'success'),
      () => setStatus('Could not save categories.', 'error'),
    );
  }, SAVE_DELAY_MS);
}

function createRow(category: Category): HTMLLIElement {
  const row = document.createElement('li');
  row.className = 'category-row';
  row.dataset.id = category.id;

  const handle = document.createElement('span');
  handle.className = 'drag-handle';
  handle.tabIndex = 0;
  handle.draggable = true;
  handle.setAttribute('role', 'button');
  handle.setAttribute(
    'aria-label',
    'Reorder category. Drag it, or press Arrow Up or Arrow Down.',
  );
  handle.title = 'Drag to reorder';
  handle.append(icon(faGripVertical).node[0] as Node);
  handle.addEventListener('dragstart', (event) => {
    draggedId = category.id;
    event.dataTransfer?.setData('text/plain', category.id);
    if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer?.setDragImage(row, 0, 0);
    requestAnimationFrame(() => row.classList.add('is-dragging'));
  });
  handle.addEventListener('dragend', clearDragState);
  handle.addEventListener('keydown', (event) => {
    if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
    event.preventDefault();
    const index = categories.findIndex((c) => c.id === category.id);
    const target = index + (event.key === 'ArrowUp' ? -1 : 1);
    if (target < 0 || target >= categories.length) return;
    moveCategory(category.id, target);
    list
      ?.querySelector<HTMLElement>(`[data-id="${category.id}"] .drag-handle`)
      ?.focus();
  });

  row.addEventListener('dragover', (event) => {
    if (!draggedId || draggedId === category.id) return;
    event.preventDefault();
    const after = isDropAfter(event, row);
    row.classList.toggle('drop-before', !after);
    row.classList.toggle('drop-after', after);
  });
  row.addEventListener('dragleave', () => {
    row.classList.remove('drop-before', 'drop-after');
  });
  row.addEventListener('drop', (event) => {
    if (!draggedId || draggedId === category.id) return;
    event.preventDefault();
    const after = isDropAfter(event, row);
    const from = categories.findIndex((c) => c.id === draggedId);
    const to = categories.findIndex((c) => c.id === category.id);
    const insertAt = to + (after ? 1 : 0) - (from < to ? 1 : 0);
    const movedId = draggedId;
    clearDragState();
    moveCategory(movedId, insertAt);
  });

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
    selectedSwatch.classList.toggle(
      'color-swatch-none',
      category.color === null,
    );
    selectedSwatch.style.backgroundColor = category.color
      ? COLOR_HEX[category.color]
      : '';
    for (const option of colorMenu.querySelectorAll<HTMLButtonElement>(
      '[data-color]',
    )) {
      option.setAttribute(
        'aria-pressed',
        String((option.dataset.color || null) === category.color),
      );
    }
  };

  const colorOptions: (TabGroupColor | null)[] = [...TAB_GROUP_COLORS, null];
  for (const color of colorOptions) {
    const option = document.createElement('button');
    option.type = 'button';
    option.className = 'color-option';
    option.setAttribute('aria-label', color ?? 'No color');
    option.title = capitalizeString(
      color ?? 'No color (Do not change group color)',
    );
    option.dataset.color = color ?? '';

    const swatch = document.createElement('span');
    swatch.className = 'color-swatch';
    if (color) {
      swatch.style.backgroundColor = COLOR_HEX[color];
    } else {
      swatch.classList.add('color-swatch-none');
    }
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
  emoji.placeholder = '';
  emoji.addEventListener('input', () => {
    category.emoji = emoji.value.trim();
    scheduleSave();
  });

  const emojiPicker = document.createElement('div');
  emojiPicker.className = 'emoji-picker';

  const emojiMenu = document.createElement('div');
  emojiMenu.className = 'emoji-menu';
  emojiMenu.id = `emoji-options-${category.id}`;
  emojiMenu.setAttribute('role', 'group');
  emojiMenu.setAttribute('aria-label', 'Popular emoji');
  emojiMenu.hidden = true;
  emoji.setAttribute('aria-haspopup', 'true');
  emoji.setAttribute('aria-expanded', 'false');
  emoji.setAttribute('aria-controls', emojiMenu.id);

  const setEmojiMenuOpen = (open: boolean) => {
    emojiMenu.hidden = !open;
    emoji.setAttribute('aria-expanded', String(open));
  };

  for (const symbol of POPULAR_EMOJIS) {
    const option = document.createElement('button');
    option.type = 'button';
    option.className = 'emoji-option';
    option.setAttribute('aria-label', symbol ?? 'No icon');
    option.title = symbol ?? 'No icon';
    if (symbol) {
      option.textContent = symbol;
    } else {
      option.classList.add('emoji-option-none');
      const noIcon = icon(faBan).node[0] as SVGElement;
      noIcon.setAttribute('aria-hidden', 'true');
      option.append(noIcon);
    }
    option.addEventListener('pointerdown', (event) => event.preventDefault());
    option.addEventListener('click', () => {
      emoji.value = symbol ?? '';
      category.emoji = symbol ?? '';
      scheduleSave();
      setEmojiMenuOpen(false);
      emoji.focus();
    });
    emojiMenu.append(option);
  }

  emoji.addEventListener('focus', () => setEmojiMenuOpen(true));
  emoji.addEventListener('click', () => setEmojiMenuOpen(true));
  emoji.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !emojiMenu.hidden) {
      setEmojiMenuOpen(false);
    }
  });
  emojiPicker.append(emoji, emojiMenu);

  const name = document.createElement('input');
  name.className = 'name-input';
  name.value = category.name;
  name.ariaLabel = 'Category name';
  name.placeholder = 'Category name';
  name.maxLength = 50;
  const save = () => {
    category.name = name.value.trim();
    scheduleSave();
  };
  name.addEventListener('input', save);
  name.addEventListener('focusout', save);

  const remove = document.createElement('button');
  remove.className = 'icon-button remove-category';
  remove.title = 'Remove category';
  remove.ariaLabel = 'Remove category';
  remove.append(icon(faTrash).node[0] as Node);
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

  row.append(handle, colorPicker, emojiPicker, name, remove);
  return row;
}

function isDropAfter(event: DragEvent, row: HTMLElement): boolean {
  const rect = row.getBoundingClientRect();
  return event.clientY > rect.top + rect.height / 2;
}

function clearDragState(): void {
  draggedId = null;
  list
    ?.querySelectorAll('.is-dragging, .drop-before, .drop-after')
    .forEach((el) =>
      el.classList.remove('is-dragging', 'drop-before', 'drop-after'),
    );
}

function moveCategory(id: string, targetIndex: number): void {
  const from = categories.findIndex((c) => c.id === id);
  if (from < 0 || from === targetIndex) return;
  const [moved] = categories.splice(from, 1);
  if (!moved) return;
  categories.splice(targetIndex, 0, moved);
  render();
  scheduleSave();
}

function render(): void {
  if (!list) return;
  rowChecks = [];
  list.replaceChildren(...categories.map(createRow));
}

addButton?.prepend(icon(faPlus).node[0] as Node);
addButton?.addEventListener('click', () => {
  categories.push({
    id: crypto.randomUUID(),
    name: '',
    emoji: '',
    color: 'blue',
  });
  render();
  const emojiInput = list?.querySelector<HTMLInputElement>(
    '.category-row:last-child .emoji-input',
  );
  if (emojiInput) requestAnimationFrame(() => emojiInput.focus());
});

document.addEventListener('click', (event) => {
  if (
    event.target instanceof Element &&
    event.target.closest('.color-picker, .emoji-picker')
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
  document
    .querySelectorAll<HTMLInputElement>('.emoji-input[aria-expanded="true"]')
    .forEach((input) => {
      input.setAttribute('aria-expanded', 'false');
      const menu = document.getElementById(
        input.getAttribute('aria-controls') ?? '',
      );
      if (menu) menu.hidden = true;
    });
});

document.addEventListener('focusin', (event) => {
  const focusedPicker =
    event.target instanceof Element
      ? event.target.closest('.emoji-picker')
      : null;
  document
    .querySelectorAll<HTMLInputElement>('.emoji-input[aria-expanded="true"]')
    .forEach((input) => {
      if (input.closest('.emoji-picker') === focusedPicker) return;
      input.setAttribute('aria-expanded', 'false');
      const menu = document.getElementById(
        input.getAttribute('aria-controls') ?? '',
      );
      if (menu) menu.hidden = true;
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
