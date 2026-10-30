/**
 * A pause of `ms` milliseconds that ends at once when the visitor leaves: the tab goes hidden (another app, a locked
 * screen, a tab switch) or the page is going away (pagehide). The timer of a hidden page may be slowed down or never
 * fire, and a page that is closing never reaches it, so a request held for the time trap would be lost.
 * `release` ends the pause by hand: the form calls it when it is unmounted by an in-app navigation.
 */
export function holdUnlessLeaving(ms: number): { done: Promise<void>; release: () => void } {
  let release = () => {};
  const done = new Promise<void>((resolve) => {
    const finish = () => {
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('pagehide', finish);
      resolve();
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        finish();
      }
    };
    const timer = setTimeout(finish, ms);
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('pagehide', finish);
    release = finish;
  });
  return { done, release };
}
