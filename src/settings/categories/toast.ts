import { listen } from '../../shared/dom';

export type ToastKind = 'success' | 'warning' | 'error';
export type Notify = (text: string, kind?: ToastKind) => void;

const TOAST_DURATION_MS = 5000;

export function createToast(): Notify {
  const toast = document.getElementById('toast');
  const message = toast?.querySelector<HTMLElement>('.toast__message');
  const close = toast?.querySelector<HTMLButtonElement>('.toast__close');
  let timer: number | undefined;

  const isVisible = (): boolean =>
    toast?.classList.contains('is-visible') ?? false;

  function pauseTimer(): void {
    window.clearTimeout(timer);
  }

  function startTimer(): void {
    pauseTimer();
    timer = window.setTimeout(hide, TOAST_DURATION_MS);
  }

  function resumeTimer(): void {
    if (isVisible()) startTimer();
  }

  function hide(): void {
    pauseTimer();
    toast?.classList.remove('is-visible');
  }

  if (toast) {
    if (close) listen(close, 'click', hide);

    listen(toast, 'pointerenter', pauseTimer);
    listen(toast, 'pointerleave', resumeTimer);
    listen(toast, 'focusin', pauseTimer);
    listen(toast, 'focusout', resumeTimer);

    listen(document, 'keydown', (event) => {
      if (event.key === 'Escape' && isVisible()) hide();
    });
  }

  return (text, kind = 'error') => {
    if (!toast || !message) return;

    message.textContent = text;
    toast.dataset.kind = kind;
    toast.classList.add('is-visible');
    startTimer();
  };
}
