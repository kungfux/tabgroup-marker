import { faGripVertical } from '@fortawesome/free-solid-svg-icons';
import type { Category } from '../../shared/categories';
import { iconNode, listen } from '../../shared/dom';
import type { CategoryStore } from './store';

const DRAG_STATE_CLASSES = ['is-dragging', 'drop-before', 'drop-after'];
const DRAG_STATE_SELECTOR = DRAG_STATE_CLASSES.map((c) => `.${c}`).join(', ');

export interface DragDrop {
  createHandle(category: Category, row: HTMLElement): HTMLSpanElement;
  attachDropTarget(row: HTMLElement, category: Category): void;
}

function isDropAfter(event: DragEvent, row: HTMLElement): boolean {
  const rect = row.getBoundingClientRect();
  return event.clientY > rect.top + rect.height / 2;
}

export function createDragDrop(
  list: HTMLElement,
  store: CategoryStore,
): DragDrop {
  let draggedId: string | null = null;

  function clearDragState(): void {
    draggedId = null;
    for (const element of list.querySelectorAll(DRAG_STATE_SELECTOR)) {
      element.classList.remove(...DRAG_STATE_CLASSES);
    }
  }

  function focusDragHandle(id: string): void {
    list.querySelector<HTMLElement>(`[data-id="${id}"] .drag-handle`)?.focus();
  }

  function createHandle(category: Category, row: HTMLElement): HTMLSpanElement {
    const handle = document.createElement('span');
    handle.className = 'drag-handle';
    handle.tabIndex = 0;
    handle.draggable = true;
    handle.title = 'Drag to reorder';
    handle.setAttribute('role', 'button');
    handle.setAttribute(
      'aria-label',
      'Reorder category. Drag it, or press Arrow Up or Arrow Down.',
    );
    handle.append(iconNode(faGripVertical));

    listen(handle, 'dragstart', (event) => {
      draggedId = category.id;
      const { dataTransfer } = event;
      if (dataTransfer) {
        dataTransfer.setData('text/plain', category.id);
        dataTransfer.effectAllowed = 'move';
        dataTransfer.setDragImage(row, 0, 0);
      }
      requestAnimationFrame(() => row.classList.add('is-dragging'));
    });

    listen(handle, 'dragend', clearDragState);

    listen(handle, 'keydown', (event) => {
      if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
      event.preventDefault();

      const index = store.categories.findIndex((c) => c.id === category.id);
      const target = index + (event.key === 'ArrowUp' ? -1 : 1);
      if (target < 0 || target >= store.categories.length) return;

      store.move(category.id, target);
      focusDragHandle(category.id);
    });

    return handle;
  }

  function attachDropTarget(row: HTMLElement, category: Category): void {
    listen(row, 'dragover', (event) => {
      if (!draggedId || draggedId === category.id) return;
      event.preventDefault();
      const after = isDropAfter(event, row);
      row.classList.toggle('drop-before', !after);
      row.classList.toggle('drop-after', after);
    });

    listen(row, 'dragleave', () => {
      row.classList.remove('drop-before', 'drop-after');
    });

    listen(row, 'drop', (event) => {
      if (!draggedId || draggedId === category.id) return;
      event.preventDefault();

      const after = isDropAfter(event, row);
      const from = store.categories.findIndex((c) => c.id === draggedId);
      const to = store.categories.findIndex((c) => c.id === category.id);
      const insertAt = to + (after ? 1 : 0) - (from < to ? 1 : 0);
      const movedId = draggedId;

      clearDragState();
      store.move(movedId, insertAt);
    });
  }

  return { createHandle, attachDropTarget };
}
