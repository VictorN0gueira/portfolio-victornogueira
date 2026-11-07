// @ts-check
// scripts/db-verify.mjs
// Checks that production RLS works with the public anon key only.
//
// Usage:
//   node scripts/db-verify.mjs
//   SUPABASE_URL=https://db.vnone.com.br SUPABASE_ANON_KEY=<key> node scripts/db-verify.mjs
//
// Without env vars it reads Acessos/Supabase.md (never committed).

const VERIFY_TIMEOUT_MS = 10_000;

/** @typedef {{ name: string; ok: boolean }} Check */

/**
 * Runs 4 checks against the PostgREST REST API using only the public anon key.
 *   articles-readable        — anon can SELECT from articles (200)
 *   leads-not-readable       — anon cannot SELECT from leads (non-200)
 *   articles-not-writable    — anon cannot INSERT into articles (non-200)
 *   articles-not-deletable   — anon cannot DELETE from articles (non-200)
 *
 * @param {{ url: string; anonKey: string; fetch?: typeof fetch }} options
 * @returns {Promise<Check[]>}
 */
export async function verifyAsAnon({ url, anonKey, fetch: fetchImpl = fetch }) {
  const restBase = `${url.replace(/\/$/, '')}/rest/v1`;
  const headers = { apikey: anonKey, Authorization: `Bearer ${anonKey}` };

  const signal = () => AbortSignal.timeout(VERIFY_TIMEOUT_MS);

  const results = await Promise.all([
    fetchImpl(`${restBase}/articles?select=url&limit=1`, { headers, signal: signal() })
      .then((r) => ({ name: 'articles-readable', ok: r.ok }))
      .catch(() => ({ name: 'articles-readable', ok: false })),

    fetchImpl(`${restBase}/leads?select=id&limit=1`, { headers, signal: signal() })
      .then((r) => ({ name: 'leads-not-readable', ok: !r.ok }))
      .catch(() => ({ name: 'leads-not-readable', ok: false })),

    fetchImpl(`${restBase}/articles`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify({ url: 'https://test.example/dummy', title: 'test', source: 'test', language: 'en' }),
      signal: signal(),
    })
      .then((r) => ({ name: 'articles-not-writable', ok: !r.ok }))
      .catch(() => ({ name: 'articles-not-writable', ok: false })),

    fetchImpl(`${restBase}/articles?id=eq.00000000-0000-0000-0000-000000000000`, {
      method: 'DELETE',
      headers,
      signal: signal(),
    })
      .then((r) => ({ name: 'articles-not-deletable', ok: !r.ok }))
      .catch(() => ({ name: 'articles-not-deletable', ok: false })),
  ]);

  return results;
}

// --- CLI ---

function renderResults(checks) {
  const all = checks.every((c) => c.ok);
  for (const check of checks) {
    process.stdout.write(`  ${check.ok ? '✓' : '✗'} ${check.name}\n`);
  }
  return all;
}

async function readAcessos() {
  const { readFile } = await import('node:fs/promises');
  const { resolve } = await import('node:path');
  try {
    const text = await readFile(resolve('Acessos/Supabase.md'), 'utf8');
    const url = /URL:\s*(.+)/i.exec(text)?.[1]?.trim();
    const anonKey = /ANON_KEY:\s*(.+)/i.exec(text)?.[1]?.trim();
    return { url, anonKey };
  } catch {
    return { url: undefined, anonKey: undefined };
  }
}

const isMain = process.argv[1]
  ? new URL(import.meta.url).pathname === new URL(`file://${process.argv[1]}`).pathname
  : false;

if (isMain) {
  const acessos = await readAcessos();
  const url = process.env.SUPABASE_URL ?? acessos.url;
  const anonKey = process.env.SUPABASE_ANON_KEY ?? acessos.anonKey;

  if (!url || !anonKey) {
    process.stderr.write('Error: SUPABASE_URL and SUPABASE_ANON_KEY are required (env or Acessos/Supabase.md)\n');
    process.exit(1);
  }

  process.stdout.write(`Verifying ${url} …\n`);
  const checks = await verifyAsAnon({ url, anonKey });
  const ok = renderResults(checks);
  process.exit(ok ? 0 : 1);
}
