import { icon, type IconDefinition } from '@fortawesome/fontawesome-svg-core';

export function iconNode(definition: IconDefinition): Element {
  return icon(definition).node[0] as Element;
}

export function listen<K extends keyof HTMLElementEventMap>(
  target: EventTarget,
  type: K,
  handler: (event: HTMLElementEventMap[K]) => void | Promise<void>,
): void {
  target.addEventListener(type, (event) => {
    Promise.resolve(handler(event as HTMLElementEventMap[K])).catch(
      (error: unknown) => {
        console.error(`Unhandled error in "${type}" handler.`, error);
      },
    );
  });
}
