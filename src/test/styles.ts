import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { blockBody } from './css';

const STYLES_DIR = resolve(__dirname, '../styles');
const STILL_VARIANT = '@variant vn-still';

/** A stylesheet of src/styles, as text. */
export function readStyle(name: 'tokens' | 'components' | 'motion'): string {
  return readFileSync(resolve(STYLES_DIR, `${name}.css`), 'utf8');
}

export const tokensCss = readStyle('tokens');
export const componentsCss = readStyle('components');
export const motionCss = readStyle('motion');

/** The three stylesheets one after the other, in the order index.css imports them. For tests about a rule wherever it lives. */
export const allStylesCss = `${tokensCss}\n${componentsCss}\n${motionCss}`;

interface TopLevelRule {
  header: string;
  body: string;
}

/** The rules of a stylesheet at depth 0 (comments left in the header text), found by brace matching. */
function topLevelRules(source: string): TopLevelRule[] {
  const rules: TopLevelRule[] = [];
  let depth = 0;
  let headerStart = 0;
  let bodyStart = 0;
  for (let index = 0; index < source.length; index += 1) {
    if (source[index] === '{') {
      if (depth === 0) bodyStart = index + 1;
      depth += 1;
    } else if (source[index] === '}') {
      depth -= 1;
      if (depth === 0) {
        const header = source.slice(headerStart, bodyStart - 1).replace(/\/\*[\s\S]*?\*\//g, '').trim();
        rules.push({ header, body: source.slice(bodyStart, index) });
        headerStart = index + 1;
      }
    } else if (source[index] === ';' && depth === 0) {
      headerStart = index + 1;
    }
  }
  return rules;
}

/** The bodies of the top level rules whose header is `header` (a string, or a test on the header text). */
export function topRulesWithHeader(source: string, header: string | ((header: string) => boolean)): string[] {
  const matches = typeof header === 'string' ? (text: string) => text === header : header;
  return topLevelRules(source)
    .filter((rule) => matches(rule.header))
    .map((rule) => rule.body);
}

/**
 * The bodies of every top level rule of `source` whose selector list holds `selector`, one after the other (a selector has
 * its base rule in components.css and its motion off rule in motion.css). Empty when there is none.
 */
export function ruleBodyFor(source: string, selector: string): string {
  return topLevelRules(source)
    .filter((candidate) => candidate.header.split(',').some((item) => item.trim() === selector))
    .map((rule) => rule.body)
    .join('\n');
}

/**
 * What the motion off list (motion.css) does to `selector`: the body of the `@variant vn-still` block inside the rule
 * whose selector list holds it (`.a, .b { @variant vn-still { ... } }`). Empty when the selector is not on the list.
 */
export function stillBody(selector: string): string {
  return blockBody(ruleBodyFor(motionCss, selector), STILL_VARIANT);
}

/** The body of the root level `@variant vn-still { ... }` block, which holds the universal reset. */
export function stillUniversalBody(): string {
  return topLevelRules(motionCss).find((rule) => rule.header === STILL_VARIANT)?.body ?? '';
}
