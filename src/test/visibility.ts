/**
 * Makes the document report `state` as its visibility and tells the listeners, like a tab going to the background and
 * coming back. The getter lives on the document itself, so a test puts the real one back with
 * `Reflect.deleteProperty(document, 'visibilityState')` in an afterEach.
 */
export function setVisibility(state: DocumentVisibilityState): void {
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => state });
  document.dispatchEvent(new Event('visibilitychange'));
}
