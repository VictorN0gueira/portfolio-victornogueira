// Any mention of the accent: the token (bg-vn-accent, text-[var(--color-vn-accent)]), the hex (bg-[#00E5A0]) or
// the rgb form jsdom writes an inline hex color back as.
const ACCENT_PATTERN = /vn-accent|00e5a0|rgba?\(\s*0\s*,\s*229\s*,\s*160/i;

/** Every element of the subtree that names the accent in its class, its inline style or an svg paint attribute. */
export function findAccentElements(root: HTMLElement): Element[] {
  return Array.from(root.querySelectorAll('*')).filter((element) =>
    ['class', 'style', 'fill', 'stroke', 'color'].some((name) => ACCENT_PATTERN.test(element.getAttribute(name) ?? '')),
  );
}
