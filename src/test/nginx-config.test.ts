// @vitest-environment node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { REMOVED_PROJECT_SLUGS } from '../data/projects';
import { cacheControlOf, directivesOf, locationsOf, parseNginx, pickLocation, serverOf, type Block } from './nginxConfig';

// nginx.conf is what the Docker image serves. No nginx binary is assumed in CI or on the dev machines, so this reads
// the file with a small parser (./nginxConfig) and checks what went wrong before: security headers that silently
// vanish from a location (nginx does not inherit add_header into a block that has its own), two Cache-Control
// headers on one response, a stale index.html, and removed project URLs that still answer 200.

const ROOT = resolve(__dirname, '../..');
const SNIPPET_PATH = '/etc/nginx/snippets/security-headers.conf';
const WEEK = 604800;
const YEAR = 31536000;

const source = readFileSync(resolve(ROOT, 'nginx.conf'), 'utf8');
const tree = parseNginx(source);
const server = serverOf(tree);
const servers = tree.blocks.filter((block) => block.name === 'server');
const wwwServer = servers.find((block) => directivesOf(block, 'server_name').some((directive) => directive.args.includes('www.vnone.com.br')));
const maxAge = (value: string | undefined): number => Number(/max-age=(\d+)/.exec(value ?? '')?.[1] ?? Number.NaN);
const includes = (block: Block) => directivesOf(block, 'include').some((directive) => directive.args[0] === SNIPPET_PATH);
const cacheFor = (path: string) => cacheControlOf(pickLocation(server, path)!.block);

describe('the shape of the server', () => {
  it('parses, listens on 80 and hides the version', () => {
    expect(directivesOf(server, 'listen')[0].args).toEqual(['80']);
    expect(directivesOf(server, 'server_name')[0].args).toEqual(['_']);
    expect(directivesOf(server, 'server_tokens')[0].args).toEqual(['off']);
  });

  it('compresses text, not images or fonts', () => {
    expect(directivesOf(server, 'gzip')[0].args).toEqual(['on']);
    const types = directivesOf(server, 'gzip_types')[0].args;
    for (const type of ['text/css', 'application/javascript', 'application/json', 'image/svg+xml']) expect(types).toContain(type);
    expect(types.join(' ')).not.toMatch(/webp|woff|png|jpeg/);
  });

  it('answers a relative redirect as a relative Location, because it sits behind a proxy', () => {
    expect(directivesOf(server, 'absolute_redirect')[0].args).toEqual(['off']);
  });
});

describe('the security headers', () => {
  it('are included in the server block', () => {
    expect(includes(server)).toBe(true);
  });

  it('are included in EVERY location, because an inner add_header drops the outer ones', () => {
    const missing = locationsOf(server)
      .filter((location) => !includes(location.block))
      .map((location) => location.pattern);
    expect(missing).toEqual([]);
  });

  it('are not repeated by hand: the snippet is the only place that adds them', () => {
    const everywhere = [server, ...locationsOf(server).map((location) => location.block)];
    const handWritten = everywhere
      .flatMap((block) => directivesOf(block, 'add_header'))
      .map((directive) => directive.args[0].toLowerCase())
      .filter((name) => name !== 'cache-control');
    expect(handWritten).toEqual([]);
  });
});

describe('the cache', () => {
  it('keeps the hashed assets for a year, immutable, with one Cache-Control and no expires', () => {
    const location = pickLocation(server, '/assets/index-BFcRXi1S.js')!;
    expect(cacheControlOf(location.block)).toBe('public, max-age=31536000, immutable, no-transform');
    expect(directivesOf(location.block, 'expires')).toEqual([]);
    expect(directivesOf(location.block, 'try_files')[0].args).toEqual(['$uri', '=404']);
  });

  it('never lets a page or a route be cached without revalidation, so a deploy cannot strand an old index.html', () => {
    for (const path of ['/index.html', '/', '/sobre', '/projetos', '/projetos/hub081', '/blog', '/contato']) {
      expect(cacheFor(path), path).toBe('no-cache');
    }
  });

  it('serves the prerendered file of a route and a 404 for anything else, and for a missing hashed file', () => {
    expect(directivesOf(pickLocation(server, '/servicos')!.block, 'try_files')[0].args).toEqual(['$uri', '$uri/index.html', '=404']);
    expect(directivesOf(pickLocation(server, '/assets/gone.js')!.block, 'try_files')[0].args.at(-1)).toBe('=404');
  });

  it('gives the unversioned brand, fonts, OG banner and photo a week, never a year', () => {
    for (const path of ['/brand/vn-one-logo-dark.webp', '/fonts/SpaceGrotesk-Bold.woff2', '/og-banner.png', '/victor-photo.webp']) {
      expect(maxAge(cacheFor(path)), path).toBe(WEEK);
      expect(cacheFor(path), path).not.toContain('immutable');
    }
  });

  it('gives the project screenshots and client logos a week with revalidation, because their names carry no hash', () => {
    for (const path of ['/projects/hub081/cover-800.webp', '/projects/travel-ia/cover-share.jpg', '/clients/logo-acme.webp']) {
      const value = cacheFor(path)!;
      expect(maxAge(value), path).toBe(WEEK);
      expect(value, path).not.toContain('immutable');
      expect(maxAge(value), path).toBeLessThan(YEAR);
    }
  });

  it('keeps the CV and the crawler files short, so a new file reaches people the same day', () => {
    expect(maxAge(cacheFor('/cv/cv-joao-victor-nogueira.pdf'))).toBeLessThanOrEqual(3600);
    expect(maxAge(cacheFor('/robots.txt'))).toBeLessThanOrEqual(3600);
    expect(maxAge(cacheFor('/sitemap.xml'))).toBeLessThanOrEqual(3600);
  });

  it('never sends two Cache-Control headers, or an expires next to one', () => {
    for (const location of locationsOf(server)) {
      const headers = directivesOf(location.block, 'add_header').filter((directive) => directive.args[0].toLowerCase() === 'cache-control');
      expect(headers.length, location.pattern).toBeLessThanOrEqual(1);
      if (headers.length === 1) expect(directivesOf(location.block, 'expires'), location.pattern).toEqual([]);
    }
  });

  it('never stamps a long Cache-Control on an error: `always` is only for no-cache and the security headers', () => {
    // With `always`, a 404 for a missing hashed chunk (a rolling deploy) would carry `immutable` for a year, and a proxy
    // or the browser would keep that 404 at the URL. Without it nginx adds the header to 2xx and 3xx answers only.
    const longLived = locationsOf(server).filter(
      (location) => cacheControlOf(location.block) !== 'no-cache' && directivesOf(location.block, 'try_files').some((directive) => directive.args.at(-1) === '=404'),
    );
    expect(longLived.length).toBeGreaterThanOrEqual(5);
    for (const location of longLived) {
      const header = directivesOf(location.block, 'add_header').find((directive) => directive.args[0].toLowerCase() === 'cache-control');
      expect(header, location.pattern).toBeDefined();
      expect(header!.args, location.pattern).not.toContain('always');
    }
  });

  it('keeps `always` on the no-cache pages, so an error page is never cached either', () => {
    for (const path of ['/index.html', '/sobre', '/404.html']) {
      const header = directivesOf(pickLocation(server, path)!.block, 'add_header').find((directive) => directive.args[0].toLowerCase() === 'cache-control');
      expect(header!.args, path).toContain('always');
    }
  });

  it('covers the formats of the new images, video, manifest and pdf', () => {
    for (const path of ['/a.webp', '/a.avif', '/a.webmanifest', '/a.mp4', '/a.pdf']) {
      expect(maxAge(cacheFor(path)), path).toBeGreaterThan(0);
    }
  });
});

describe('the removed project pages', () => {
  it.each(REMOVED_PROJECT_SLUGS)('answers /projetos/%s with a 301 to /projetos, with or without a trailing slash', (slug) => {
    for (const path of [`/projetos/${slug}`, `/projetos/${slug}/`]) {
      const location = pickLocation(server, path)!;
      expect(directivesOf(location.block, 'return')[0].args, path).toEqual(['301', '/projetos']);
    }
  });

  it('leaves the other project pages to their prerendered file', () => {
    const location = pickLocation(server, '/projetos/hub081')!;
    expect(directivesOf(location.block, 'return')).toEqual([]);
    expect(directivesOf(location.block, 'try_files')[0].args).toEqual(['$uri', '$uri/index.html', '=404']);
  });
});

describe('hidden files', () => {
  it('are denied, except .well-known', () => {
    expect(directivesOf(pickLocation(server, '/.env')!.block, 'deny')[0].args).toEqual(['all']);
    expect(directivesOf(pickLocation(server, '/.git/config')!.block, 'deny')[0].args).toEqual(['all']);
    expect(directivesOf(pickLocation(server, '/.well-known/security.txt')!.block, 'deny')).toEqual([]);
  });
});

describe('an unknown route', () => {
  const fallback = pickLocation(server, '/rota-que-nao-existe')!;

  it('is a real 404 that shows the page of the app, out of the index, and never a 200', () => {
    expect(fallback.pattern).toBe('/');
    expect(directivesOf(fallback.block, 'try_files')[0].args.at(-1)).toBe('=404');
    expect(directivesOf(fallback.block, 'error_page')[0].args).toEqual(['404', '/404.html']);
  });

  it('is answered by an internal /404.html that is never cached and has the security headers', () => {
    const location = pickLocation(server, '/404.html')!;

    expect(location.kind).toBe('exact');
    expect(directivesOf(location.block, 'internal')).toHaveLength(1);
    expect(cacheControlOf(location.block)).toBe('no-cache');
    expect(includes(location.block)).toBe(true);
  });

  it('keeps a missing file of a static folder a plain 404, with no HTML body and no long Cache-Control on it', () => {
    for (const path of ['/assets/gone.js', '/brand/gone.png', '/fonts/gone.woff2', '/gone.webp']) {
      expect(directivesOf(pickLocation(server, path)!.block, 'error_page'), path).toEqual([]);
    }
  });
});

describe('a trailing slash', () => {
  it('is a 301 to the same path without it, with the query string, so there is one url per page', () => {
    for (const path of ['/servicos/', '/projetos/hub081/', '/blog/']) {
      const location = pickLocation(server, path)!;
      expect(directivesOf(location.block, 'return')[0].args, path).toEqual(['301', '$1$is_args$args']);
      expect(includes(location.block), path).toBe(true);
      expect(new RegExp(location.pattern).exec(path)?.[1], path).toBe(path.slice(0, -1));
    }
  });

  it('leaves the home, the static folders and the removed projects to their own rules', () => {
    expect(pickLocation(server, '/')!.pattern).toBe('/');
    expect(pickLocation(server, '/assets/')!.pattern).toBe('/assets/');
    expect(directivesOf(pickLocation(server, '/projetos/troco/')!.block, 'return')[0].args).toEqual(['301', '/projetos']);
    expect(directivesOf(pickLocation(server, '/brand/')!.block, 'return')).toEqual([]);
  });

  it('does not touch a path without the slash', () => {
    expect(directivesOf(pickLocation(server, '/servicos')!.block, 'return')).toEqual([]);
  });
});

describe('the www host', () => {
  it('has its own server block, after the default one, so the default is still the first', () => {
    expect(servers.length).toBeGreaterThanOrEqual(2);
    expect(servers[0]).toBe(server);
    expect(directivesOf(server, 'server_name')[0].args).toEqual(['_']);
    expect(wwwServer).toBeDefined();
    expect(servers.indexOf(wwwServer!)).toBeGreaterThan(0);
  });

  it('answers 301 to the same path on the apex over https, by the Host header and not by the scheme the container sees', () => {
    expect(directivesOf(wwwServer!, 'server_name')[0].args).toEqual(['www.vnone.com.br']);
    expect(directivesOf(wwwServer!, 'return')[0].args).toEqual(['301', 'https://vnone.com.br$request_uri']);
    expect(source).not.toContain('$scheme');
  });

  it('listens on 80, hides the version and has the security headers', () => {
    expect(directivesOf(wwwServer!, 'listen')[0].args).toEqual(['80']);
    expect(directivesOf(wwwServer!, 'server_tokens')[0].args).toEqual(['off']);
    expect(includes(wwwServer!)).toBe(true);
  });
});

describe('the error page', () => {
  it('has the security headers too', () => {
    const location = pickLocation(server, '/50x.html')!;
    expect(location.kind).toBe('exact');
    expect(includes(location.block)).toBe(true);
  });
});

describe('the parser itself', () => {
  it('rejects a missing semicolon and unbalanced braces', () => {
    expect(() => parseNginx('server { listen 80 }')).toThrow(/semicolon/);
    expect(() => parseNginx('server { listen 80;')).toThrow(/unbalanced/);
    expect(() => parseNginx('}')).toThrow(/unbalanced/);
  });

  it('picks like nginx: exact, then a ^~ prefix, then the first matching regex, then the longest prefix', () => {
    const tree = serverOf(
      parseNginx(`server {
        location / { a; }
        location ^~ /p/ { b; }
        location ~* \\.png$ { c; }
        location = /p/x.png { d; }
      }`),
    );
    expect(pickLocation(tree, '/p/x.png')!.block.directives[0].name).toBe('d');
    expect(pickLocation(tree, '/p/y.png')!.block.directives[0].name).toBe('b');
    expect(pickLocation(tree, '/z.png')!.block.directives[0].name).toBe('c');
    expect(pickLocation(tree, '/z')!.block.directives[0].name).toBe('a');
  });
});
