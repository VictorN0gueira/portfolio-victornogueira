// Any mention of the accent: the token (bg-vn-accent, text-[var(--color-vn-accent)]), the hex (bg-[#00E5A0]) or
// the rgb form jsdom writes an inline hex color back as.
const ACCENT_PATTERN = /vn-accent|00e5a0|rgba?\(\s*0\s*,\s*229\s*,\s*160/i;

/** True when the name or the value of any attribute of the element mentions the accent, whatever the attribute is. */
function hasAccentAttribute(element: Element): boolean {
  return element.getAttributeNames().some((name) => ACCENT_PATTERN.test(name) || ACCENT_PATTERN.test(element.getAttribute(name) ?? ''));
}

/** True for a style element whose text mentions the accent (a rule, a custom property or a keyframe). */
function hasAccentStyleText(element: Element): boolean {
  return element.localName === 'style' && ACCENT_PATTERN.test(element.textContent ?? '');
}

/**
 * Every element of the subtree (the root included) that names the accent: in any attribute, whichever it is (class,
 * style, fill, stroke, stop-color, flood-color, lighting-color, a data attribute, ...) or in the text of a style element.
 * It is at least as strict as scanning the innerHTML of the root, without the false positives of the text of the page.
 */
export function findAccentElements(root: HTMLElement): Element[] {
  return [root, ...Array.from(root.querySelectorAll('*'))].filter(
    (element) => hasAccentAttribute(element) || hasAccentStyleText(element),
  );
}
