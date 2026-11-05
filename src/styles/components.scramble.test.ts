// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { blockBody, declarations } from '../test/css';
import { componentsCss } from '../test/styles';

// The frame of the scramble of the 404 title is generated content (src/components/NotFound.tsx): not in textContent, in
// the selection or in the translation. Chromium also gives generated text to assistive technology unless the content
// has an empty alternative, so the rule says it twice: a browser that does not know the `/ ""` syntax drops that one
// declaration and keeps the first, instead of dropping the whole rule and leaving the real word hidden.
describe('.vn-scramble-word in components.css', () => {
  const frame = declarations(blockBody(componentsCss, '.vn-scramble-word::after'));

  it('is the frame of the word, from data-scramble, with an empty alternative so it is decoration for assistive tech', () => {
    const contents = frame.filter((line) => line.startsWith('content:'));

    expect(contents).toEqual(['content: attr(data-scramble)', 'content: attr(data-scramble) / ""']);
  });

  it('is clipped to the box of the real word, so a wide frame never passes the edge of the screen', () => {
    expect(frame).toContain('overflow: hidden');
    expect(frame).toContain('position: absolute');
    expect(frame).toContain('inset: 0');
  });

  it('does not take clicks or the selection, and keeps the word on one line', () => {
    expect(frame).toContain('pointer-events: none');
    expect(frame).toContain('white-space: nowrap');
  });

  it('puts the frame over the word that sizes the line: the word is its containing block', () => {
    expect(declarations(blockBody(componentsCss, '.vn-scramble-word'))).toContain('position: relative');
  });
});
