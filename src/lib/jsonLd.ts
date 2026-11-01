const LESS_THAN = /</g;
const LINE_SEPARATOR = new RegExp(String.fromCharCode(0x2028), 'g');
const PARAGRAPH_SEPARATOR = new RegExp(String.fromCharCode(0x2029), 'g');

/**
 * JSON for a `<script type="application/ld+json">`. JSON.stringify leaves `<` alone, so a string that holds `</script>`
 * would close the element (and one that holds `<!--` could open a comment) the day the page is rendered to HTML, or its
 * text comes from somewhere other than a constant. `<` is written as the escape u003c, which JSON.parse reads back as the
 * same character. The line separator and the paragraph separator (U+2028 and U+2029) are valid in JSON but were line
 * terminators in script text before ES2019: they are escaped too.
 */
export function serializeJsonLd(value: unknown): string {
  return JSON.stringify(value)
    .replace(LESS_THAN, '\\u003c')
    .replace(LINE_SEPARATOR, '\\u2028')
    .replace(PARAGRAPH_SEPARATOR, '\\u2029');
}
