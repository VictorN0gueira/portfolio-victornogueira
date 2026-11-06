// Proves the row level security of the migrations in a throwaway Postgres: it applies supabase/tests/00_supabase_roles.sql,
// then every migration of supabase/migrations (twice: a migration must be idempotent), then supabase/tests/rls.sql.
// It stops at the first error with a non zero exit code.
//
//   DATABASE_URL=postgres://postgres:test@localhost:55432/postgres npm run db:test
//
// It needs `psql` on the PATH (the PSQL variable names another binary). It only runs against a blank database of this very
// machine, because the migrations and the role stand-ins must never reach a real Supabase:
//   * The address is parsed here, never handed to psql. libpq reads `?host=`, `?hostaddr=`, `?service=` and a list of hosts
//     out of a URI, and they override the host the URL seems to name, so a check on the URL host proves nothing. Any query
//     string, fragment, list of hosts or host that is not localhost, 127.0.0.1 or ::1 is refused.
//   * psql gets the connection through PGHOST, PGPORT, PGUSER, PGDATABASE and PGPASSWORD in its environment (no password
//     in its arguments), and every other PG variable of the inherited environment (PGSERVICE, PGHOSTADDR, PGOPTIONS...) is
//     removed.
//   * A database that already has the marks of a Supabase (a supabase_admin role, a login role anon or service_role, the
//     schemas auth, storage) is refused before the first statement of ours.
// The address is never printed, because it may carry a password.
import { spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { listMigrations } from './db-migrate.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '..');
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);
const DEFAULT_PORT = '5432';
const NAME = /^[A-Za-z0-9_]+$/;
const CONNECT_TIMEOUT_S = '10';
const EXIT_FAILED = 1;
const EXIT_BAD_USAGE = 2;

// What only a real Supabase has. The role stand-in of the tests creates anon and service_role without a login.
const NOT_BLANK_QUERY = `select count(*) from pg_roles where rolname = 'supabase_admin'
  or (rolname in ('anon', 'service_role') and rolcanlogin)
  or exists (select from pg_namespace where nspname in ('auth', 'storage', 'supabase_functions'));`;
const LOCALE_QUERY =
  "select current_database() || ': collate ' || datcollate || ', ctype ' || datctype from pg_database where datname = current_database();";

/**
 * Parses the address and throws unless it names a local database in the simple form
 * postgres://user[:password]@host[:port][/database], with no query string, no fragment and a single host.
 * Nothing in an error message repeats the address, which may carry a password.
 * @returns {{ host: string; port: string; user: string; password: string; database: string }}
 */
export function parseLocalDatabaseUrl(raw) {
  const refuse = (reason) => {
    throw new Error(`DATABASE_URL ${reason}: the tests only run in a throwaway database of this machine`);
  };
  if (typeof raw !== 'string' || raw === '') return refuse('is missing');
  if (!/^postgres(ql)?:\/\//.test(raw)) return refuse('must be a postgres:// address');
  // libpq reads a query string or a fragment into connection parameters that override the host, so none is allowed.
  if (/[?#]/.test(raw)) return refuse('must not carry a query string or a fragment');
  const authority = raw.slice(raw.indexOf('//') + 2).split('/')[0];
  if ((authority.match(/@/g) ?? []).length > 1) return refuse('is ambiguous: more than one @ before the host');
  let address;
  try {
    address = new URL(raw);
  } catch {
    return refuse('is not an address');
  }
  if (address.hostname.includes(',') || address.host.includes(',')) return refuse('must name a single host');
  const host = address.hostname.replace(/^\[|\]$/g, '');
  if (!LOCAL_HOSTS.has(host)) return refuse('must point to this machine (localhost)');
  const port = address.port === '' ? DEFAULT_PORT : address.port;
  if (!/^\d{1,5}$/.test(port) || Number(port) < 1 || Number(port) > 65535)
    return refuse('has a port that is not a number');
  let user;
  let password;
  let database;
  try {
    user = decodeURIComponent(address.username);
    password = decodeURIComponent(address.password);
    database = decodeURIComponent(address.pathname.replace(/^\//, '')) || 'postgres';
  } catch {
    return refuse('has a part that is not valid');
  }
  if (!NAME.test(user)) return refuse('needs a user of letters, digits and underscores');
  // psql would read a name with an equals sign or a space as a whole connection string.
  if (!NAME.test(database)) return refuse('needs a database name of letters, digits and underscores');
  return { host, port, user, password, database };
}

/** Throws unless the address is a local postgres address in the simple form. */
export function assertLocalDatabase(raw) {
  parseLocalDatabaseUrl(raw);
}

/**
 * The environment of psql: the inherited one without any PG variable (PGSERVICE, PGHOSTADDR, PGOPTIONS, PGPASSFILE...),
 * then the connection of the parsed address. The inherited object is not changed.
 */
export function psqlEnvironment(base, parsed) {
  const env = Object.fromEntries(Object.entries(base).filter(([key]) => !key.toUpperCase().startsWith('PG')));
  env.PGHOST = parsed.host;
  env.PGPORT = parsed.port;
  env.PGUSER = parsed.user;
  env.PGDATABASE = parsed.database;
  env.PGCONNECT_TIMEOUT = CONNECT_TIMEOUT_S;
  if (parsed.password !== '') env.PGPASSWORD = parsed.password;
  return env;
}

/**
 * @param {{ url: string; psql?: string; root?: string; log?: (text: string) => void; spawn?: typeof spawnSync; baseEnv?: Record<string, string | undefined> }} options
 * @returns {Promise<boolean>} true when every step passed
 */
export async function runRlsTests({
  url,
  psql = 'psql',
  root = repoRoot,
  log = () => {},
  spawn = spawnSync,
  baseEnv = process.env,
}) {
  const parsed = parseLocalDatabaseUrl(url);
  const env = psqlEnvironment(baseEnv, parsed);
  const run = (args, input) => {
    const result = spawn(psql, ['-X', '-q', '-v', 'ON_ERROR_STOP=1', ...args], {
      input,
      env,
      encoding: 'utf8',
      maxBuffer: 16 * 1024 * 1024,
    });
    if (result.error) throw new Error(`could not run ${psql}: ${result.error.message}`);
    return {
      ok: result.status === 0,
      stdout: result.stdout ?? '',
      output: `${result.stdout ?? ''}${result.stderr ?? ''}`,
    };
  };

  const notBlank = run(['-At', '-c', NOT_BLANK_QUERY]);
  if (!notBlank.ok) {
    log(notBlank.output.trimEnd());
    throw new Error('could not ask the database whether it is blank');
  }
  if (notBlank.stdout.trim() !== '0') {
    throw new Error(
      'this database is not blank: it already has the roles or the schemas of a Supabase, and the role stand-in must never run there',
    );
  }
  const locale = run(['-At', '-c', LOCALE_QUERY]);
  if (locale.ok) log(`database ${locale.stdout.trim()}`);

  const step = (name, sql, singleTransaction) => {
    const { ok, output } = run([...(singleTransaction ? ['--single-transaction'] : []), '-f', '-'], sql);
    log(`== ${name}`);
    if (output.trim() !== '') log(output.trimEnd());
    if (!ok) log(`FAILED at: ${name}`);
    return ok;
  };
  const migrations = await listMigrations(join(root, 'supabase', 'migrations'));
  if (migrations.length === 0) throw new Error('there are no migrations to test');
  const roles = await readFile(join(root, 'supabase', 'tests', '00_supabase_roles.sql'), 'utf8');
  const rls = await readFile(join(root, 'supabase', 'tests', 'rls.sql'), 'utf8');
  if (!step('supabase roles stand-in', roles, true)) return false;
  for (const pass of ['first', 'second (idempotence)']) {
    for (const migration of migrations) {
      if (!step(`migration ${migration.id}, ${pass} pass`, migration.sql, true)) return false;
    }
  }
  return step('rls tests', rls, false);
}

const isEntryPoint = process.argv[1] !== undefined && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
if (isEntryPoint) {
  const url = process.env.DATABASE_URL;
  try {
    parseLocalDatabaseUrl(url);
  } catch (error) {
    process.stderr.write(`run-rls-tests: ${error.message}\n`);
    process.exit(EXIT_BAD_USAGE);
  }
  try {
    const ok = await runRlsTests({
      url,
      psql: process.env.PSQL || 'psql',
      log: (text) => process.stdout.write(`${text}\n`),
    });
    process.exitCode = ok ? 0 : EXIT_FAILED;
  } catch (error) {
    process.stderr.write(`run-rls-tests: ${error.message}\n`);
    process.exitCode = EXIT_FAILED;
  }
}
