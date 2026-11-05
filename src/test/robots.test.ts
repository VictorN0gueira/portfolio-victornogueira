// @vitest-environment node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { SITE } from '../lib/site';

// robots.txt decides what a crawler may fetch, not what it may index. The blog is out of the index with a noindex tag, and
// Google can only see that tag on a page it is allowed to fetch: a Disallow on /blog would keep the page in the results
// as a bare url. The scripts and styles (/assets) and the icons must be fetchable too, or Google renders a blank page and
// finds no icon.

const ROBOTS = readFileSync(resolve(__dirname, '../../public/robots.txt'), 'utf8');
const LINES = ROBOTS.split('\n').map((line) => line.trim());
const DISALLOWED = LINES.filter((line) => /^disallow:/i.test(line)).map((line) => line.replace(/^disallow:\s*/i, ''));
const MUST_STAY_CRAWLABLE = ['/blog', '/assets/index-AAA.js', '/brand/favicon-48.png', '/favicon.ico', '/site.webmanifest', '/servicos', '/'];

/** True when a Disallow rule (a path prefix, an empty value allows everything) covers the path. */
const blocks = (rule: string, path: string) => rule !== '' && path.startsWith(rule);

describe('public/robots.txt', () => {
  it('speaks to every crawler and allows the site', () => {
    expect(LINES).toContain('User-agent: *');
    expect(LINES).toContain('Allow: /');
  });

  it('points at the absolute sitemap of the site, on its own host', () => {
    const sitemap = LINES.filter((line) => /^sitemap:/i.test(line));

    expect(sitemap).toEqual([`Sitemap: ${SITE.url}/sitemap.xml`]);
    expect(sitemap[0]).toMatch(/^Sitemap: https:\/\//);
  });

  it.each(MUST_STAY_CRAWLABLE)('does not disallow %s', (path) => {
    for (const rule of DISALLOWED) expect(blocks(rule, path), `${rule} covers ${path}`).toBe(false);
  });

  it('has no Disallow at all, so nothing can be blocked by accident later', () => {
    expect(DISALLOWED).toEqual([]);
  });

  it('writes no dash and no URL of another host', () => {
    expect(ROBOTS).not.toMatch(/—|–/);
    expect(ROBOTS.match(/https?:\/\/[^\s]+/g)).toEqual([`${SITE.url}/sitemap.xml`]);
  });
});
