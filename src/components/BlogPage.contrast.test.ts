// @vitest-environment node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

// jsdom paints nothing, so contrast cannot be measured there. What can be held is the choice of colors: the blog sits on
// near black, where the muted zinc greys (500 to 700) fall under 4.5:1 and the old green and blue badges under white text
// fall under it too. Text uses the vn tokens (gray-light on dark) and the accent only as a color on black.
const SOURCE = readFileSync(resolve(__dirname, 'BlogPage.tsx'), 'utf8');

describe('BlogPage colors', () => {
  it('has no zinc 500, 600 or 700 on the dark page, for text, icons or the placeholder', () => {
    const found = SOURCE.match(/(?:text|placeholder:text)-zinc-(?:500|600|700)/g);

    expect(found).toBeNull();
  });

  it('has no white text on a green or blue badge, and no amber or cyan accent outside the vn accent', () => {
    const found = SOURCE.match(/(?:from|to|text)-(?:amber|cyan|emerald|teal|blue)-\d+|bg-emerald-\d+/g);

    expect(found).toBeNull();
  });

  it('uses a vn token for the placeholder of the search field', () => {
    expect(SOURCE).toMatch(/placeholder:text-vn-gray-(?:light|mid)/);
  });
});
