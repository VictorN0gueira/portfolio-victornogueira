// @vitest-environment node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { BLOG_IMAGE_HOSTS, BLOG_IMG_SRC, CLOUDINARY_HOST, CLOUDINARY_PATH_PREFIX } from '../../config/blogImageHosts.mjs';
import {
  BLOG_FEED_ORIGINS,
  CONTENT_SECURITY_POLICY,
  CSP_DIRECTIVES,
  HSTS_VALUE,
  META_CONTENT_SECURITY_POLICY,
  N8N_ORIGIN,
  SECURITY_HEADERS,
  cspMetaTag,
  injectCspMeta,
  renderCsp,
  renderNginxSnippet,
} from '../../config/securityHeaders.mjs';
import { WEBHOOKS } from '../lib/contact';
import { safeImageUrl } from '../utils/newsSanitize';

// config/securityHeaders.mjs is the single source of the security headers: nginx (through the generated snippet),
// `vite preview` and the GitHub Pages meta tag all read it. These tests pin the policy itself and tie it to the
// origins the code really contacts, so a new fetch to a new host fails here before it fails in production.

const ROOT = resolve(__dirname, '../..');
const read = (file: string) => readFileSync(resolve(ROOT, file), 'utf8');

/** The directive map of a policy text, as name to the list of its sources. */
function parseCsp(policy: string): Record<string, string[]> {
  return Object.fromEntries(
    policy
      .split(';')
      .map((part) => part.trim().split(/\s+/))
      .filter(([name]) => name !== '')
      .map(([name, ...sources]) => [name, sources]),
  );
}

describe('the content security policy', () => {
  const policy = parseCsp(CONTENT_SECURITY_POLICY);

  it('denies everything by default and runs no inline or eval script', () => {
    expect(policy['default-src']).toEqual(["'self'"]);
    expect(policy['script-src']).toEqual(["'self'"]);
    expect(CONTENT_SECURITY_POLICY).not.toMatch(/unsafe-eval|script-src[^;]*unsafe-inline/);
  });

  it('forbids framing, plugins, foreign bases and foreign form targets', () => {
    expect(policy['frame-ancestors']).toEqual(["'none'"]);
    expect(policy['frame-src']).toEqual(["'none'"]);
    expect(policy['object-src']).toEqual(["'none'"]);
    expect(policy['base-uri']).toEqual(["'self'"]);
    expect(policy['form-action']).toEqual(["'self'"]);
    expect(policy['upgrade-insecure-requests']).toEqual([]);
  });

  it('self hosts fonts, and lets only the lead webhooks and the blog feeds be fetched', () => {
    expect(policy['font-src']).toEqual(["'self'"]);
    expect(policy['connect-src']).toEqual(["'self'", N8N_ORIGIN, ...BLOG_FEED_ORIGINS]);
  });

  it('lets images come from the site itself, data: and exactly the hosts of the blog allow list, never every https host', () => {
    expect(policy['img-src']).toEqual(["'self'", ...BLOG_IMG_SRC]);
    expect(policy['img-src']).not.toContain('https:');
    expect(CONTENT_SECURITY_POLICY).not.toMatch(/img-src[^;]*\shttps:(\s|;|$)/);
    for (const host of BLOG_IMAGE_HOSTS) expect(policy['img-src'], host).toContain(`https://${host}`);
    expect(policy['img-src']).toContain('data:');
  });

  it('allows an image from every host safeImageUrl accepts, and the policy lists no host the sanitizer would refuse', () => {
    const accepted = BLOG_IMAGE_HOSTS.map((host) => safeImageUrl(`https://${host}${host === CLOUDINARY_HOST ? CLOUDINARY_PATH_PREFIX : '/'}x.jpg`));
    expect(accepted.every((url) => url !== '')).toBe(true);
    const origins = (policy['img-src'] ?? []).filter((source) => source.startsWith('https://'));
    expect(origins.sort()).toEqual(BLOG_IMAGE_HOSTS.map((host) => `https://${host}`).sort());
  });

  it('allows no wildcard source and no origin that is not https', () => {
    const sources = Object.values(policy).flat();
    expect(sources.filter((source) => source.includes('*'))).toEqual([]);
    expect(sources.filter((source) => source.startsWith('http:'))).toEqual([]);
  });

  it('does not allow GNews: its key must never ship in the bundle', () => {
    expect(CONTENT_SECURITY_POLICY).not.toContain('gnews.io');
  });

  it('allows the n8n origin only to connect, never to load scripts or images', () => {
    for (const [name, sources] of Object.entries(policy)) {
      if (name !== 'connect-src') expect(sources, name).not.toContain(N8N_ORIGIN);
    }
  });

  it('renders a directive without sources as the bare keyword', () => {
    expect(renderCsp({ 'default-src': ["'self'"], 'upgrade-insecure-requests': [] })).toBe("default-src 'self'; upgrade-insecure-requests");
  });
});

describe('the origins the code contacts', () => {
  const connectSources = CSP_DIRECTIVES['connect-src'];

  it('lets the two lead webhooks through connect-src', () => {
    for (const url of Object.values(WEBHOOKS)) expect(connectSources).toContain(new URL(url).origin);
  });

  it('covers every origin the blog service fetches (no GNews call with a baked key is left in the client)', () => {
    const source = read('src/utils/newsService.ts');
    const fetched = [...source.matchAll(/(?:fetch\(\s*|EDGE_FUNCTION_URL = )['"`](https:\/\/[^/'"`]+)/g)].map((match) => match[1]);
    expect(fetched.length).toBeGreaterThanOrEqual(3);
    const uncovered = [...new Set(fetched)].filter((origin) => !connectSources.includes(origin));
    expect(uncovered).toEqual([]);
    expect(source).not.toContain('gnews.io');
  });

  it('lists the origin of every fetch in the lead and blog code', () => {
    const files = ['src/lib/contact.ts', 'src/utils/newsService.ts'];
    for (const file of files) {
      const hosts = [...read(file).matchAll(/fetch\(\s*['"`](https:\/\/[^/'"`]+)/g)].map((match) => match[1]);
      for (const host of hosts) {
        expect(connectSources, `${file}: ${host}`).toContain(host);
      }
    }
  });
});

describe('the other security headers', () => {
  it('sends the clickjacking, sniffing, referrer, permissions and opener headers', () => {
    expect(SECURITY_HEADERS['X-Frame-Options']).toBe('DENY');
    expect(SECURITY_HEADERS['X-Content-Type-Options']).toBe('nosniff');
    expect(SECURITY_HEADERS['Referrer-Policy']).toBe('strict-origin-when-cross-origin');
    expect(SECURITY_HEADERS['Cross-Origin-Opener-Policy']).toBe('same-origin');
    expect(SECURITY_HEADERS['Permissions-Policy']).toBe('camera=(), microphone=(), geolocation=(), payment=(), usb=()');
    expect(SECURITY_HEADERS['Content-Security-Policy']).toBe(CONTENT_SECURITY_POLICY);
  });

  it('keeps HSTS out of the sent headers: it belongs where TLS ends', () => {
    expect(Object.keys(SECURITY_HEADERS)).not.toContain('Strict-Transport-Security');
    expect(HSTS_VALUE).toMatch(/^max-age=\d+; includeSubDomains$/);
  });
});

describe('the nginx snippet', () => {
  const snippet = renderNginxSnippet();

  it('is exactly what is committed in nginx/security-headers.conf', () => {
    expect(read('nginx/security-headers.conf')).toBe(snippet);
  });

  it('adds every header with `always`, so error answers carry them too', () => {
    const directives = snippet.split('\n').filter((line) => line.startsWith('add_header '));
    expect(directives).toHaveLength(Object.keys(SECURITY_HEADERS).length);
    for (const line of directives) expect(line).toMatch(/^add_header [A-Za-z-]+ ".*" always;$/);
    for (const [name, value] of Object.entries(SECURITY_HEADERS)) expect(snippet).toContain(`add_header ${name} "${value}" always;`);
  });

  it('documents HSTS as a comment and never enables it', () => {
    expect(snippet).toContain(`# add_header Strict-Transport-Security "${HSTS_VALUE}" always;`);
    expect(snippet.split('\n').filter((line) => /^add_header Strict-Transport-Security/.test(line))).toEqual([]);
  });

  it('writes values nginx can read inside double quotes', () => {
    for (const value of Object.values(SECURITY_HEADERS)) expect(value).not.toMatch(/["\\$]/);
  });
});

describe('the GitHub Pages meta policy', () => {
  it('is the header policy without frame-ancestors, which a meta tag cannot carry', () => {
    const header = parseCsp(CONTENT_SECURITY_POLICY);
    const meta = parseCsp(META_CONTENT_SECURITY_POLICY);
    expect(meta['frame-ancestors']).toBeUndefined();
    const withoutFrameAncestors = Object.fromEntries(Object.entries(header).filter(([name]) => name !== 'frame-ancestors'));
    expect(meta).toEqual(withoutFrameAncestors);
  });

  it('is injected once, after the charset (which must stay in the first 1024 bytes) and before everything else', () => {
    const html = '<!doctype html><html><head>\n    <meta charset="UTF-8" />\n    <title>x</title>\n  </head><body></body></html>';
    const result = injectCspMeta(html);
    expect(result.indexOf('<meta charset')).toBeLessThan(result.indexOf(cspMetaTag()));
    expect(result.indexOf(cspMetaTag())).toBeLessThan(result.indexOf('<title>'));
    expect(result.split('Content-Security-Policy').length - 1).toBe(1);
  });

  it('goes first in the head when the page declares no charset', () => {
    const result = injectCspMeta('<html><head><title>x</title></head></html>');
    expect(result.indexOf(cspMetaTag())).toBeLessThan(result.indexOf('<title>'));
  });

  it('refuses a page without a head instead of silently skipping the policy', () => {
    expect(() => injectCspMeta('<html></html>')).toThrow(/head/);
  });
});
