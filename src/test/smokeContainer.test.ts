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
}

const INDEX = '<!doctype html><script type="module" src="/assets/index-AAA.js"></script>';
let server: Server | undefined;

function answer(request: IncomingMessage, response: ServerResponse, faults: Faults) {
  const headers: Record<string, string> = { ...SECURITY_HEADERS, Server: faults.versionedServer ? 'nginx/1.27.1' : 'nginx' };
  if (faults.dropHeader) delete headers[faults.dropHeader];
  const path = request.url ?? '/';
  const send = (status: number, extra: Record<string, string>, body = '') => {
    response.writeHead(status, { ...headers, ...extra });
    response.end(body);
  };
  if (path === '/' || path === '/rota-que-nao-existe') {
    return send(200, { 'Content-Type': 'text/html', 'Cache-Control': faults.staleIndex ? 'public, max-age=3600' : 'no-cache' }, INDEX);
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
  if (path.startsWith('/projetos/troco') || path.startsWith('/projetos/importacao-massiva-nfe')) {
    return faults.noRedirect ? send(200, { 'Content-Type': 'text/html' }, INDEX) : send(301, { Location: '/projetos' });
  }
  if (path === '/.env') return faults.openDotFile ? send(200, {}, 'SECRET=1') : send(403, {});
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
    ['a readable .env', { openDotFile: true }, /dot file/],
    ['a server that announces its version', { versionedServer: true }, /dot file/],
    ['an index.html that can be cached', { staleIndex: true }, /home|unknown route/],
  ])('fails on %s', async (_label, faults, expected) => {
    const failures = await runSmoke(await start(faults));
    expect(failures.map((failure) => failure.name).join('\n')).toMatch(expected);
  });

  it('reports a server that is not there as a failure, not a crash', async () => {
    const failures = await runSmoke('http://127.0.0.1:9');
    expect(failures.length).toBeGreaterThan(0);
  });
});
