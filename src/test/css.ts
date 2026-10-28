/**
 * Body of the block whose header is exactly `header` (a selector list or an at-rule prelude), found by brace matching,
 * so an at-rule with nested rules works too. A header that only ends a longer selector (`.x .vn-card` for `.vn-card`)
 * does not count, and neither does a selector that only appears as a later item of a comma separated list.
 * With `mustContain` it is the first such block whose body holds that text: a stylesheet may have several at-rules with
 * the same prelude (two `@media (hover: hover) and ...` gates), and a test should pick the one it is about, not the one
 * that happens to come first. Returns an empty string when nothing matches.
 */
export function blockBody(source: string, header: string, mustContain = ''): string {
  const escaped = header.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`(^|\\n)[ \\t]*${escaped} \\{`, 'g');
  const candidates = [...source.matchAll(pattern)].filter(
    (candidate) => !source.slice(0, candidate.index).trimEnd().endsWith(','),
  );

  for (const match of candidates) {
    const body = bodyAfter(source, match.index + match[0].length - 1);
    if (body.includes(mustContain)) return body;
  }
  return '';
}

/** The text between the brace at `open` and its matching closing brace, or an empty string when it never closes. */
function bodyAfter(source: string, open: number): string {
  let depth = 0;
  for (let index = open; index < source.length; index += 1) {
    if (source[index] === '{') depth += 1;
    if (source[index] === '}') depth -= 1;
    if (depth === 0) return source.slice(open + 1, index);
  }
  return '';
}

/** The `property: value` declarations of a flat rule body, as trimmed strings. */
export function declarations(body: string): string[] {
  return body
    .split(';')
    .map((line) => line.trim())
    .filter(Boolean);
}

/**
 * Body of the first rule of `source` whose comma separated selector list holds `selector`, wherever it sits in the list
 * (`blockBody` only finds a rule by its whole header). Rules with nested blocks are not matched; search the body of the
 * at-rule instead. Returns an empty string when no rule has that selector.
 */
export function ruleWithSelector(source: string, selector: string): string {
  const rules = [...source.matchAll(/([^{}]+)\{([^{}]*)\}/g)];

  return rules.find(([, selectors]) => selectors.split(',').some((item) => item.trim() === selector))?.[2] ?? '';
}
