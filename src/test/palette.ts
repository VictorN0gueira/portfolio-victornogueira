// An allow-list of the colors a class string may use: every color utility must name a VN One token (`vn-*`), white,
// transparent, current or inherit, with or without an opacity suffix. The accent is a token too, so a test that must keep
// it out of a surface checks that apart (see accent.ts).
//
// How it decides: a class is examined when its utility prefix can carry a color (bg, text, border, ring, outline, fill,
// stroke, accent, shadow, caret, decoration, divide, placeholder, from, via, to). Its value is then either a known
// non-color one (text-base, border-2, shadow-2xl, outline-offset-2, ...) or it must be an allowed color. A value that is
// neither (gray-500, black, blue-500, a hex) is reported, so a utility nobody listed fails loudly instead of slipping by.

const COLOR_UTILITY =
  /^(bg|text|border(?:-[trblxyse])?|ring(?:-offset)?|outline|fill|stroke|accent|shadow|caret|decoration|divide|placeholder|from|via|to)-(.+)$/;

const ALLOWED_COLOR = /^(?:vn-[a-z-]+|white|transparent|current|inherit)$/;

// The values of each prefix that are not colors. Anything else under these prefixes has to be an allowed color.
const NON_COLOR_VALUES: Record<string, RegExp> = {
  bg: /^(?:none|fixed|local|scroll|auto|cover|contain|center|top|bottom|left|right|(?:top|bottom)-(?:left|right)|(?:no-)?repeat(?:-[xy]|-round|-space)?|clip-[\w-]+|origin-[\w-]+|blend-[\w-]+|size-.+|position-.+|linear-.+|radial-.+|conic-.+|gradient-.+)$/,
  text: /^(?:xs|sm|base|lg|\d?xl|left|center|right|justify|start|end|wrap|nowrap|balance|pretty|ellipsis|clip)$/,
  border: /^(?:[trblxyse]|\d+|solid|dashed|dotted|double|hidden|none|collapse|separate|spacing-.+)$/,
  ring: /^(?:\d+|inset)$/,
  'ring-offset': /^\d+$/,
  outline: /^(?:\d+|solid|dashed|dotted|double|hidden|none|offset-\d+)$/,
  shadow: /^(?:2xs|xs|sm|md|lg|xl|2xl|inner|none)$/,
  fill: /^none$/,
  stroke: /^(?:none|\d+)$/,
  accent: /^auto$/,
  decoration: /^(?:\d+|solid|double|dotted|dashed|wavy|auto|from-font)$/,
  divide: /^(?:x|y|x-\d+|y-\d+|\d+|solid|dashed|dotted|double|none|x-reverse|y-reverse)$/,
  from: /^\d+%$/,
  via: /^\d+%$/,
  to: /^\d+%$/,
};

// A color written inside an arbitrary value: a hex, a color function or a color variable that is not a VN One token.
const FOREIGN_COLOR_IN_ARBITRARY = /#[0-9a-f]{3,8}\b|\b(?:rgba?|hsla?|oklch|oklab|lab|lch|color)\(|var\(--color-(?!vn-)/i;

/** The part of a class after its last variant (`md:hover:bg-x` -> `bg-x`), ignoring colons inside brackets. */
function stripVariants(token: string): string {
  let depth = 0;
  let cut = -1;
  for (let index = 0; index < token.length; index += 1) {
    const char = token[index];
    if (char === '[' || char === '(') depth += 1;
    else if (char === ']' || char === ')') depth -= 1;
    else if (char === ':' && depth === 0) cut = index;
  }
  return token.slice(cut + 1);
}

function isOffPalette(utility: string): boolean {
  const match = COLOR_UTILITY.exec(utility.replace(/^[!-]+/, ''));
  if (!match) return false;

  const [, prefix, rawValue] = match;
  const value = rawValue.replace(/\/(?:\d+|\[[^\]]+\])$/, '');
  if (value.startsWith('[') && value.endsWith(']')) return FOREIGN_COLOR_IN_ARBITRARY.test(value);
  if (NON_COLOR_VALUES[prefix]?.test(value)) return false;
  return !ALLOWED_COLOR.test(value);
}

/** The classes of a space separated class string that use a color outside the palette. */
export function offPaletteClasses(classNames: string): string[] {
  return classNames
    .split(/\s+/)
    .filter(Boolean)
    .filter((token) => isOffPalette(stripVariants(token)));
}

/** The same for every `class="..."` attribute of an HTML string (a container's innerHTML). */
export function offPaletteInHtml(html: string): string[] {
  return [...html.matchAll(/\sclass="([^"]*)"/g)].flatMap(([, classNames]) => offPaletteClasses(classNames));
}
