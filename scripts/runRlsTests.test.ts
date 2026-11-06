// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { assertLocalDatabase, parseLocalDatabaseUrl, psqlEnvironment, runRlsTests } from './run-rls-tests.mjs';

// The RLS runner applies migrations and role stand-ins: it must never be pointed at a real database by accident. The
// address is parsed here, not by libpq: libpq reads `?host=`, `?hostaddr=`, `?service=` and a list of hosts from the URI
// and they override the host, so a check on the host of the URL alone proves nothing about where psql connects.
describe('parseLocalDatabaseUrl', () => {
  it.each([
    [
      'postgres://postgres:test@localhost:55432/postgres',
      { host: 'localhost', port: '55432', user: 'postgres', password: 'test', database: 'postgres' },
    ],
    [
      'postgresql://postgres:test@127.0.0.1:5432/rls_c',
      { host: '127.0.0.1', port: '5432', user: 'postgres', password: 'test', database: 'rls_c' },
    ],
    [
      'postgres://postgres:te%40st@[::1]/postgres',
      { host: '::1', port: '5432', user: 'postgres', password: 'te@st', database: 'postgres' },
    ],
    [
      'postgres://postgres@localhost',
      { host: 'localhost', port: '5432', user: 'postgres', password: '', database: 'postgres' },
    ],
  ])('accepts %s', (url, expected) => {
    expect(parseLocalDatabaseUrl(url)).toEqual(expected);
    expect(() => assertLocalDatabase(url)).not.toThrow();
  });

  it.each([
    // The bypasses of libpq: the query string overrides the host.
    'postgres://postgres:x@localhost/postgres?host=db.example.com',
    'postgres://postgres:x@localhost/postgres?hostaddr=10.0.0.5',
    'postgres://postgres:x@localhost/postgres?service=prod',
    'postgres://postgres:x@localhost/postgres?host=a,b',
    'postgres://postgres:x@localhost/postgres?options=-c%20search_path%3Dx',
    'postgres://postgres:x@localhost/postgres?sslmode=disable',
    'postgres://postgres:x@localhost/postgres?',
    'postgres://postgres:x@localhost/postgres#frag',
    // A list of hosts, a socket directory, another machine.
    'postgres://localhost,db.example.test/postgres',
    'postgres://localhost:5432,db.example.test:5432/postgres',
    'postgres://postgres:x@%2Fvar%2Frun%2Fpostgresql/postgres',
    'postgres://postgres:test@db.example.test:5432/postgres',
    'postgres://postgres:test@10.0.0.5:5432/postgres',
    'postgres://postgres:test@localhost.example.test:5432/postgres',
    'postgres://postgres:test@localhost.:5432/postgres',
    'postgres://postgres:test@utilitarios-supabase-pooler:6543/postgres',
    // More than one @ in the authority: WHATWG and libpq disagree on where the host starts.
    'postgres://x@db.example.test@localhost/postgres',
    // Names that psql would read as a connection string, and a port that is not a number.
    'postgres://postgres:x@localhost/postgres%20host%3Ddb.example.test',
    'postgres://postgres:x@localhost/db=x',
    'postgres://pg%20user:x@localhost/postgres',
    'postgres://postgres:x@localhost:abc/postgres',
    'postgres://postgres:x@localhost:99999/postgres',
    'https://localhost/postgres',
    'not an address',
    '',
    undefined,
  ])('refuses %s', (url) => {
    expect(() => parseLocalDatabaseUrl(url)).toThrow();
    expect(() => assertLocalDatabase(url)).toThrow();
  });

  it('never repeats the password of the address in the error', () => {
    for (const url of [
      'postgres://postgres:secret-pass@db.example.test:5432/postgres',
      'postgres://postgres:secret-pass@localhost/postgres?host=db.example.test',
      'postgres://postgres:secret-pass@localhost:abc/postgres',
    ]) {
      try {
        parseLocalDatabaseUrl(url);
        expect.unreachable();
      } catch (error) {
        expect((error as Error).message).not.toContain('secret-pass');
      }
    }
  });
});

describe('psqlEnvironment', () => {
  const parsed = { host: 'localhost', port: '55432', user: 'postgres', password: 'test', database: 'rls_c' };

  it('sets the connection through PG variables and strips every other PG variable of the inherited environment', () => {
    const inherited = {
      PATH: '/usr/bin',
      HOME: '/home/x',
      PGHOST: 'db.example.test',
      PGHOSTADDR: '10.0.0.5',
      PGSERVICE: 'prod',
      PGSERVICEFILE: '/tmp/service',
      PGOPTIONS: '-c search_path=x',
      PGPASSFILE: '/tmp/pgpass',
      PGSYSCONFDIR: '/tmp/etc',
      PGSSLMODE: 'disable',
      pgtarget_session_attrs: 'any',
    };
    const env = psqlEnvironment(inherited, parsed);
    expect(env).toMatchObject({
      PATH: '/usr/bin',
      HOME: '/home/x',
      PGHOST: 'localhost',
      PGPORT: '55432',
      PGUSER: 'postgres',
      PGDATABASE: 'rls_c',
      PGPASSWORD: 'test',
    });
    for (const stripped of [
      'PGHOSTADDR',
      'PGSERVICE',
      'PGSERVICEFILE',
      'PGOPTIONS',
      'PGPASSFILE',
      'PGSYSCONFDIR',
      'PGSSLMODE',
      'pgtarget_session_attrs',
    ]) {
      expect(env, stripped).not.toHaveProperty(stripped);
    }
    expect(
      Object.keys(env)
        .filter((key) => key.toUpperCase().startsWith('PG'))
        .sort(),
    ).toEqual(['PGCONNECT_TIMEOUT', 'PGDATABASE', 'PGHOST', 'PGPASSWORD', 'PGPORT', 'PGUSER']);
  });

  it('does not change the environment it was given', () => {
    const inherited = { PGHOST: 'db.example.test' };
    psqlEnvironment(inherited, parsed);
    expect(inherited).toEqual({ PGHOST: 'db.example.test' });
  });

  it('leaves PGPASSWORD out when the address has no password', () => {
    expect(psqlEnvironment({ PGPASSWORD: 'inherited' }, { ...parsed, password: '' })).not.toHaveProperty('PGPASSWORD');
  });
});

describe('runRlsTests', () => {
  const url = 'postgres://postgres:secret-pass@localhost:55432/postgres';

  type Call = { command: string; args: string[]; options: { env: Record<string, string>; input?: string } };

  function fakeSpawn(preflight: string) {
    const calls: Call[] = [];
    const spawn = vi.fn((command: string, args: string[], options: Call['options']) => {
      calls.push({ command, args, options });
      const isQuery = args.includes('-c');
      return { status: 0, stdout: isQuery ? `${preflight}\n` : '', stderr: '', error: undefined };
    });
    return { spawn, calls };
  }

  it('hands psql no address and no password in its arguments, and the connection in the environment', async () => {
    const { spawn, calls } = fakeSpawn('0');
    const ok = await runRlsTests({
      url,
      spawn,
      baseEnv: { PGSERVICE: 'prod', PGHOST: 'db.example.test', PATH: '/usr/bin' },
    });
    expect(ok).toBe(true);
    expect(calls.length).toBeGreaterThan(4);
    for (const { args, options } of calls) {
      expect(args.join(' ')).not.toContain('secret-pass');
      expect(args.join(' ')).not.toContain('postgres://');
      expect(args).not.toContain('-d');
      expect(options.env).toMatchObject({
        PGHOST: 'localhost',
        PGPORT: '55432',
        PGDATABASE: 'postgres',
        PGUSER: 'postgres',
        PGPASSWORD: 'secret-pass',
      });
      expect(options.env).not.toHaveProperty('PGSERVICE');
    }
  });

  it('refuses, before running anything of ours, a database that already holds what a real Supabase holds', async () => {
    const { spawn, calls } = fakeSpawn('1');
    await expect(runRlsTests({ url, spawn, baseEnv: {} })).rejects.toThrow(/blank|supabase/i);
    // Only the check itself ran: no role stand-in, no migration, no test.
    expect(calls.every(({ args }) => args.includes('-c'))).toBe(true);
    const sql = calls[0].args[calls[0].args.indexOf('-c') + 1];
    expect(sql).toMatch(/supabase_admin/);
    expect(sql).toMatch(/rolcanlogin/);
    expect(sql).toMatch(/anon/);
    expect(sql).toMatch(/service_role/);
  });

  it('refuses an address that is not local before it spawns anything', async () => {
    const { spawn } = fakeSpawn('0');
    await expect(
      runRlsTests({ url: 'postgres://postgres:x@localhost/postgres?host=db.example.test', spawn, baseEnv: {} }),
    ).rejects.toThrow();
    expect(spawn).not.toHaveBeenCalled();
  });

  it('stops at the first step that fails', async () => {
    const calls: string[][] = [];
    const spawn = vi.fn((_command: string, args: string[]) => {
      calls.push(args);
      const isQuery = args.includes('-c');
      return {
        status: !isQuery && calls.length > 3 ? 3 : 0,
        stdout: isQuery ? '0\n' : '',
        stderr: 'ERROR: boom',
        error: undefined,
      };
    });
    const logs: string[] = [];
    const ok = await runRlsTests({ url, spawn, baseEnv: {}, log: (text: string) => logs.push(text) });
    expect(ok).toBe(false);
    expect(logs.join('\n')).toMatch(/FAILED at/);
    expect(logs.join('\n')).not.toContain('secret-pass');
  });
});
