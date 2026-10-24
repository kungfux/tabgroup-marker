import { faTrash } from '@fortawesome/free-solid-svg-icons';
import { isSingleEmoji, type Category } from '../../shared/categories';
import { iconNode, listen } from '../../shared/dom';
import { createColorPicker } from './color-picker';
import { createDragDrop, type DragDrop } from './drag-drop';
import { createEmojiPicker } from './emoji-picker';
import type { CategoryStore } from './store';

const MAX_NAME_LENGTH = 50;

function createNameInput(
  category: Category,
  onChange: () => void,
): HTMLInputElement {
  const input = document.createElement('input');
  input.className = 'name-input';
  input.value = category.name;
  input.ariaLabel = 'Category name';
  input.placeholder = 'Category name';
  input.maxLength = MAX_NAME_LENGTH;

  const commitName = (): void => {
    category.name = input.value.trim();
    onChange();
  };
  listen(input, 'input', commitName);
  listen(input, 'focusout', commitName);

  return input;
}

function createRemoveButton(
  category: Category,
  store: CategoryStore,
): HTMLButtonElement {
  const button = document.createElement('button');
  button.className = 'icon-button remove-category';
  button.title = 'Remove category';
  button.ariaLabel = 'Remove category';
  button.append(iconNode(faTrash));

  listen(button, 'click', () => store.remove(category.id));

  return button;
}

function createRow(
  category: Category,
  store: CategoryStore,
  dragDrop: DragDrop,
): HTMLLIElement {
  const row = document.createElement('li');
  row.className = 'category-row';
  row.dataset.id = category.id;

  const onChange = store.scheduleSave;
  const handle = dragDrop.createHandle(category, row);
  const colorPicker = createColorPicker(category, onChange);
  const { picker: emojiPicker, input: emojiInput } = createEmojiPicker(
    category,
    onChange,
  );
  const nameInput = createNameInput(category, onChange);
  const removeButton = createRemoveButton(category, store);

  dragDrop.attachDropTarget(row, category);

  store.registerRowCheck(() => {
    const emojiOk = isSingleEmoji(category.emoji);
    const nameOk = category.name.length > 0;
    emojiInput.ariaInvalid = String(!emojiOk);
    nameInput.ariaInvalid = String(!nameOk);
    return emojiOk && nameOk;
  });

  row.append(handle, colorPicker, emojiPicker, nameInput, removeButton);
  return row;
}

/** Renders the rows now and again whenever the list structure changes. */
export function setupRows(list: HTMLElement, store: CategoryStore): void {
  const dragDrop = createDragDrop(list, store);

  const render = (): void => {
    list.replaceChildren(
      ...store.categories.map((category) =>
        createRow(category, store, dragDrop),
      ),
    );
  };

  store.onChange(render);
  render();
}
