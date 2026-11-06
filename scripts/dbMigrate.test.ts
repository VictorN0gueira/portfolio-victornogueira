// @vitest-environment node
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createServer, type IncomingMessage, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  assertTransactional,
  buildMigrationSql,
  createQuery,
  editedMigrations,
  listMigrations,
  parseCredentialsFile,
  pendingMigrations,
  readRegistry,
  renderPlan,
  resolveCredentials,
  runCli,
  runMigrations,
  sha256Of,
  type Migration,
} from './db-migrate.mjs';

// Everything here is synthetic: a temporary folder, made up credentials on example.test, a fake fetch and two local
// servers on 127.0.0.1. Nothing in this file reaches a real database or reads the real Acessos folder.
const FAKE_URL = 'https://example.test';
const FAKE_HOST = 'example.test';
const FAKE_KEY = 'fake-service-key';
const REAL_MIGRATIONS = resolve(__dirname, '../supabase/migrations');

let dir = '';

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'db-migrate-'));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

function writeFiles(files: Record<string, string>): void {
  for (const [name, text] of Object.entries(files)) writeFileSync(join(dir, name), text);
}

const migration = (id: string, sql = `select '${id}';`): Migration => ({ id, file: `${id}.sql`, sql });
const registered = (m: Migration) => ({ id: m.id, sha256: sha256Of(m.sql) });

describe('listMigrations', () => {
  it('returns the migrations in the order of the file name and ignores what is not NNNN_name.sql', async () => {
    writeFiles({
      '0002_b.sql': 'select 2;',
      '0000_a.sql': 'select 0;',
      '0001_c.sql': 'select 1;',
      'README.md': '# not a migration',
      '1_short.sql': 'select 9;',
      '0003_x.txt': 'select 9;',
      '00004_long.sql': 'select 9;',
      '0005_Upper.sql': 'select 9;',
      '0006_with-dash.sql': 'select 9;',
      "0007_o'brien.sql": 'select 9;',
      '0008_with space.sql': 'select 9;',
      '0010_$tag$.sql': 'select 9;',
    });
    mkdirSync(join(dir, '0009_folder.sql'));
    expect(await listMigrations(dir)).toEqual([
      { id: '0000_a', file: '0000_a.sql', sql: 'select 0;' },
      { id: '0001_c', file: '0001_c.sql', sql: 'select 1;' },
      { id: '0002_b', file: '0002_b.sql', sql: 'select 2;' },
    ]);
  });

  it('returns an empty list for an empty folder and rejects for a folder that does not exist', async () => {
    expect(await listMigrations(dir)).toEqual([]);
    await expect(listMigrations(join(dir, 'missing'))).rejects.toThrow();
  });
});

describe('pendingMigrations and editedMigrations', () => {
  it('returns only the migrations that are not applied yet, in order', () => {
    const all = [migration('0000_a'), migration('0001_b'), migration('0002_c')];
    expect(pendingMigrations(all, ['0001_b']).map((m) => m.id)).toEqual(['0000_a', '0002_c']);
    expect(pendingMigrations(all, [])).toEqual(all);
    expect(pendingMigrations(all, ['0000_a', '0001_b', '0002_c'])).toEqual([]);
    expect(pendingMigrations(all, ['9999_unknown']).map((m) => m.id)).toEqual(['0000_a', '0001_b', '0002_c']);
  });

  it('sha256Of is the hex digest of the text, the same for LF and CRLF line endings', () => {
    expect(sha256Of('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
    expect(sha256Of('a\r\nb\r\n')).toBe(sha256Of('a\nb\n'));
  });

  it('names the applied migrations whose file changed since, or whose registered hash is missing', () => {
    const a = migration('0000_a', 'create table a();');
    const b = migration('0001_b', 'create table b();');
    expect(editedMigrations([a, b], [registered(a), registered(b)])).toEqual([]);
    expect(
      editedMigrations([a, b], [registered(a), { id: '0001_b', sha256: sha256Of('create table b(x int);') }]),
    ).toEqual(['0001_b']);
    expect(editedMigrations([a, b], [{ id: '0000_a', sha256: null }])).toEqual(['0000_a']);
    // Applied but no longer in the folder, and not yet applied: neither counts as edited.
    expect(editedMigrations([a], [registered(a), { id: '0005_gone', sha256: 'x' }])).toEqual([]);
    expect(editedMigrations([a, b], [registered(a)])).toEqual([]);
  });
});

describe('assertTransactional', () => {
  it.each([
    ['begin;', 'begin'],
    ['select 1;\nCOMMIT;', 'commit'],
    ['select 1; end;', 'end'],
    ['rollback;', 'rollback'],
    ['abort;', 'abort'],
    ['start transaction;', 'start transaction'],
    ["prepare transaction 'x';", 'prepare transaction'],
    ['create index concurrently i on t (a);', 'concurrently'],
    ['drop index concurrently i;', 'concurrently'],
    ['reindex index concurrently i;', 'concurrently'],
    ['refresh materialized view concurrently v;', 'concurrently'],
    ['vacuum t;', 'vacuum'],
    ["alter type t add value 'x';", 'add value'],
    ['create database d;', 'create database'],
    ['alter system set work_mem = 1;', 'alter system'],
  ])('refuses %j', (sql, why) => {
    expect(() => assertTransactional(migration('0001_x', sql))).toThrow(new RegExp(why, 'i'));
  });

  it('names the migration in the error', () => {
    expect(() => assertTransactional(migration('0007_bad', 'commit;'))).toThrow(/0007_bad/);
  });

  it('does not mistake a block, a string, a comment or a function body for transaction control', () => {
    const sql = [
      '-- commit; vacuum; begin;',
      '/* rollback; create index concurrently */',
      "select 'commit;', E'it''s end;';",
      'do $$ begin if true then perform 1; end if; end $$;',
      'create function f() returns int language plpgsql as $f$ begin return 1; end $f$;',
      'create table if not exists t (id int); -- end;',
    ].join('\n');
    expect(() => assertTransactional(migration('0001_ok', sql))).not.toThrow();
  });

  it('accepts every real migration of the repository', async () => {
    for (const real of await listMigrations(REAL_MIGRATIONS))
      expect(() => assertTransactional(real), real.id).not.toThrow();
  });
});

describe('buildMigrationSql', () => {
  it('wraps the migration and its registry row in one transaction, with server side timeouts', () => {
    const sql = buildMigrationSql(migration('0001_a', 'create table a();'));
    expect(sql.trimStart()).toMatch(/^begin;/);
    expect(sql.trimEnd()).toMatch(/commit;$/);
    expect(sql).toMatch(/set local statement_timeout = '\d+s';/);
    expect(sql).toMatch(/set local lock_timeout = '\d+s';/);
    expect(sql.indexOf('create table a();')).toBeLessThan(sql.indexOf('insert into private.schema_migrations'));
    expect(sql).toContain(sha256Of('create table a();'));
  });

  it('writes the id as a dollar quoted literal with a random tag, whatever the id holds', () => {
    const nasty = "0001_x'); drop table leads; -- $$ $vn_tag$";
    const first = buildMigrationSql(migration(nasty, 'select 1;'));
    const second = buildMigrationSql(migration(nasty, 'select 1;'));
    const tag = /\$(vn_[0-9a-f]{16})\$/.exec(first)?.[1];
    expect(tag).toBeDefined();
    // The id sits between two copies of the tag, and the tag is not inside the id, so the id cannot close it early.
    expect(first).toContain(`$${tag}$${nasty}$${tag}$`);
    expect(nasty).not.toContain(tag as string);
    expect(first.match(/\$vn_[0-9a-f]{16}\$/g)?.length).toBeGreaterThanOrEqual(2);
    expect(/\$(vn_[0-9a-f]{16})\$/.exec(second)?.[1]).not.toBe(tag);
    expect(first).not.toMatch(/values \('/);
  });
});

describe('runMigrations', () => {
  beforeEach(() => {
    writeFiles({
      '0000_a.sql': 'create table a();',
      '0001_b.sql': 'create table b();',
      '0002_c.sql': 'create table c();',
    });
  });

  it('only plans, without calling query, when apply is false', async () => {
    const query = vi.fn();
    const result = await runMigrations({ query, dir, apply: false });
    expect(query).not.toHaveBeenCalled();
    expect(result).toEqual({ applied: [], planned: ['0000_a', '0001_b', '0002_c'] });
  });

  it('calls query once per pending migration, in order, with the registry insert in the same call', async () => {
    const query = vi.fn().mockResolvedValue([]);
    const result = await runMigrations({ query, dir, apply: true });
    expect(query).toHaveBeenCalledTimes(3);
    const calls = query.mock.calls.map(([sql]) => String(sql));
    ['a', 'b', 'c'].forEach((name, index) => {
      const sql = calls[index];
      expect(sql).toContain(`create table ${name}();`);
      expect(sql).toContain('insert into private.schema_migrations');
      expect(sql).toContain(`000${index}_${name}`);
      expect(sql.indexOf(`create table ${name}();`)).toBeLessThan(sql.indexOf('insert into private.schema_migrations'));
      expect(sql.trimStart()).toMatch(/^begin;/);
      expect(sql.trimEnd()).toMatch(/commit;$/);
    });
    expect(result).toEqual({ applied: ['0000_a', '0001_b', '0002_c'], planned: ['0000_a', '0001_b', '0002_c'] });
  });

  it('stops at a migration that fails, sends a rollback, and never sends nor registers the ones after it', async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce([])
      .mockRejectedValueOnce(new Error('syntax error at or near "tabel"'))
      .mockResolvedValue([]);
    const error = await runMigrations({ query, dir, apply: true }).catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toContain('0001_b');
    expect((error as Error).message).toContain('syntax error');
    expect((error as Error & { applied: string[] }).applied).toEqual(['0000_a']);
    expect(query).toHaveBeenCalledTimes(3);
    expect(String(query.mock.calls[2][0]).trim()).toBe('rollback;');
    expect(query.mock.calls.map(([sql]) => String(sql)).join('\n')).not.toContain('create table c();');
  });

  it('keeps the real error when the rollback itself fails', async () => {
    const query = vi.fn().mockRejectedValueOnce(new Error('boom')).mockRejectedValue(new Error('rollback failed'));
    const error = (await runMigrations({ query, dir, apply: true }).catch((caught: unknown) => caught)) as Error;
    expect(error.message).toContain('0000_a');
    expect(error.message).toContain('boom');
  });

  it('does not repeat the migrations already applied when it runs again', async () => {
    const query = vi.fn().mockResolvedValue([]);
    const all = await listMigrations(dir);
    const first = await runMigrations({ query, dir, apply: true });
    query.mockClear();
    const appliedRows = all.map(registered);
    const second = await runMigrations({ query, dir, apply: true, applied: appliedRows });
    expect(query).not.toHaveBeenCalled();
    expect(second).toEqual({ applied: [], planned: [] });
    writeFiles({ '0003_d.sql': 'create table d();' });
    const third = await runMigrations({ query, dir, apply: true, applied: appliedRows });
    expect(query).toHaveBeenCalledTimes(1);
    expect(third.applied).toEqual(['0003_d']);
    expect(first.applied).toHaveLength(3);
  });

  it('fails, plan or apply, without any request, when an applied migration was edited', async () => {
    const all = await listMigrations(dir);
    const rows = all.map(registered);
    writeFiles({ '0001_b.sql': 'create table b(extra int);' });
    for (const apply of [false, true]) {
      const query = vi.fn().mockResolvedValue([]);
      await expect(runMigrations({ query, dir, apply, applied: rows })).rejects.toThrow(/0001_b.*edited/s);
      expect(query).not.toHaveBeenCalled();
    }
  });

  it('refuses, plan or apply, a pending migration that controls the transaction itself', async () => {
    writeFiles({ '0003_bad.sql': 'create table d();\ncommit;' });
    for (const apply of [false, true]) {
      const query = vi.fn().mockResolvedValue([]);
      await expect(runMigrations({ query, dir, apply })).rejects.toThrow(/0003_bad.*commit/is);
      expect(query).not.toHaveBeenCalled();
    }
  });
});

describe('readRegistry', () => {
  it('reads the ids and the hashes from private.schema_migrations', async () => {
    const query = vi.fn().mockResolvedValue([
      { id: '0000_a', sha256: 'aa' },
      { id: '0001_b', sha256: null },
    ]);
    expect(await readRegistry(query)).toEqual([
      { id: '0000_a', sha256: 'aa' },
      { id: '0001_b', sha256: null },
    ]);
    expect(String(query.mock.calls[0][0])).toMatch(/select id, sha256 from private\.schema_migrations/);
  });

  it('treats a database that has no registry yet as having nothing applied', async () => {
    for (const message of ['relation "private.schema_migrations" does not exist', 'schema "private" does not exist']) {
      expect(await readRegistry(vi.fn().mockRejectedValue(new Error(message)))).toEqual([]);
    }
  });

  it('does not hide any other error, nor accept an answer that is not a list of ids', async () => {
    await expect(readRegistry(vi.fn().mockRejectedValue(new Error('permission denied')))).rejects.toThrow(
      'permission denied',
    );
    await expect(readRegistry(vi.fn().mockResolvedValue({ message: 'nope' }))).rejects.toThrow();
    await expect(readRegistry(vi.fn().mockResolvedValue([{ id: 5 }]))).rejects.toThrow();
    await expect(readRegistry(vi.fn().mockResolvedValue([{ id: 'x', sha256: 5 }]))).rejects.toThrow();
  });
});

describe('renderPlan', () => {
  it('names each pending migration and says how to apply them, with no SQL and no secret', () => {
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', FAKE_KEY);
    try {
      const plan = renderPlan([migration('0000_a', 'select 1;'), migration('0001_b')]);
      expect(plan).toContain('0000_a');
      expect(plan).toContain('0001_b');
      expect(plan).toContain('--apply');
      expect(plan).not.toContain(FAKE_KEY);
      expect(plan).not.toContain('select 1;');
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it('says that there is nothing to apply when nothing is pending', () => {
    const plan = renderPlan([]);
    expect(plan).toMatch(/nothing/i);
    expect(plan).not.toContain('--apply');
  });
});

describe('credentials', () => {
  it('reads "Label: value" lines, ignoring accents, case, bullets and markdown decoration', () => {
    const text = [
      '# Supabase',
      '',
      '- **URL**: https://example.test',
      'Chave de serviço: `fake-service-key`',
      'ANON_KEY: fake-anon',
    ].join('\n');
    expect(parseCredentialsFile(text)).toEqual({ url: FAKE_URL, serviceKey: FAKE_KEY });
    expect(parseCredentialsFile('URL: https://example.test\nSERVICE_ROLE_KEY: fake-service-key')).toEqual({
      url: FAKE_URL,
      serviceKey: FAKE_KEY,
    });
    expect(parseCredentialsFile('nothing useful here')).toEqual({});
  });

  it('prefers the environment, and falls back to the file only for what the environment lacks', () => {
    const file = join(dir, 'Supabase.md');
    writeFileSync(file, 'URL: https://from-file.test\nSERVICE_ROLE_KEY: file-key\n');
    expect(resolveCredentials({ env: { SUPABASE_URL: FAKE_URL, SUPABASE_SERVICE_ROLE_KEY: FAKE_KEY }, file })).toEqual({
      url: FAKE_URL,
      serviceKey: FAKE_KEY,
    });
    expect(resolveCredentials({ env: { SUPABASE_URL: FAKE_URL }, file })).toEqual({
      url: FAKE_URL,
      serviceKey: 'file-key',
    });
    expect(resolveCredentials({ env: {}, file })).toEqual({ url: 'https://from-file.test', serviceKey: 'file-key' });
  });

  it('fails clearly, without echoing a key, when something is missing or the address is not safe', () => {
    expect(() => resolveCredentials({ env: {}, file: join(dir, 'missing.md') })).toThrow(/SUPABASE_URL/);
    expect(() =>
      resolveCredentials({
        env: { SUPABASE_URL: 'http://example.test', SUPABASE_SERVICE_ROLE_KEY: FAKE_KEY },
        file: '',
      }),
    ).toThrow(/https/);
    expect(() =>
      resolveCredentials({
        env: { SUPABASE_URL: 'https://user:pass@example.test', SUPABASE_SERVICE_ROLE_KEY: FAKE_KEY },
        file: '',
      }),
    ).toThrow();
    for (const bad of [
      { SUPABASE_URL: 'not a url', SUPABASE_SERVICE_ROLE_KEY: FAKE_KEY },
      { SUPABASE_URL: FAKE_URL },
    ]) {
      try {
        resolveCredentials({ env: bad, file: '' });
        expect.unreachable();
      } catch (error) {
        expect(String((error as Error).message)).not.toContain(FAKE_KEY);
      }
    }
  });
});

// The service key must only ever reach the host the owner named. fetch follows redirects by default, and undici keeps a
// custom header such as `apikey` (and the body, which is the SQL) on a redirect to another origin.
describe('createQuery and redirects', () => {
  const servers: Server[] = [];
  // The shared test setup replaces fetch with a stub that rejects, so that no test reaches a real server. These tests talk
  // to servers they start themselves on 127.0.0.1, so they take the real fetch back.
  beforeEach(() => {
    vi.unstubAllGlobals();
  });
  afterEach(async () => {
    await Promise.all(servers.splice(0).map((server) => new Promise((done) => server.close(done))));
  });

  function listen(
    handler: (
      request: IncomingMessage,
      respond: (status: number, headers?: Record<string, string>, body?: string) => void,
    ) => void,
  ) {
    const seen: { url: string; headers: IncomingMessage['headers'] }[] = [];
    return new Promise<{ port: number; seen: typeof seen }>((resolveListen) => {
      const server = createServer((request, response) => {
        seen.push({ url: request.url ?? '', headers: request.headers });
        request.resume();
        handler(request, (status, headers = {}, body = '[]') => {
          response.writeHead(status, headers);
          response.end(body);
        });
      });
      servers.push(server);
      server.listen(0, '127.0.0.1', () => resolveListen({ port: (server.address() as AddressInfo).port, seen }));
    });
  }

  it.each([307, 308])('never sends the key to the second host of a %i redirect, and fails instead', async (status) => {
    const second = await listen((_request, respond) => respond(200));
    const first = await listen((_request, respond) =>
      respond(status, { location: `http://localhost:${second.port}/pg/query` }),
    );
    const query = createQuery({ url: `http://127.0.0.1:${first.port}`, serviceKey: FAKE_KEY });
    const error = (await query('select 1;').catch((caught: unknown) => caught)) as Error;
    expect(error).toBeInstanceOf(Error);
    expect(error.message).not.toContain(FAKE_KEY);
    expect(first.seen).toHaveLength(1);
    expect(second.seen).toHaveLength(0);
  });

  it('still answers a plain request and sends the key only to the pinned host', async () => {
    const only = await listen((_request, respond) =>
      respond(200, { 'content-type': 'application/json' }, '[{"ok":true}]'),
    );
    const query = createQuery({ url: `http://127.0.0.1:${only.port}`, serviceKey: FAKE_KEY });
    expect(await query('select 1;')).toEqual([{ ok: true }]);
    expect(only.seen[0].headers.apikey).toBe(FAKE_KEY);
    expect(only.seen[0].url).toBe('/pg/query');
  });

  it('asks the fetch it was given not to follow redirects', async () => {
    const fetchFake = vi.fn(async () => new Response('[]', { status: 200 }));
    await createQuery({ url: FAKE_URL, serviceKey: FAKE_KEY, fetch: fetchFake as unknown as typeof fetch })(
      'select 1;',
    );
    expect((fetchFake.mock.calls[0] as unknown[])[1]).toMatchObject({ redirect: 'error' });
  });
});

describe('runCli', () => {
  const migrationsDir = () => dir;
  const env = { SUPABASE_URL: FAKE_URL, SUPABASE_SERVICE_ROLE_KEY: FAKE_KEY };
  const A_SQL = 'create table a();';
  const B_SQL = 'create table b();';

  function setup(registry: unknown = [{ id: '0000_a', sha256: sha256Of(A_SQL) }]) {
    writeFiles({ '0000_a.sql': A_SQL, '0001_b.sql': B_SQL });
    const requests: { url: string; headers: Record<string, string>; redirect?: string; body: { query: string } }[] = [];
    const fetchFake = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as { query: string };
      requests.push({
        url: String(url),
        headers: init?.headers as Record<string, string>,
        redirect: init?.redirect,
        body,
      });
      const answer = body.query.startsWith('select id, sha256 from private.schema_migrations') ? registry : [];
      return new Response(JSON.stringify(answer), { status: 200, headers: { 'content-type': 'application/json' } });
    });
    const out: string[] = [];
    const err: string[] = [];
    const io = { stdout: (text: string) => out.push(text), stderr: (text: string) => err.push(text) };
    return { requests, fetchFake, out, err, io, fetch: fetchFake as unknown as typeof fetch };
  }

  const args = (...rest: string[]) => ['--dir', migrationsDir(), '--host', FAKE_HOST, ...rest];

  it('shows the plan by default: it reads the registry, runs no migration and never prints the key', async () => {
    const { requests, out, err, io, fetch } = setup();
    const code = await runCli({ argv: args(), env, fetch, ...io });
    expect(code).toBe(0);
    expect(requests).toHaveLength(1);
    expect(requests[0].url).toBe('https://example.test/pg/query');
    expect(requests[0].body.query).toMatch(/^select id, sha256 from private\.schema_migrations/);
    expect(requests[0].redirect).toBe('error');
    const printed = [...out, ...err].join('\n');
    expect(printed).toContain(FAKE_HOST);
    expect(printed).toContain('0001_b');
    expect(printed).not.toContain('0000_a');
    expect(printed).not.toContain(FAKE_KEY);
    expect(printed).not.toContain('create table');
  });

  it('applies the pending migrations with --apply --yes, authenticated by the key, and never prints the key', async () => {
    const { requests, out, err, io, fetch } = setup();
    const code = await runCli({ argv: args('--apply', '--yes'), env, fetch, ...io });
    expect(code).toBe(0);
    expect(requests).toHaveLength(2);
    expect(requests[1].body.query).toContain('create table b();');
    expect(requests[1].headers.apikey).toBe(FAKE_KEY);
    expect(requests[1].headers.Authorization).toBe(`Bearer ${FAKE_KEY}`);
    expect([...out, ...err].join('\n')).not.toContain(FAKE_KEY);
  });

  it('with --apply but without --yes it shows the host and the pending ids, runs nothing and exits non zero', async () => {
    const { requests, out, err, io, fetch } = setup();
    const code = await runCli({ argv: args('--apply'), env, fetch, ...io });
    expect(code).not.toBe(0);
    expect(requests).toHaveLength(1);
    const printed = [...out, ...err].join('\n');
    expect(printed).toContain(FAKE_HOST);
    expect(printed).toContain('0001_b');
    expect(printed).toContain('--yes');
  });

  it('refuses to start, before any request, when the host is not pinned or is not the target', async () => {
    for (const argv of [
      ['--dir', migrationsDir()],
      ['--dir', migrationsDir(), '--host', 'other.example.test'],
      ['--apply', '--yes', '--dir', migrationsDir()],
    ]) {
      const { fetchFake, err, io, fetch } = setup();
      const code = await runCli({ argv, env, fetch, ...io });
      expect(code).not.toBe(0);
      expect(fetchFake).not.toHaveBeenCalled();
      expect(err.join('\n')).toMatch(/--host|SUPABASE_EXPECTED_HOST/);
      expect(err.join('\n')).not.toContain(FAKE_KEY);
    }
  });

  it('takes the pinned host from SUPABASE_EXPECTED_HOST, and compares it without regard to case', async () => {
    const { requests, io, fetch } = setup();
    const code = await runCli({
      argv: ['--dir', migrationsDir()],
      env: { ...env, SUPABASE_EXPECTED_HOST: 'EXAMPLE.test' },
      fetch,
      ...io,
    });
    expect(code).toBe(0);
    expect(requests).toHaveLength(1);
  });

  it('refuses a TLS check that is switched off, before any request', async () => {
    const { fetchFake, err, io, fetch } = setup();
    const code = await runCli({ argv: args(), env: { ...env, NODE_TLS_REJECT_UNAUTHORIZED: '0' }, fetch, ...io });
    expect(code).not.toBe(0);
    expect(fetchFake).not.toHaveBeenCalled();
    expect(err.join('\n')).toMatch(/NODE_TLS_REJECT_UNAUTHORIZED/);
  });

  it('fails the plan, and applies nothing, when an applied migration was edited', async () => {
    const { requests, err, io, fetch } = setup([{ id: '0000_a', sha256: sha256Of('create table a(old int);') }]);
    for (const extra of [[], ['--apply', '--yes']]) {
      const code = await runCli({ argv: args(...extra), env, fetch, ...io });
      expect(code).not.toBe(0);
    }
    expect(requests.every((request) => request.body.query.startsWith('select id, sha256'))).toBe(true);
    expect(err.join('\n')).toMatch(/0000_a.*edited/s);
  });

  it('reads the credentials from the file given with --credentials when the environment has none', async () => {
    const { requests, io, fetch } = setup();
    const file = join(dir, 'Supabase.md');
    writeFileSync(file, `URL: ${FAKE_URL}\nSERVICE_ROLE_KEY: ${FAKE_KEY}\n`);
    const code = await runCli({ argv: args('--credentials', file), env: {}, fetch, ...io });
    expect(code).toBe(0);
    expect(requests[0].headers.apikey).toBe(FAKE_KEY);
  });

  it('on a failure it sends a rollback, re-reads the registry, exits non zero and never prints the key', async () => {
    const { fetchFake, out, err, io, fetch } = setup([]);
    fetchFake.mockImplementation(async (_url, init) => {
      const body = JSON.parse(String(init?.body)) as { query: string };
      if (body.query.startsWith('select id, sha256') || body.query.trim() === 'rollback;')
        return new Response('[]', { status: 200 });
      return new Response(JSON.stringify({ error: `syntax error, key ${FAKE_KEY}` }), { status: 400 });
    });
    const code = await runCli({ argv: args('--apply', '--yes'), env, fetch, ...io });
    expect(code).not.toBe(0);
    const sent = fetchFake.mock.calls.map(([, init]) =>
      (JSON.parse(String(init?.body)) as { query: string }).query.trim(),
    );
    expect(sent.filter((sql) => sql === 'rollback;')).toHaveLength(1);
    expect(sent.filter((sql) => sql.startsWith('select id, sha256'))).toHaveLength(2);
    const printed = [...out, ...err].join('\n');
    expect(printed).toContain('0000_a');
    expect(printed).not.toContain(FAKE_KEY);
  });

  it('exits non zero without any request when the credentials are missing', async () => {
    const { fetchFake, err, io, fetch } = setup();
    const code = await runCli({ argv: args('--credentials', join(dir, 'none.md')), env: {}, fetch, ...io });
    expect(code).not.toBe(0);
    expect(fetchFake).not.toHaveBeenCalled();
    expect(err.join('\n')).toMatch(/SUPABASE_URL/);
  });

  it('keeps the real migrations folder free of files the runner would ignore', () => {
    const names = readdirSync(REAL_MIGRATIONS);
    expect(names.length).toBeGreaterThan(0);
    for (const name of names) expect(name).toMatch(/^\d{4}_[a-z0-9_]+\.sql$/);
    expect(readFileSync(join(REAL_MIGRATIONS, names[0]), 'utf8')).toContain('private.schema_migrations');
  });
});
