// @vitest-environment node
import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  BLOG_IMAGE_HOSTS,
  BLOG_IMG_SRC,
  CLOUDINARY_HOST,
  CLOUDINARY_PATH_PREFIX,
} from '../../config/blogImageHosts.mjs';
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

const FETCH_CALL = /fetch\s*\(/;
const SOURCE_FILE = /\.tsx?$/;
const TEST_FILE = /\.test\.tsx?$|^src\/test\//;

/** The non-test files of the client that call fetch( : every one is checked, wherever a call moves to. */
function sourceFilesWithFetch(): string[] {
  return readdirSync(resolve(ROOT, 'src'), { recursive: true })
    .map((entry) => `src/${String(entry).replaceAll('\\', '/')}`)
    .filter((file) => SOURCE_FILE.test(file) && !TEST_FILE.test(file))
    .filter((file) => FETCH_CALL.test(read(file)));
}

/** Every non-test file of the client, with its text. */
function allClientFiles(): Array<{ file: string; code: string }> {
  return readdirSync(resolve(ROOT, 'src'), { recursive: true })
    .map((entry) => `src/${String(entry).replaceAll('\\', '/')}`)
    .filter((file) => SOURCE_FILE.test(file) && !TEST_FILE.test(file))
    .map((file) => ({ file, code: read(file) }));
}

// The tripwire for the ways out of the page that are not fetch: the content security policy is the real enforcement.
const OTHER_NETWORK_CALL = /XMLHttpRequest|sendBeacon|new\s+WebSocket|new\s+EventSource|import\s*\(\s*['"`]https?:/;

function otherNetworkCalls(files: Array<{ file: string; code: string }>): string[] {
  return files.filter(({ code }) => OTHER_NETWORK_CALL.test(code)).map(({ file }) => file);
}

/** The https origins a piece of code fetches: a literal in the call, a template, or a constant (typed or not) of the same file. */
function fetchedOrigins(code: string): string[] {
  const origins = new Set<string>();
  for (const match of code.matchAll(/fetch\s*\(\s*['"`](https:\/\/[^/'"`]+)/g)) origins.add(match[1]);
  for (const call of code.matchAll(/fetch\s*\(\s*([A-Za-z_$][\w$]*)\s*[,)]/g)) {
    const constant = new RegExp(`(?:const|let|var)\\s+${call[1]}\\s*(?::[^=]+)?=\\s*['"\`](https://[^/'"\`]+)`).exec(
      code,
    );
    if (constant) origins.add(constant[1]);
  }
  return [...origins];
}

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
    const accepted = BLOG_IMAGE_HOSTS.map((host) =>
      safeImageUrl(`https://${host}${host === CLOUDINARY_HOST ? CLOUDINARY_PATH_PREFIX : '/'}x.jpg`),
    );
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
    expect(renderCsp({ 'default-src': ["'self'"], 'upgrade-insecure-requests': [] })).toBe(
      "default-src 'self'; upgrade-insecure-requests",
    );
  });
});

describe('the origins the code contacts', () => {
  const connectSources = CSP_DIRECTIVES['connect-src'];

  it('lets the two lead webhooks through connect-src', () => {
    for (const url of Object.values(WEBHOOKS)) expect(connectSources).toContain(new URL(url).origin);
  });

  it('covers every origin any file of the client fetches (no GNews call with a baked key is left)', () => {
    const origins = new Set<string>();
    for (const file of sourceFilesWithFetch()) for (const origin of fetchedOrigins(read(file))) origins.add(origin);

    // The edge function of the blog, dev.to and TabNews are the third party origins the client reads from.
    expect(origins.size).toBeGreaterThanOrEqual(3);
    expect([...origins].filter((origin) => !connectSources.includes(origin))).toEqual([]);
    for (const file of sourceFilesWithFetch()) expect(read(file), file).not.toContain('gnews.io');
  });

  it('finds the origin of a fetch whether it is written in place, in a template or in a constant of the file', () => {
    const code = [
      "fetch('https://a.example/x')",
      'fetch(`https://b.example/y?z=${1}`)',
      "const FEED_URL = 'https://c.example/feed';",
      'await fetch(FEED_URL, { method: "GET" })',
      'fetch(someVariable)',
      "const TYPED_URL: string = 'https://d.example/t';",
      'fetch (TYPED_URL)',
      "fetch ('https://e.example/s')",
    ].join('\n');

    expect(fetchedOrigins(code).sort()).toEqual([
      'https://a.example',
      'https://b.example',
      'https://c.example',
      'https://d.example',
      'https://e.example',
    ]);
  });

  it('has no other way out of the page in the client: no XMLHttpRequest, sendBeacon, WebSocket, EventSource or http import', () => {
    expect(otherNetworkCalls(allClientFiles())).toEqual([]);
  });

  it('finds each of those other ways out in a piece of code', () => {
    for (const code of [
      'new XMLHttpRequest()',
      'navigator.sendBeacon(url)',
      'new WebSocket(url)',
      "new EventSource('/x')",
      "await import('https://cdn.example/x.js')",
    ]) {
      expect(otherNetworkCalls([{ file: 'planted.ts', code }]), code).toHaveLength(1);
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
    for (const [name, value] of Object.entries(SECURITY_HEADERS))
      expect(snippet).toContain(`add_header ${name} "${value}" always;`);
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
    const withoutFrameAncestors = Object.fromEntries(
      Object.entries(header).filter(([name]) => name !== 'frame-ancestors'),
    );
    expect(meta).toEqual(withoutFrameAncestors);
  });

  it('is injected once, after the charset (which must stay in the first 1024 bytes) and before everything else', () => {
    const html =
      '<!doctype html><html><head>\n    <meta charset="UTF-8" />\n    <title>x</title>\n  </head><body></body></html>';
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
