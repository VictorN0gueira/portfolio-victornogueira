// Proves the row level security of the migrations in a throwaway Postgres: it applies supabase/tests/00_supabase_roles.sql,
// then every migration of supabase/migrations (twice: a migration must be idempotent), then supabase/tests/rls.sql.
// It stops at the first error with a non zero exit code.
//
//   DATABASE_URL=postgres://postgres:test@localhost:55432/postgres npm run db:test
//
// It needs `psql` on the PATH (the PSQL variable names another binary). It only accepts a local database: the migrations
// and the role stand-ins must never reach the real Supabase, and this refuses an address that is not the machine itself.
// The address is never printed, because it may carry a password.
import { spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { listMigrations } from './db-migrate.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '..');
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]', '::1']);
const EXIT_FAILED = 1;
const EXIT_BAD_USAGE = 2;

/** Throws unless the address is a postgres address of this very machine. */
export function assertLocalDatabase(raw) {
  let address;
  try {
    address = new URL(raw ?? '');
  } catch {
    throw new Error('DATABASE_URL is missing or is not an address');
  }
  if (address.protocol !== 'postgres:' && address.protocol !== 'postgresql:') {
    throw new Error('DATABASE_URL must be a postgres:// address');
  }
  if (!LOCAL_HOSTS.has(address.hostname)) {
    throw new Error('DATABASE_URL must point to this machine (localhost): the tests only run in a throwaway database');
  }
}

/** Sends `sql` to psql on stdin and returns { ok, output }. A failing statement ends the run (ON_ERROR_STOP). */
function runPsql({ psql, url, sql, singleTransaction }) {
  const args = [
    '-X',
    '-q',
    '-v',
    'ON_ERROR_STOP=1',
    '-d',
    url,
    ...(singleTransaction ? ['--single-transaction'] : []),
    '-f',
    '-',
  ];
  const result = spawnSync(psql, args, { input: sql, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
  if (result.error) throw new Error(`could not run ${psql}: ${result.error.message}`);
  const output = `${result.stdout ?? ''}${result.stderr ?? ''}`;
  return { ok: result.status === 0, output };
}

/**
 * @param {{ url: string; psql?: string; root?: string; log?: (text: string) => void }} options
 * @returns {Promise<boolean>} true when every step passed
 */
export async function runRlsTests({ url, psql = 'psql', root = repoRoot, log = () => {} }) {
  assertLocalDatabase(url);
  const step = (name, sql, singleTransaction) => {
    const { ok, output } = runPsql({ psql, url, sql, singleTransaction });
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
    assertLocalDatabase(url);
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
