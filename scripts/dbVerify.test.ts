// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { verifyAsAnon } from './db-verify.mjs';

const FAKE_URL = 'https://db.test.example';
const FAKE_ANON_KEY = 'test-anon-key';

type MockResponses = Record<string, { ok: boolean; status: number }>;

function makeFetch(responses: MockResponses, methodOverrides: Record<string, { ok: boolean; status: number }> = {}) {
  return async (url: string, init?: RequestInit): Promise<Response> => {
    const method = (init?.method ?? 'GET').toUpperCase();
    const methodKey = `${method}:${url}`;
    if (methodOverrides[methodKey]) {
      const r = methodOverrides[methodKey];
      return { ok: r.ok, status: r.status } as Response;
    }
    const key = Object.keys(responses).find((k) => url.includes(k));
    const r = key ? responses[key] : { ok: false, status: 403 };
    return { ok: r.ok, status: r.status } as Response;
  };
}

describe('verifyAsAnon', () => {
  it('passes all 4 checks when RLS is correctly configured', async () => {
    const mockFetch = makeFetch(
      {
        '/articles?select=url': { ok: true, status: 200 },
        '/leads?select=id': { ok: false, status: 403 },
      },
      {
        [`POST:${FAKE_URL}/rest/v1/articles`]: { ok: false, status: 403 },
        [`DELETE:${FAKE_URL}/rest/v1/articles?id=eq.00000000-0000-0000-0000-000000000000`]: {
          ok: false,
          status: 403,
        },
      },
    );

    const checks = await verifyAsAnon({ url: FAKE_URL, anonKey: FAKE_ANON_KEY, fetch: mockFetch });
    expect(checks).toHaveLength(4);
    expect(checks.every((c) => c.ok)).toBe(true);
  });

  it('marks leads-not-readable as ok:false when leads responds 200', async () => {
    const mockFetch = async (url: string, init?: RequestInit): Promise<Response> => {
      const method = (init?.method ?? 'GET').toUpperCase();
      if (url.includes('/leads')) return { ok: true, status: 200 } as Response;
      if (method === 'POST') return { ok: false, status: 403 } as Response;
      if (method === 'DELETE') return { ok: false, status: 403 } as Response;
      return { ok: true, status: 200 } as Response;
    };

    const checks = await verifyAsAnon({ url: FAKE_URL, anonKey: FAKE_ANON_KEY, fetch: mockFetch });
    const leadsCheck = checks.find((c) => c.name === 'leads-not-readable');
    expect(leadsCheck?.ok).toBe(false);
    // Other checks should not be affected
    const readCheck = checks.find((c) => c.name === 'articles-readable');
    expect(readCheck?.ok).toBe(true);
  });

  it('marks articles-not-writable as ok:false when POST to articles succeeds', async () => {
    const mockFetch = async (url: string, init?: RequestInit): Promise<Response> => {
      const method = (init?.method ?? 'GET').toUpperCase();
      if (url.includes('/articles') && method === 'POST') return { ok: true, status: 201 } as Response;
      if (url.includes('/articles') && method === 'DELETE') return { ok: false, status: 403 } as Response;
      if (url.includes('/leads')) return { ok: false, status: 403 } as Response;
      return { ok: true, status: 200 } as Response;
    };

    const checks = await verifyAsAnon({ url: FAKE_URL, anonKey: FAKE_ANON_KEY, fetch: mockFetch });
    const writeCheck = checks.find((c) => c.name === 'articles-not-writable');
    expect(writeCheck?.ok).toBe(false);
  });

  it('marks articles-readable as ok:false when GET fails', async () => {
    const mockFetch = async (): Promise<Response> => {
      return { ok: false, status: 403 } as Response;
    };

    const checks = await verifyAsAnon({ url: FAKE_URL, anonKey: FAKE_ANON_KEY, fetch: mockFetch });
    const readCheck = checks.find((c) => c.name === 'articles-readable');
    expect(readCheck?.ok).toBe(false);
  });

  it('marks articles-not-deletable as ok:false when DELETE succeeds', async () => {
    const mockFetch = async (url: string, init?: RequestInit): Promise<Response> => {
      const method = (init?.method ?? 'GET').toUpperCase();
      if (url.includes('/articles') && method === 'DELETE') return { ok: true, status: 204 } as Response;
      if (url.includes('/articles') && method === 'POST') return { ok: false, status: 403 } as Response;
      if (url.includes('/leads')) return { ok: false, status: 403 } as Response;
      return { ok: true, status: 200 } as Response;
    };

    const checks = await verifyAsAnon({ url: FAKE_URL, anonKey: FAKE_ANON_KEY, fetch: mockFetch });
    const deleteCheck = checks.find((c) => c.name === 'articles-not-deletable');
    expect(deleteCheck?.ok).toBe(false);
  });

  it('marks all checks as ok:false when the network throws', async () => {
    const mockFetch = async (): Promise<Response> => {
      throw new Error('network error');
    };

    const checks = await verifyAsAnon({ url: FAKE_URL, anonKey: FAKE_ANON_KEY, fetch: mockFetch });
    expect(checks).toHaveLength(4);
    expect(checks.every((c) => !c.ok)).toBe(true);
  });

  it('sends apikey and Authorization headers on every request', async () => {
    const seenHeaders = new Set<string>();
    const mockFetch = async (_url: string, init?: RequestInit): Promise<Response> => {
      const h = (init?.headers ?? {}) as Record<string, string>;
      if (h['apikey']) seenHeaders.add('apikey');
      if (h['Authorization']) seenHeaders.add('Authorization');
      return { ok: false, status: 403 } as Response;
    };

    await verifyAsAnon({ url: FAKE_URL, anonKey: FAKE_ANON_KEY, fetch: mockFetch });
    expect(seenHeaders.has('apikey')).toBe(true);
    expect(seenHeaders.has('Authorization')).toBe(true);
  });

  it('returns exactly 4 checks with the expected names', async () => {
    const mockFetch = async (): Promise<Response> => ({ ok: false, status: 403 }) as Response;
    const checks = await verifyAsAnon({ url: FAKE_URL, anonKey: FAKE_ANON_KEY, fetch: mockFetch });
    const names = checks.map((c) => c.name);
    expect(names).toContain('articles-readable');
    expect(names).toContain('leads-not-readable');
    expect(names).toContain('articles-not-writable');
    expect(names).toContain('articles-not-deletable');
  });
});
