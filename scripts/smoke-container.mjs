// Smoke test of the running Docker image: it asks a base url for the answers that nginx.conf and
// nginx/security-headers.conf promise, and fails on the first thing that differs. CI runs it against the container it
// just built (see .github/workflows/ci.yml); the unit tests cannot, because they read the config as text.
//
//   docker run -d --rm -p 8080:80 vnone:ci
//   node scripts/smoke-container.mjs http://localhost:8080
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { SECURITY_HEADERS } from '../config/securityHeaders.mjs';

const IMMUTABLE = 'public, max-age=31536000, immutable, no-transform';
const WEEK = 'max-age=604800';
const REMOVED_PROJECT_PATHS = ['/projetos/troco', '/projetos/importacao-massiva-nfe'];
const BRAND_IMAGE = '/brand/vn-one-logo-dark.webp';
const MISSING_ASSET = '/assets/missing-0000000.js';
const UNKNOWN_ROUTE = '/rota-que-nao-existe';
const DOT_FILE = '/.env';
const HASHED_SCRIPT = /\/assets\/[^"']+\.js/;

/** The security headers of the module that are missing or different on a response. */
function securityHeaderProblems(response) {
  return Object.entries(SECURITY_HEADERS)
    .filter(([name, value]) => response.headers.get(name) !== value)
    .map(([name]) => `${name} is ${JSON.stringify(response.headers.get(name))}`);
}

const get = (base, path, init = {}) => fetch(new URL(path, base), { redirect: 'manual', ...init });

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
      name: 'an unknown route is the app page with no-cache',
      run: async () => {
        const response = await get(base, UNKNOWN_ROUTE);
        return [
          ...(response.status === 200 ? [] : [`status ${response.status}`]),
          ...((response.headers.get('content-type') ?? '').includes('text/html') ? [] : ['not html']),
          ...(response.headers.get('cache-control') === 'no-cache' ? [] : [`cache-control ${response.headers.get('cache-control')}`]),
        ];
      },
    },
    {
      name: 'a dot file is denied, and the server does not announce its version',
      run: async () => {
        const response = await get(base, DOT_FILE);
        const server = response.headers.get('server') ?? '';
        return [...(response.status === 403 ? [] : [`status ${response.status}`]), ...(/\d/.test(server) ? [`server ${server}`] : [])];
      },
    },
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
