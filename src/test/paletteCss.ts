/** The eight colors of the VN One palette, as lowercase #rrggbb. */
export const PALETTE = new Set(['#ffffff', '#f2f2f2', '#c7c7c7', '#8a8a8a', '#4d4d4d', '#1a1a1a', '#0a0a0a', '#00e5a0']);

const HEX_LITERAL = /#[0-9a-fA-F]+\b/g;
const RGB_LITERAL = /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/g;

/** Lowercase #rrggbb for a hex literal, or null when its length is not a valid color length. */
export function toSixDigitHex(literal: string): string | null {
  const digits = literal.slice(1).toLowerCase();
  if (digits.length === 3) return `#${[...digits].map((digit) => digit + digit).join('')}`;
  if (digits.length === 6) return `#${digits}`;
  // 8 digits are 6 color digits plus an alpha pair: only the color part is compared.
  if (digits.length === 8) return `#${digits.slice(0, 6)}`;
  return null;
}

export function findHexLiterals(css: string): string[] {
  return [...css.matchAll(HEX_LITERAL)].map((match) => match[0]);
}

export function findRgbLiterals(css: string): string[] {
  return [...css.matchAll(RGB_LITERAL)].map((match) => match[0]);
}

/** The hex literals of a stylesheet that are not a palette color. */
export function offPaletteHex(css: string): string[] {
  return findHexLiterals(css).filter((literal) => {
    const color = toSixDigitHex(literal);
    return color === null || !PALETTE.has(color);
  });
}

/** The rgb() and rgba() literals of a stylesheet whose channels are not a palette color. */
export function offPaletteRgb(css: string): string[] {
  return [...css.matchAll(RGB_LITERAL)]
    .filter((match) => {
      const color = `#${[match[1], match[2], match[3]].map((channel) => Number(channel).toString(16).padStart(2, '0')).join('')}`;
      return !PALETTE.has(color);
    })
    .map((match) => match[0]);
}
