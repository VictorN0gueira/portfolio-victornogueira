// Smoke test of the running Docker image: it asks a base url for the answers that nginx.conf and
// nginx/security-headers.conf promise, and fails on the first thing that differs. CI runs it against the container it
// just built (see .github/workflows/ci.yml); the unit tests cannot, because they read the config as text.
//
//   docker run -d --rm -p 8080:80 vnone:ci
//   node scripts/smoke-container.mjs http://localhost:8080
import { request } from 'node:http';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { SECURITY_HEADERS } from '../config/securityHeaders.mjs';

const IMMUTABLE = 'public, max-age=31536000, immutable, no-transform';
const WEEK = 'max-age=604800';
const REMOVED_PROJECT_PATHS = ['/projetos/troco', '/projetos/importacao-massiva-nfe'];
const BRAND_IMAGE = '/brand/vn-one-logo-dark.webp';
const MISSING_ASSET = '/assets/missing-0000000.js';
const UNKNOWN_ROUTE = '/rota-que-nao-existe';
const DOT_FILES = ['/.env', '/.git/config'];
const HASHED_SCRIPT = /\/assets\/[^"']+\.js/;
const HOME_ROUTE = '/';
const INNER_ROUTE = '/servicos';
const NOINDEX_ROUTE = '/blog';
const APEX = 'https://vnone.com.br';
const WWW_HOST = 'www.vnone.com.br';
const CRAWLER_FILES = ['/favicon.ico', '/site.webmanifest'];
const NOINDEX_TAG = /<meta name="robots" content="noindex, nofollow"/;
const TITLE = /<title[^>]*>([^<]*)<\/title>/;
const CANONICAL = /<link rel="canonical" href="([^"]*)"/;
const JSON_LD = /<script type="application\/ld\+json"/;
const APP_ROOT = '<div id="root"></div>';

/** The security headers of the module that are missing or different on a response. */
function securityHeaderProblems(response) {
  return Object.entries(SECURITY_HEADERS)
    .filter(([name, value]) => response.headers.get(name) !== value)
    .map(([name]) => `${name} is ${JSON.stringify(response.headers.get(name))}`);
}

const get = (base, path, init = {}) => fetch(new URL(path, base), { redirect: 'manual', ...init });

/** A GET with another Host header, which fetch does not let a script set: what the proxy forwards for the www domain. */
function getWithHost(base, path, host) {
  const url = new URL(path, base);
  return new Promise((resolveResponse, reject) => {
    const outgoing = request({ hostname: url.hostname, port: url.port, path: url.pathname + url.search, headers: { Host: host } }, (incoming) => {
      incoming.resume();
      incoming.on('end', () => resolveResponse(incoming));
    });
    outgoing.on('error', reject);
    outgoing.end();
  });
}

/** The security headers that a node http response lacks or has different, in the words of securityHeaderProblems. */
const headerProblemsOfIncoming = (incoming) =>
  Object.entries(SECURITY_HEADERS)
    .filter(([name, value]) => incoming.headers[name.toLowerCase()] !== value)
    .map(([name]) => `${name} is ${JSON.stringify(incoming.headers[name.toLowerCase()] ?? null)}`);

const statusProblem = (response, expected) => (response.status === expected ? [] : [`status ${response.status}`]);

/** One check: a name and a function that returns the list of problems (empty when it holds). */
function checks(base) {
  const withHeaders = (response) => securityHeaderProblems(response);
  return [
    {
      name: 'the home answers 200 with the security headers and no-cache',
      run: async () => {
        const response = await get(base, '/');
        return [
          ...(response.status === 200 ? [] : [`status ${response.status}`]),
          ...(response.headers.get('cache-control') === 'no-cache' ? [] : [`cache-control ${response.headers.get('cache-control')}`]),
          ...withHeaders(response),
        ];
      },
    },
    {
      name: 'a hashed asset is immutable for a year and carries the security headers',
      run: async () => {
        const page = await (await get(base, '/')).text();
        const script = HASHED_SCRIPT.exec(page)?.[0];
        if (!script) return ['index.html names no hashed script'];
        const response = await get(base, script);
        return [
          ...(response.status === 200 ? [] : [`${script} status ${response.status}`]),
          ...(response.headers.get('cache-control') === IMMUTABLE ? [] : [`cache-control ${response.headers.get('cache-control')}`]),
          ...withHeaders(response),
        ];
      },
    },
    {
      name: 'a brand image has a week, not a year, and the security headers',
      run: async () => {
        const response = await get(base, BRAND_IMAGE);
        const cache = response.headers.get('cache-control') ?? '';
        return [
          ...(response.status === 200 ? [] : [`status ${response.status}`]),
          ...(cache.includes(WEEK) && !cache.includes('immutable') ? [] : [`cache-control ${cache}`]),
          ...withHeaders(response),
        ];
      },
    },
    ...REMOVED_PROJECT_PATHS.map((path) => ({
      name: `${path} is a 301 to /projetos`,
      run: async () => {
        const response = await get(base, path);
        const location = response.headers.get('location');
        return [
          ...(response.status === 301 ? [] : [`status ${response.status}`]),
          ...(location === '/projetos' ? [] : [`location ${location}`]),
          ...withHeaders(response),
        ];
      },
    })),
    {
      name: 'a missing hashed asset is a 404 that is not cached for a year',
      run: async () => {
        const response = await get(base, MISSING_ASSET);
        const cache = response.headers.get('cache-control') ?? '';
        return [
          ...(response.status === 404 ? [] : [`status ${response.status}`]),
          ...(/immutable|max-age=31536000/.test(cache) ? [`cache-control ${cache}`] : []),
          ...withHeaders(response),
        ];
      },
    },
    {
      name: 'an unknown route is a real 404 with the app page, noindex, no canonical and no-cache',
      run: async () => {
        const response = await get(base, UNKNOWN_ROUTE);
        const page = await response.text();
        return [
          ...statusProblem(response, 404),
          ...((response.headers.get('content-type') ?? '').includes('text/html') ? [] : ['not html']),
          ...(response.headers.get('cache-control') === 'no-cache' ? [] : [`cache-control ${response.headers.get('cache-control')}`]),
          ...(NOINDEX_TAG.test(page) ? [] : ['no noindex tag']),
          ...(CANONICAL.test(page) ? ['has a canonical'] : []),
          ...(page.includes(APP_ROOT) ? [] : ['not the app page']),
          ...withHeaders(response),
        ];
      },
    },
    {
      name: '/404.html is not served on its own',
      run: async () => statusProblem(await get(base, '/404.html'), 404),
    },
    {
      name: `${INNER_ROUTE} carries its own title, canonical and structured data, not the home ones`,
      run: async () => {
        const [home, inner] = await Promise.all([get(base, HOME_ROUTE), get(base, INNER_ROUTE)]);
        const [homePage, innerPage] = await Promise.all([home.text(), inner.text()]);
        const innerTitle = TITLE.exec(innerPage)?.[1];
        const canonical = CANONICAL.exec(innerPage)?.[1];
        return [
          ...statusProblem(inner, 200),
          ...(innerTitle && innerTitle !== TITLE.exec(homePage)?.[1] ? [] : [`title ${innerTitle}`]),
          ...(canonical === `${APEX}${INNER_ROUTE}` ? [] : [`canonical ${canonical}`]),
          ...(JSON_LD.test(innerPage) ? [] : ['no structured data']),
          ...(NOINDEX_TAG.test(innerPage) ? ['noindex'] : []),
          ...(inner.headers.get('cache-control') === 'no-cache' ? [] : [`cache-control ${inner.headers.get('cache-control')}`]),
          ...withHeaders(inner),
        ];
      },
    },
    {
      name: `${NOINDEX_ROUTE} is crawlable and says noindex`,
      run: async () => {
        const response = await get(base, NOINDEX_ROUTE);
        const page = await response.text();
        return [...statusProblem(response, 200), ...(NOINDEX_TAG.test(page) ? [] : ['no noindex tag']), ...(CANONICAL.test(page) ? ['has a canonical'] : [])];
      },
    },
    {
      name: 'a trailing slash is a 301 to the same path without it, with the query string',
      run: async () => {
        const response = await get(base, `${INNER_ROUTE}/?a=1`);
        const location = response.headers.get('location');
        return [...statusProblem(response, 301), ...(location === `${INNER_ROUTE}?a=1` ? [] : [`location ${location}`]), ...withHeaders(response)];
      },
    },
    {
      // The slash rule used to capture any byte: a backslash ended up in Location, and a browser reads "/\evil.com" as "//evil.com".
      name: 'a trailing slash path with a backslash is a 404 and never an open redirect',
      run: async () => {
        const response = await get(base, '/%5Cevil.com/');
        const location = response.headers.get('location');
        return [...statusProblem(response, 404), ...(location === null ? [] : [`open redirect to ${location}`]), ...withHeaders(response)];
      },
    },
    {
      name: 'the www host is a 301 to the same path on the apex over https',
      run: async () => {
        const response = await getWithHost(base, `${INNER_ROUTE}?a=1`, WWW_HOST);
        const location = response.headers.location;
        return [
          ...(response.statusCode === 301 ? [] : [`status ${response.statusCode}`]),
          ...(location === `${APEX}${INNER_ROUTE}?a=1` ? [] : [`location ${location}`]),
          ...headerProblemsOfIncoming(response),
        ];
      },
    },
    {
      name: '/site.webmanifest is sent as a manifest',
      run: async () => {
        const type = (await get(base, '/site.webmanifest')).headers.get('content-type') ?? '';
        return type.includes('manifest') ? [] : [`content-type ${type}`];
      },
    },
    ...CRAWLER_FILES.map((path) => ({
      name: `${path} is served with a week of cache`,
      run: async () => {
        const response = await get(base, path);
        const cache = response.headers.get('cache-control') ?? '';
        return [...statusProblem(response, 200), ...(cache.includes(WEEK) ? [] : [`cache-control ${cache}`]), ...withHeaders(response)];
      },
    })),
    {
      name: '/robots.txt is served and points at the sitemap, without blocking the blog',
      run: async () => {
        const response = await get(base, '/robots.txt');
        const text = await response.text();
        return [
          ...statusProblem(response, 200),
          ...(text.includes(`Sitemap: ${APEX}/sitemap.xml`) ? [] : ['no Sitemap line']),
          ...(/Disallow:\s*\/(blog|assets)/i.test(text) ? ['blocks the blog or the assets'] : []),
        ];
      },
    },
    {
      name: '/sitemap.xml is xml, lists the routes in the index and leaves the blog out',
      run: async () => {
        const response = await get(base, '/sitemap.xml');
        const text = await response.text();
        return [
          ...statusProblem(response, 200),
          ...((response.headers.get('content-type') ?? '').includes('xml') ? [] : [`content-type ${response.headers.get('content-type')}`]),
          ...(text.includes(`<loc>${APEX}${INNER_ROUTE}</loc>`) ? [] : [`no ${INNER_ROUTE}`]),
          ...(text.includes(NOINDEX_ROUTE) ? [`lists ${NOINDEX_ROUTE}`] : []),
        ];
      },
    },
    ...DOT_FILES.map((path) => ({
      name: `${path} is denied, and the server does not announce its version`,
      run: async () => {
        const response = await get(base, path);
        const server = response.headers.get('server') ?? '';
        return [...statusProblem(response, 403), ...(/\d/.test(server) ? [`server ${server}`] : [])];
      },
    })),
  ];
}

/** Runs every check against `base`; returns [{ name, problems }] for the ones that failed. */
export async function runSmoke(base) {
  const failures = [];
  for (const check of checks(base)) {
    let problems;
    try {
      problems = await check.run();
    } catch (error) {
      problems = [error instanceof Error ? error.message : String(error)];
    }
    if (problems.length > 0) failures.push({ name: check.name, problems });
  }
  return failures;
}

async function main(args) {
  const base = args[0];
  if (!base) {
    process.stderr.write('usage: node scripts/smoke-container.mjs <base url, for example http://localhost:8080>\n');
    return 2;
  }
  const failures = await runSmoke(base);
  if (failures.length === 0) {
    process.stdout.write(`smoke ok: ${checks(base).length} checks against ${base}\n`);
    return 0;
  }
  for (const failure of failures) process.stderr.write(`FAIL ${failure.name}: ${failure.problems.join('; ')}\n`);
  return 1;
}

const isEntryPoint = process.argv[1] !== undefined && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
if (isEntryPoint) process.exitCode = await main(process.argv.slice(2));
