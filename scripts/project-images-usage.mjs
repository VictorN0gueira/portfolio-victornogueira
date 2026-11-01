// Which images of the manifest does src/data/projects.ts still show? A text scan, conservative on purpose:
// any string literal equal to a key, in any quote style, counts as a use (even inside a comment), and a file
// that builds a key at run time (a template with ${...}, or literals joined with +) cannot be judged, so the scan
// refuses instead of guessing.
import { existsSync, readFileSync } from 'node:fs';

const STRING_LITERAL = /'((?:\\.|[^'\\\n])*)'|"((?:\\.|[^"\\\n])*)"|`((?:\\.|[^`\\])*)`/g;
const JOINED_LITERALS = /['"`]\s*\+|\+\s*['"`]/;

export class UsageScanError extends Error {}

/** Every string literal of a source text, whatever its quotes. Throws when a literal is built at run time. */
export function stringLiterals(source) {
  const literals = new Set();
  for (const match of source.matchAll(STRING_LITERAL)) {
    const text = match[1] ?? match[2] ?? match[3] ?? '';
    if (match[3] !== undefined && text.includes('${')) {
      throw new UsageScanError('it builds a string with a template (${...}): the keys it uses cannot be told');
    }
    literals.add(text);
  }
  if (JOINED_LITERALS.test(source)) throw new UsageScanError('it joins string literals with +: the keys it uses cannot be told');
  return literals;
}

/** The keys (of the given list) that the source text uses. */
export function findUsedKeys(source, keys) {
  const literals = stringLiterals(source);
  return keys.filter((key) => literals.has(key));
}

/** The same, for a file. A file that is missing or cannot be scanned is an error: the caller must refuse. */
export function findUsedKeysInFile(file, keys) {
  if (!existsSync(file)) throw new UsageScanError(`${file} does not exist`);
  return findUsedKeys(readFileSync(file, 'utf8'), keys);
}
