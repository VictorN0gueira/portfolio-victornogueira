/**
 * True when `pathname` is the page a nav item points at or one of its sub pages, so /projetos stays
 * current on /projetos/troco. An item that carries a hash (/#metodo) is a section of a page, never the
 * current page.
 */
export function isNavCurrent(to: string, pathname: string): boolean {
  if (to.includes('#')) return false;

  return pathname === to || pathname.startsWith(`${to}/`);
}
