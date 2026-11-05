// @vitest-environment node
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SECURITY_HEADERS } from '../../config/securityHeaders.mjs';
import { runSmoke } from '../../scripts/smoke-container.mjs';

// scripts/smoke-container.mjs is what CI runs against the real image. Here it runs against a small server that behaves
// as nginx.conf promises, then against variants with one promise broken, so the smoke check itself is known to fail
// when the image is wrong (a check that never fails proves nothing).

interface Faults {
  dropHeader?: string;
  immutableOn404?: boolean;
  noRedirect?: boolean;
  longCacheOnImage?: boolean;
  openDotFile?: boolean;
  versionedServer?: boolean;
  staleIndex?: boolean;
  unknownRouteIs200?: boolean;
  unknownRouteWithoutNoindex?: boolean;
  sameHeadOnEveryRoute?: boolean;
  blogWithoutNoindex?: boolean;
  blogInSitemap?: boolean;
  slashNotRedirected?: boolean;
  wwwNotRedirected?: boolean;
  wwwToHttp?: boolean;
  noFavicon?: boolean;
  robotsBlocksBlog?: boolean;
  openGitConfig?: boolean;
  error404Page?: boolean;
  binaryManifest?: boolean;
}

const SCRIPT = '<script type="module" src="/assets/index-AAA.js"></script>';
const ROOT = '<div id="root"></div>';
const NOINDEX = '<meta name="robots" content="noindex, nofollow" data-static-seo />';
const head = (title: string, extra = '') => `<!doctype html><title data-static-seo>${title}</title>${extra}${SCRIPT}${ROOT}`;
const canonical = (path: string) => `<link rel="canonical" href="https://vnone.com.br${path}" data-static-seo />`;
const LD = '<script type="application/ld+json" data-static-seo>{}</script>';
let server: Server | undefined;

function answer(request: IncomingMessage, response: ServerResponse, faults: Faults) {
  const headers: Record<string, string> = { ...SECURITY_HEADERS, Server: faults.versionedServer ? 'nginx/1.27.1' : 'nginx' };
  if (faults.dropHeader) delete headers[faults.dropHeader];
  const [path, query] = (request.url ?? '/').split('?');
  const send = (status: number, extra: Record<string, string>, body = '') => {
    response.writeHead(status, { ...headers, ...extra });
    response.end(body);
  };
  const html = { 'Content-Type': 'text/html', 'Cache-Control': faults.staleIndex ? 'public, max-age=3600' : 'no-cache' };

  if (request.headers.host === 'www.vnone.com.br' && !faults.wwwNotRedirected) {
    return send(301, { Location: `${faults.wwwToHttp ? 'http' : 'https'}://vnone.com.br${request.url}` });
  }
  if (path === '/') return send(200, html, head('Home', canonical('/') + LD));
  if (path === '/servicos') return send(200, html, faults.sameHeadOnEveryRoute ? head('Home', canonical('/') + LD) : head('Servicos', canonical('/servicos') + LD));
  if (path === '/blog') return send(200, html, head('Blog', faults.blogWithoutNoindex ? canonical('/blog') : NOINDEX));
  if (path.endsWith('/') && path.length > 1) {
    return faults.slashNotRedirected ? send(200, html, head('Home')) : send(301, { Location: `${path.slice(0, -1)}${query ? `?${query}` : ''}` });
  }
  if (path === '/assets/index-AAA.js') {
    return send(200, { 'Content-Type': 'text/javascript', 'Cache-Control': 'public, max-age=31536000, immutable, no-transform' }, '1');
  }
  if (path === '/assets/missing-0000000.js') {
    return send(404, faults.immutableOn404 ? { 'Cache-Control': 'public, max-age=31536000, immutable, no-transform' } : {});
  }
  if (path === '/brand/vn-one-logo-dark.webp') {
    const cache = faults.longCacheOnImage ? 'public, max-age=31536000, immutable' : 'public, max-age=604800, stale-while-revalidate=86400, no-transform';
    return send(200, { 'Content-Type': 'image/webp', 'Cache-Control': cache }, '1');
  }
  if (path === '/favicon.ico' || path === '/site.webmanifest') {
    if (faults.noFavicon) return send(404, {});
    const type = path === '/site.webmanifest' && !faults.binaryManifest ? 'application/manifest+json' : 'image/x-icon';
    return send(200, { 'Content-Type': type, 'Cache-Control': 'public, max-age=604800, stale-while-revalidate=86400, no-transform' }, '1');
  }
  if (path === '/robots.txt') {
    const block = faults.robotsBlocksBlog ? 'Disallow: /blog\n' : '';
    return send(200, { 'Content-Type': 'text/plain' }, `User-agent: *\nAllow: /\n${block}\nSitemap: https://vnone.com.br/sitemap.xml\n`);
  }
  if (path === '/sitemap.xml') {
    const blog = faults.blogInSitemap ? '<url><loc>https://vnone.com.br/blog</loc></url>' : '';
    return send(200, { 'Content-Type': 'application/xml' }, `<urlset><url><loc>https://vnone.com.br/servicos</loc></url>${blog}</urlset>`);
  }
  if (path === '/404.html') return faults.error404Page ? send(200, html, head('Nao encontrada', NOINDEX)) : send(404, {});
  if (path.startsWith('/projetos/troco') || path.startsWith('/projetos/importacao-massiva-nfe')) {
    return faults.noRedirect ? send(200, html, head('Home')) : send(301, { Location: '/projetos' });
  }
  if (path === '/.env') return faults.openDotFile ? send(200, {}, 'SECRET=1') : send(403, {});
  if (path === '/.git/config') return faults.openGitConfig ? send(200, {}, '[core]') : send(403, {});
  if (path === '/rota-que-nao-existe') {
    return send(faults.unknownRouteIs200 ? 200 : 404, html, head('Nao encontrada', faults.unknownRouteWithoutNoindex ? '' : NOINDEX));
  }
  return send(404, {});
}

async function start(faults: Faults = {}): Promise<string> {
  server = createServer((request, response) => answer(request, response, faults));
  await new Promise<void>((resolve) => server!.listen(0, '127.0.0.1', resolve));
  return `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
}

// The global fetch stub of src/test/setup.ts rejects every call; this test talks to a server on 127.0.0.1 it started itself.
beforeEach(() => {
  vi.unstubAllGlobals();
});

afterEach(async () => {
  await new Promise<void>((resolve) => (server ? server.close(() => resolve()) : resolve()));
  server = undefined;
});

describe('the smoke check of the container', () => {
  it('passes against a server that behaves as nginx.conf promises', async () => {
    expect(await runSmoke(await start())).toEqual([]);
  });

  it.each(Object.keys(SECURITY_HEADERS))('fails when %s is missing', async (name) => {
    const failures = await runSmoke(await start({ dropHeader: name }));
    expect(failures.length).toBeGreaterThan(0);
    expect(failures.flatMap((failure) => failure.problems).join(' ')).toContain(name);
  });

  it.each<[string, Faults, RegExp]>([
    ['a 404 that is cached for a year', { immutableOn404: true }, /missing hashed asset/],
    ['a removed project that is not redirected', { noRedirect: true }, /301 to \/projetos/],
    ['an image cached for a year', { longCacheOnImage: true }, /brand image/],
    ['a readable .env', { openDotFile: true }, /\.env is denied/],
    ['a readable .git/config', { openGitConfig: true }, /\.git\/config is denied/],
    ['a server that announces its version', { versionedServer: true }, /is denied/],
    ['an index.html that can be cached', { staleIndex: true }, /home|unknown route|servicos/],
    ['an unknown route answered with 200', { unknownRouteIs200: true }, /unknown route is a real 404/],
    ['an unknown route without noindex', { unknownRouteWithoutNoindex: true }, /unknown route is a real 404/],
    ['the same head on every route', { sameHeadOnEveryRoute: true }, /carries its own title/],
    ['a blog without noindex', { blogWithoutNoindex: true }, /blog is crawlable and says noindex/],
    ['the blog in the sitemap', { blogInSitemap: true }, /sitemap\.xml is xml/],
    ['a trailing slash that is not redirected', { slashNotRedirected: true }, /trailing slash/],
    ['a www host that is not redirected', { wwwNotRedirected: true }, /www host/],
    ['a www host redirected to http', { wwwToHttp: true }, /www host/],
    ['a missing favicon and manifest', { noFavicon: true }, /favicon\.ico is served/],
    ['a robots.txt that blocks the blog', { robotsBlocksBlog: true }, /robots\.txt/],
    ['a manifest sent as a binary file', { binaryManifest: true }, /sent as a manifest/],
    ['a 404.html that can be read on its own', { error404Page: true }, /404\.html is not served/],
  ])('fails on %s', async (_label, faults, expected) => {
    const failures = await runSmoke(await start(faults));
    expect(failures.map((failure) => failure.name).join('\n')).toMatch(expected);
  });

  it('reports a server that is not there as a failure, not a crash', async () => {
    const failures = await runSmoke('http://127.0.0.1:9');
    expect(failures.length).toBeGreaterThan(0);
  });
});
