// Checks on the id wiring of a piece of DOM: which ids repeat, and which reference (a label's `for`, an aria-controls,
// aria-describedby or aria-labelledby) points at nothing. Tests use these instead of pinning an id, so an id may change
// (the contact form takes its ids from React's useId) while the wiring stays proven.

const REFERENCING_ATTRIBUTES = ['aria-controls', 'aria-describedby', 'aria-labelledby'] as const;

const findById = (root: ParentNode, id: string) => root.querySelector(`[id="${id}"]`);

/** Every reference of `root` whose id is not on any element of `root`, as `attribute=id` (a label is `for=id`). */
export function danglingReferences(root: ParentNode): string[] {
  const dangling: string[] = [];
  for (const attribute of REFERENCING_ATTRIBUTES) {
    for (const element of root.querySelectorAll(`[${attribute}]`)) {
      for (const id of (element.getAttribute(attribute) ?? '').split(/\s+/).filter(Boolean)) {
        if (!findById(root, id)) dangling.push(`${attribute}=${id}`);
      }
    }
  }
  for (const label of root.querySelectorAll('label[for]')) {
    const id = label.getAttribute('for') ?? '';
    if (!findById(root, id)) dangling.push(`for=${id}`);
  }
  return dangling;
}

/** The ids that more than one element of `root` carries, leaving out `allowed` (ids a protected file fixes). */
export function duplicateIds(root: ParentNode, allowed: readonly string[] = []): string[] {
  const seen = new Set<string>();
  const repeated = new Set<string>();
  for (const element of root.querySelectorAll('[id]')) {
    if (allowed.includes(element.id)) continue;
    if (seen.has(element.id)) repeated.add(element.id);
    seen.add(element.id);
  }
  return [...repeated];
}

/** The elements that the `aria-describedby` of `element` points at, in order. Fails the test through `null` when one is missing. */
export function describedByElements(element: Element): (Element | null)[] {
  const root = element.getRootNode() as ParentNode;
  return (element.getAttribute('aria-describedby') ?? '')
    .split(/\s+/)
    .filter(Boolean)
    .map((id) => findById(root, id));
}
