import { faBan } from '@fortawesome/free-solid-svg-icons';
import type { Category } from '../../shared/categories';
import { iconNode, listen } from '../../shared/dom';
import { POPULAR_EMOJIS } from '../../shared/emojis';

const OPEN_EMOJI_INPUT_SELECTOR = '.emoji-input[aria-expanded="true"]';

/** Closes every open emoji menu, except the one inside `keepOpen`. */
export function closeEmojiMenus(keepOpen: Element | null = null): void {
  for (const input of document.querySelectorAll<HTMLInputElement>(
    OPEN_EMOJI_INPUT_SELECTOR,
  )) {
    if (keepOpen && input.closest('.emoji-picker') === keepOpen) continue;
    input.setAttribute('aria-expanded', 'false');
    const menu = document.getElementById(
      input.getAttribute('aria-controls') ?? '',
    );
    if (menu) menu.hidden = true;
  }
}

function createEmojiOption(symbol: string | null): HTMLButtonElement {
  const option = document.createElement('button');
  option.type = 'button';
  option.className = 'emoji-option';
  option.title = symbol ?? 'No icon';
  option.setAttribute('aria-label', symbol ?? 'No icon');

  if (symbol) {
    option.textContent = symbol;
  } else {
    option.classList.add('emoji-option-none');
    const noIcon = iconNode(faBan);
    noIcon.setAttribute('aria-hidden', 'true');
    option.append(noIcon);
  }

  // Keep focus on the input so the menu doesn't close before the click lands.
  listen(option, 'pointerdown', (event) => event.preventDefault());
  return option;
}

export function createEmojiPicker(
  category: Category,
  onChange: () => void,
): { picker: HTMLDivElement; input: HTMLInputElement } {
  const picker = document.createElement('div');
  picker.className = 'emoji-picker';

  const menu = document.createElement('div');
  menu.className = 'emoji-menu';
  menu.id = `emoji-options-${category.id}`;
  menu.hidden = true;
  menu.setAttribute('role', 'group');
  menu.setAttribute('aria-label', 'Popular emoji');

  const input = document.createElement('input');
  input.className = 'emoji-input';
  input.value = category.emoji;
  input.ariaLabel = 'Emoji';
  input.setAttribute('aria-haspopup', 'true');
  input.setAttribute('aria-expanded', 'false');
  input.setAttribute('aria-controls', menu.id);

  const setMenuOpen = (open: boolean): void => {
    menu.hidden = !open;
    input.setAttribute('aria-expanded', String(open));
  };

  for (const symbol of POPULAR_EMOJIS) {
    const option = createEmojiOption(symbol);
    listen(option, 'click', () => {
      input.value = symbol ?? '';
      category.emoji = symbol ?? '';
      onChange();
      setMenuOpen(false);
      input.focus();
    });
    menu.append(option);
  }

  listen(input, 'input', () => {
    category.emoji = input.value.trim();
    onChange();
  });
  listen(input, 'focus', () => setMenuOpen(true));
  listen(input, 'click', () => setMenuOpen(true));
  listen(input, 'keydown', (event) => {
    if (event.key === 'Escape' && !menu.hidden) setMenuOpen(false);
  });

  picker.append(input, menu);
  return { picker, input };
}
