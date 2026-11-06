// @vitest-environment node
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  listMigrations,
  parseCredentialsFile,
  pendingMigrations,
  readAppliedIds,
  renderPlan,
  resolveCredentials,
  runCli,
  runMigrations,
  type Migration,
} from './db-migrate.mjs';

// Everything here is synthetic: a temporary folder, made up credentials on example.test and a fake fetch. Nothing in
// this file reaches a real database or reads the real Acessos folder.
const FAKE_URL = 'https://example.test';
const FAKE_KEY = 'fake-service-key';

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

describe('pendingMigrations', () => {
  it('returns only the migrations that are not applied yet, in order', () => {
    const all = [migration('0000_a'), migration('0001_b'), migration('0002_c')];
    expect(pendingMigrations(all, ['0001_b']).map((m) => m.id)).toEqual(['0000_a', '0002_c']);
    expect(pendingMigrations(all, [])).toEqual(all);
    expect(pendingMigrations(all, ['0000_a', '0001_b', '0002_c'])).toEqual([]);
    expect(pendingMigrations(all, ['9999_unknown']).map((m) => m.id)).toEqual(['0000_a', '0001_b', '0002_c']);
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
      const id = `000${index}_${name}`;
      expect(sql).toContain(`create table ${name}();`);
      expect(sql).toContain('insert into public.schema_migrations');
      expect(sql).toContain(`'${id}'`);
      // The migration runs first and the registry insert closes the same transaction.
      expect(sql.indexOf(`create table ${name}();`)).toBeLessThan(sql.indexOf('insert into public.schema_migrations'));
      expect(sql.trimStart()).toMatch(/^begin;/);
      expect(sql.trimEnd()).toMatch(/commit;$/);
    });
    expect(result).toEqual({ applied: ['0000_a', '0001_b', '0002_c'], planned: ['0000_a', '0001_b', '0002_c'] });
  });

  it('stops at a migration that fails and never sends, nor registers, the ones after it', async () => {
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
    expect(query).toHaveBeenCalledTimes(2);
    expect(query.mock.calls.map(([sql]) => String(sql)).join('\n')).not.toContain('create table c();');
  });

  it('does not repeat the migrations already applied when it runs again', async () => {
    const query = vi.fn().mockResolvedValue([]);
    const first = await runMigrations({ query, dir, apply: true });
    query.mockClear();
    const second = await runMigrations({ query, dir, apply: true, appliedIds: first.applied });
    expect(query).not.toHaveBeenCalled();
    expect(second).toEqual({ applied: [], planned: [] });
    writeFiles({ '0003_d.sql': 'create table d();' });
    const third = await runMigrations({ query, dir, apply: true, appliedIds: first.applied });
    expect(query).toHaveBeenCalledTimes(1);
    expect(third.applied).toEqual(['0003_d']);
  });

  it('writes the id of a migration as a quoted literal', async () => {
    writeFiles({ "0004_o'brien.sql": 'select 1;' });
    const query = vi.fn().mockResolvedValue([]);
    await runMigrations({ query, dir, apply: true, appliedIds: ['0000_a', '0001_b', '0002_c'] });
    expect(String(query.mock.calls[0][0])).toContain("'0004_o''brien'");
  });
});

describe('readAppliedIds', () => {
  it('reads the ids from public.schema_migrations', async () => {
    const query = vi.fn().mockResolvedValue([{ id: '0000_a' }, { id: '0001_b' }]);
    expect(await readAppliedIds(query)).toEqual(['0000_a', '0001_b']);
    expect(String(query.mock.calls[0][0])).toMatch(/select id from public\.schema_migrations/);
  });

  it('treats a database that has no registry yet as having nothing applied', async () => {
    const query = vi.fn().mockRejectedValue(new Error('relation "public.schema_migrations" does not exist'));
    expect(await readAppliedIds(query)).toEqual([]);
  });

  it('does not hide any other error, nor accept an answer that is not a list of ids', async () => {
    await expect(readAppliedIds(vi.fn().mockRejectedValue(new Error('permission denied')))).rejects.toThrow(
      'permission denied',
    );
    await expect(readAppliedIds(vi.fn().mockResolvedValue({ message: 'nope' }))).rejects.toThrow();
    await expect(readAppliedIds(vi.fn().mockResolvedValue([{ id: 5 }]))).rejects.toThrow();
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

describe('runCli', () => {
  const migrationsDir = () => dir;

  function setup() {
    writeFiles({ '0000_a.sql': 'create table a();', '0001_b.sql': 'create table b();' });
    const requests: { url: string; headers: Record<string, string>; body: { query: string } }[] = [];
    const respond = (sql: string): unknown =>
      sql.startsWith('select id from public.schema_migrations') ? [{ id: '0000_a' }] : [];
    const fetchFake = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as { query: string };
      requests.push({ url: String(url), headers: init?.headers as Record<string, string>, body });
      return new Response(JSON.stringify(respond(body.query)), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    });
    const out: string[] = [];
    const err: string[] = [];
    const io = { stdout: (text: string) => out.push(text), stderr: (text: string) => err.push(text) };
    return { requests, fetchFake, out, err, io };
  }

  const env = { SUPABASE_URL: FAKE_URL, SUPABASE_SERVICE_ROLE_KEY: FAKE_KEY };

  it('shows the plan by default: it reads the registry, runs no migration and never prints the key', async () => {
    const { requests, fetchFake, out, err, io } = setup();
    const code = await runCli({
      argv: ['--dir', migrationsDir()],
      env,
      fetch: fetchFake as unknown as typeof fetch,
      ...io,
    });
    expect(code).toBe(0);
    expect(requests).toHaveLength(1);
    expect(requests[0].url).toBe('https://example.test/pg/query');
    expect(requests[0].body.query).toMatch(/^select id from public\.schema_migrations/);
    const printed = [...out, ...err].join('\n');
    expect(printed).toContain('0001_b');
    expect(printed).not.toContain('0000_a');
    expect(printed).not.toContain(FAKE_KEY);
    expect(printed).not.toContain('create table');
  });

  it('applies the pending migrations with --apply, authenticated by the key, and never prints the key', async () => {
    const { requests, fetchFake, out, err, io } = setup();
    const code = await runCli({
      argv: ['--apply', '--dir', migrationsDir()],
      env,
      fetch: fetchFake as unknown as typeof fetch,
      ...io,
    });
    expect(code).toBe(0);
    expect(requests).toHaveLength(2);
    expect(requests[1].body.query).toContain('create table b();');
    expect(requests[1].headers.apikey).toBe(FAKE_KEY);
    expect(requests[1].headers.Authorization).toBe(`Bearer ${FAKE_KEY}`);
    expect([...out, ...err].join('\n')).not.toContain(FAKE_KEY);
  });

  it('reads the credentials from the file given with --credentials when the environment has none', async () => {
    const { requests, fetchFake, io } = setup();
    const file = join(dir, 'Supabase.md');
    writeFileSync(file, `URL: ${FAKE_URL}\nSERVICE_ROLE_KEY: ${FAKE_KEY}\n`);
    const code = await runCli({
      argv: ['--dir', migrationsDir(), '--credentials', file],
      env: {},
      fetch: fetchFake as unknown as typeof fetch,
      ...io,
    });
    expect(code).toBe(0);
    expect(requests[0].headers.apikey).toBe(FAKE_KEY);
  });

  it('exits non zero and prints the failing migration, never the key, when the server rejects one', async () => {
    const { fetchFake, out, err, io } = setup();
    fetchFake.mockImplementation(async (_url, init) => {
      const body = JSON.parse(String(init?.body)) as { query: string };
      if (body.query.startsWith('select id')) return new Response('[]', { status: 200 });
      return new Response(JSON.stringify({ error: `syntax error, key ${FAKE_KEY}` }), { status: 400 });
    });
    const code = await runCli({
      argv: ['--apply', '--dir', migrationsDir()],
      env,
      fetch: fetchFake as unknown as typeof fetch,
      ...io,
    });
    expect(code).not.toBe(0);
    const printed = [...out, ...err].join('\n');
    expect(printed).toContain('0000_a');
    expect(printed).not.toContain(FAKE_KEY);
  });

  it('exits non zero without any request when the credentials are missing', async () => {
    const { fetchFake, err, io } = setup();
    const code = await runCli({
      argv: ['--dir', migrationsDir(), '--credentials', join(dir, 'none.md')],
      env: {},
      fetch: fetchFake as unknown as typeof fetch,
      ...io,
    });
    expect(code).not.toBe(0);
    expect(fetchFake).not.toHaveBeenCalled();
    expect(err.join('\n')).toMatch(/SUPABASE_URL/);
  });
});
