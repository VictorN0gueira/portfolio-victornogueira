export interface TocEntry {
  id: string;
  label: string;
}

const FALLBACK_SLUG = 'secao';
const COMBINING_MARKS = /[̀-ͯ]/g;
const NOT_ALPHANUMERIC = /[^a-z0-9]+/g;
const EDGE_HYPHENS = /^-+|-+$/g;
const WHITE_SPACE = /\s+/g;

/** 'Quem é o controlador' becomes 'quem-e-o-controlador'. Never empty: a title with no letters falls back to a fixed word. */
export function slugify(label: string): string {
  const slug = label
    .normalize('NFD')
    .replace(COMBINING_MARKS, '')
    .toLowerCase()
    .replace(NOT_ALPHANUMERIC, '-')
    .replace(EDGE_HYPHENS, '');
  return slug === '' ? FALLBACK_SLUG : slug;
}

const textOf = (element: Element): string => (element.textContent ?? '').replace(WHITE_SPACE, ' ').trim();

// The one shape of the frozen markup where the title is a name and the words that say what the section is are the small
// line above it: the black card of the controller on /lgpd ("Controlador dos dados", then "Victor Nogueira"). It is read
// from the rendered classes, and it is not applied to any other title ("Seus direitos" has a kicker too, and the title says it better).
const KICKER_CLASS = 'text-[10px]';
const BLACK_CARD = '[class*="bg-zinc-950"]';

/** The small line right above the title, when the title is in a black card and that line is a kicker. Otherwise null. */
function kickerOf(heading: Element): string | null {
  const previous = heading.previousElementSibling;
  if (previous === null || previous.tagName !== 'P' || !previous.classList.contains(KICKER_CLASS)) return null;
  if (heading.closest(BLACK_CARD) === null) return null;
  return textOf(previous) || null;
}

const labelOf = (heading: Element): string => kickerOf(heading) ?? textOf(heading);

/** The h2 of the root that have text, in document order: the ones the table of contents points at. */
export function tocHeadings(root: ParentNode): HTMLHeadingElement[] {
  return Array.from(root.querySelectorAll<HTMLHeadingElement>('h2')).filter((heading) => textOf(heading) !== '');
}

/** The first of slug, slug-2, slug-3 and so on that no earlier heading took and no other element of the page owns. */
function uniqueId(slug: string, heading: Element, taken: ReadonlySet<string>): string {
  const isFree = (id: string): boolean => {
    if (taken.has(id)) return false;
    const owner = heading.ownerDocument.getElementById(id);
    return owner === null || owner === heading;
  };
  let candidate = slug;
  for (let count = 2; !isFree(candidate); count += 1) candidate = `${slug}-${count}`;
  return candidate;
}

/**
 * The table of contents of what is on the screen: one entry per h2 of the root, read from the rendered text. It is never a
 * copy of the titles in a file of its own (a copy of legal text could drift from the text it points at). It only reads:
 * putting the ids on the headings is the job of the hook.
 */
export function collectToc(root: ParentNode): TocEntry[] {
  const taken = new Set<string>();
  return tocHeadings(root).map((heading) => {
    const id = uniqueId(slugify(labelOf(heading)), heading, taken);
    taken.add(id);
    return { id, label: labelOf(heading) };
  });
}
