// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { AUDIT_QUERIES, AUDIT_ROLES, renderAudit, runAudit, runAuditCli } from './db-audit.mjs';

// Synthetic only: a fake fetch and made up credentials on example.test. The audit itself is read only SQL.
const FAKE_URL = 'https://example.test';
const FAKE_KEY = 'fake-service-key';
const env = { SUPABASE_URL: FAKE_URL, SUPABASE_SERVICE_ROLE_KEY: FAKE_KEY };
const FORBIDDEN =
  /\b(insert|update|delete|alter|drop|grant|revoke|truncate|copy|call|set_config|nextval|setval|pg_terminate_backend|pg_cancel_backend|lo_import|lo_export)\b/i;

describe('the audit queries', () => {
  it('are read only: one select each, with nothing that writes or changes a setting', () => {
    expect(AUDIT_QUERIES.length).toBeGreaterThanOrEqual(7);
    for (const { title, sql } of AUDIT_QUERIES) {
      expect(sql.trim(), title).toMatch(/^select\b/i);
      expect(sql.trim().replace(/;$/, ''), title).not.toContain(';');
      expect(sql, title).not.toMatch(FORBIDDEN);
    }
  });

  it('look at the four roles of the foundation, and say what they cover', () => {
    expect(AUDIT_ROLES).toEqual(['anon', 'authenticated', 'news_writer', 'n8n_leads']);
    const all = AUDIT_QUERIES.map(({ title, sql }) => `${title}\n${sql}`).join('\n');
    for (const needle of [
      'has_function_privilege',
      'has_schema_privilege',
      'pg_default_acl',
      'relacl',
      'relowner',
      'pg_proc',
      'pg_auth_members',
      'rolconnlimit',
      'rolconfig',
      "'public'",
      "'private'",
      "'usage'",
    ]) {
      expect(all, needle).toContain(needle);
    }
    for (const role of AUDIT_ROLES) expect(all).toContain(`'${role}'`);
  });
});

describe('runAudit and renderAudit', () => {
  it('runs every query once, in order, and keeps the rows', async () => {
    const query = vi.fn(async (sql: string) => [{ seen: sql.slice(0, 10) }]);
    const sections = await runAudit({ query });
    expect(query).toHaveBeenCalledTimes(AUDIT_QUERIES.length);
    expect(sections.map((section) => section.title)).toEqual(AUDIT_QUERIES.map(({ title }) => title));
    expect(sections[0].rows).toHaveLength(1);
  });

  it('reports a query that failed in its section instead of stopping the whole report', async () => {
    const query = vi.fn(async (sql: string) => {
      if (sql === AUDIT_QUERIES[1].sql) throw new Error('permission denied for table pg_proc');
      return [];
    });
    const sections = await runAudit({ query });
    expect(sections[1].error).toContain('permission denied');
    expect(renderAudit(sections)).toContain('permission denied');
    expect(sections[0].error).toBeUndefined();
  });

  it('prints a table per section with the row count, null as a dash, and an empty section as none', () => {
    const text = renderAudit([
      { title: 'Functions', rows: [{ role: 'anon', function: 'dump_leads', acl: null }] },
      { title: 'Empty', rows: [] },
    ]);
    expect(text).toContain('Functions (1)');
    expect(text).toContain('anon | dump_leads | -');
    expect(text).toContain('Empty (0)');
    expect(text).toMatch(/none/i);
  });
});

describe('runAuditCli', () => {
  function setup(answer: unknown = []) {
    const requests: { url: string; headers: Record<string, string>; redirect?: string; sql: string }[] = [];
    const fetchFake = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      requests.push({
        url: String(url),
        headers: init?.headers as Record<string, string>,
        redirect: init?.redirect,
        sql: (JSON.parse(String(init?.body)) as { query: string }).query,
      });
      return new Response(JSON.stringify(answer), { status: 200, headers: { 'content-type': 'application/json' } });
    });
    const out: string[] = [];
    const err: string[] = [];
    return {
      requests,
      fetchFake,
      out,
      err,
      io: { stdout: (text: string) => out.push(text), stderr: (text: string) => err.push(text) },
      fetch: fetchFake as unknown as typeof fetch,
    };
  }

  it('runs only the audit queries, against the pinned host, and prints no secret', async () => {
    const { requests, out, err, io, fetch } = setup([{ role: 'anon', schema: 'public' }]);
    const code = await runAuditCli({ argv: ['--host', 'example.test'], env, fetch, ...io });
    expect(code).toBe(0);
    expect(requests.map(({ sql }) => sql)).toEqual(AUDIT_QUERIES.map(({ sql }) => sql));
    for (const request of requests) {
      expect(request.url).toBe('https://example.test/pg/query');
      expect(request.redirect).toBe('error');
      expect(request.headers.apikey).toBe(FAKE_KEY);
    }
    const printed = [...out, ...err].join('\n');
    expect(printed).toContain('example.test');
    expect(printed).toContain('anon | public');
    expect(printed).not.toContain(FAKE_KEY);
  });

  it('refuses to start, before any request, without the pinned host or with another one', async () => {
    for (const argv of [[], ['--host', 'other.example.test']]) {
      const { fetchFake, err, io, fetch } = setup();
      const code = await runAuditCli({ argv, env, fetch, ...io });
      expect(code).not.toBe(0);
      expect(fetchFake).not.toHaveBeenCalled();
      expect(err.join('\n')).toMatch(/--host/);
    }
  });

  it('refuses a switched off TLS check and an option it does not know', async () => {
    const { fetchFake, io, fetch } = setup();
    expect(
      await runAuditCli({
        argv: ['--host', 'example.test'],
        env: { ...env, NODE_TLS_REJECT_UNAUTHORIZED: '0' },
        fetch,
        ...io,
      }),
    ).not.toBe(0);
    expect(await runAuditCli({ argv: ['--host', 'example.test', '--apply'], env, fetch, ...io })).not.toBe(0);
    expect(fetchFake).not.toHaveBeenCalled();
  });
});
