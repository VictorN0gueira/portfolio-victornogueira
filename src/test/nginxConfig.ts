// A small reader of nginx.conf for the unit tests (no nginx binary is assumed): it turns the text into blocks and
// directives, and picks the location that serves a path with the same rules nginx uses.

export interface Directive {
  name: string;
  args: string[];
}

export interface Block {
  name: string;
  args: string[];
  directives: Directive[];
  blocks: Block[];
}

const TOKEN = /"[^"]*"|'[^']*'|[{};]|[^\s{};"']+/g;

function tokens(text: string): string[] {
  const withoutComments = text
    .split('\n')
    .map((line) => line.replace(/^\s*#.*$/, ''))
    .join('\n');
  return withoutComments.match(TOKEN) ?? [];
}

const unquote = (value: string) => value.replace(/^(["'])(.*)\1$/, '$2');

/** The tree of an nginx config text. Throws on unbalanced braces or a missing semicolon. */
export function parseNginx(text: string): Block {
  const root: Block = { name: 'root', args: [], directives: [], blocks: [] };
  const stack: Block[] = [root];
  let words: string[] = [];
  for (const token of tokens(text)) {
    const current = stack[stack.length - 1];
    if (token === ';') {
      if (words.length === 0) throw new Error('empty directive');
      current.directives.push({ name: words[0], args: words.slice(1).map(unquote) });
      words = [];
    } else if (token === '{') {
      if (words.length === 0) throw new Error('block without a name');
      const block: Block = { name: words[0], args: words.slice(1).map(unquote), directives: [], blocks: [] };
      current.blocks.push(block);
      stack.push(block);
      words = [];
    } else if (token === '}') {
      if (words.length > 0) throw new Error(`missing semicolon after "${words.join(' ')}"`);
      if (stack.length === 1) throw new Error('unbalanced closing brace');
      stack.pop();
    } else {
      words.push(token);
    }
  }
  if (stack.length !== 1) throw new Error('unbalanced opening brace');
  if (words.length > 0) throw new Error(`missing semicolon after "${words.join(' ')}"`);
  return root;
}

export const serverOf = (root: Block): Block => {
  const server = root.blocks.find((block) => block.name === 'server');
  if (!server) throw new Error('no server block');
  return server;
};

export const directivesOf = (block: Block, name: string): Directive[] => block.directives.filter((directive) => directive.name === name);

/** Where the location matches: an exact one, a prefix (with or without ^~) or a regex (case sensitive or not). */
export type LocationKind = 'exact' | 'prefix' | 'prefix-stop' | 'regex' | 'regex-insensitive';

export interface Location {
  kind: LocationKind;
  pattern: string;
  block: Block;
}

export function locationsOf(server: Block): Location[] {
  return server.blocks
    .filter((block) => block.name === 'location')
    .map((block) => {
      const [first, second] = block.args;
      if (second === undefined) return { kind: 'prefix' as const, pattern: first, block };
      const kinds: Record<string, LocationKind> = { '=': 'exact', '^~': 'prefix-stop', '~': 'regex', '~*': 'regex-insensitive' };
      const kind = kinds[first];
      if (!kind) throw new Error(`unknown location modifier ${first}`);
      return { kind, pattern: second, block };
    });
}

/** nginx picks: an exact match; else the longest prefix, which wins outright if it is ^~; else the first regex; else that prefix. */
export function pickLocation(server: Block, path: string): Location | undefined {
  const locations = locationsOf(server);
  const exact = locations.find((location) => location.kind === 'exact' && location.pattern === path);
  if (exact) return exact;
  const prefixes = locations.filter((location) => (location.kind === 'prefix' || location.kind === 'prefix-stop') && path.startsWith(location.pattern));
  const longest = prefixes.sort((a, b) => b.pattern.length - a.pattern.length)[0];
  if (longest?.kind === 'prefix-stop') return longest;
  const regex = locations.find(
    (location) =>
      (location.kind === 'regex' && new RegExp(location.pattern).test(path)) ||
      (location.kind === 'regex-insensitive' && new RegExp(location.pattern, 'i').test(path)),
  );
  return regex ?? longest;
}

/** The value of the Cache-Control header a location adds, if any. */
export function cacheControlOf(block: Block): string | undefined {
  const header = directivesOf(block, 'add_header').find((directive) => directive.args[0].toLowerCase() === 'cache-control');
  return header?.args[1];
}
