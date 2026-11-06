// Applies the SQL migrations of supabase/migrations to the self-hosted Supabase of the owner, through the /pg/query
// route of pg-meta (the only way in: the Postgres port is not reachable from outside the EasyPanel).
//
//   npm run db:plan                       shows what is pending, runs nothing (it only reads the registry)
//   npm run db:migrate                    the same as `node scripts/db-migrate.mjs --apply`: runs what is pending
//   node scripts/db-migrate.mjs [--apply] [--dir <migrations folder>] [--credentials <file>]
//
// Credentials: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from the environment. Whatever the environment lacks is read
// from Acessos/Supabase.md (lines "Label: value"; the folder is ignored by git) or from --credentials. The service key
// is only ever sent as a header to that address. It is never printed, and it is cut out of any message that is.
//
// Each migration goes in one request together with its row in public.schema_migrations, inside begin/commit, so a
// migration is either applied and registered or neither. A migration that fails stops the run: the ones after it are
// not sent. The migrations themselves are written to be idempotent (see 0000 onwards), so a rerun after a partial
// failure is safe.
import { existsSync, readFileSync } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const MIGRATION_FILE = /^\d{4}_.+\.sql$/;
const REGISTRY = 'public.schema_migrations';
const REQUEST_TIMEOUT_MS = 60_000;
const ERROR_DETAIL_LIMIT = 300;
const EXIT_FAILED = 1;
const EXIT_BAD_USAGE = 2;
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1']);

const URL_LABELS = new Set(['url', 'supabaseurl', 'apiurl', 'urlapi']);
const SERVICE_KEY_LABELS = new Set([
  'servicerolekey',
  'supabaseservicerolekey',
  'servicekey',
  'servicerole',
  'chavedeservico',
  'chaveservico',
  'chaveservicerole',
]);

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '..');

/**
 * The migrations of a folder, in the order of the file name. Only NNNN_name.sql files count (a README, a folder or a
 * file with another extension is ignored). The id is the file name without .sql.
 * @param {string} dir
 * @returns {Promise<{ id: string; file: string; sql: string }[]>}
 */
export async function listMigrations(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = entries
    .filter((entry) => entry.isFile() && MIGRATION_FILE.test(entry.name))
    .map((entry) => entry.name)
    .sort();
  return Promise.all(
    files.map(async (file) => ({
      id: file.slice(0, -'.sql'.length),
      file,
      sql: await readFile(join(dir, file), 'utf8'),
    })),
  );
}

/** What is still to apply, in the original order. */
export function pendingMigrations(all, appliedIds) {
  const applied = new Set(appliedIds);
  return all.filter((migration) => !applied.has(migration.id));
}

/** The plan as text: ids and what to do next. No SQL and no credential, so it is safe to print and to paste. */
export function renderPlan(pending) {
  if (pending.length === 0) return 'Nothing to apply: every migration is already registered.';
  const lines = pending.map((migration) => `  - ${migration.id}`);
  return [
    `${pending.length} pending migration(s), in this order:`,
    ...lines,
    'Run again with --apply to execute them.',
  ].join('\n');
}

const quote = (text) => `'${text.replaceAll("'", "''")}'`;

/** One request per migration: its SQL and its registry row share a transaction. */
function withRegistry(migration) {
  return [
    'begin;',
    migration.sql.trim(),
    `insert into ${REGISTRY} (id) values (${quote(migration.id)}) on conflict (id) do nothing;`,
    'commit;',
  ].join('\n');
}

/**
 * Plans or applies the migrations. With apply false it does not call query at all. With apply true it calls query once
 * per pending migration, in order, and stops at the first one that fails, so the next ones are never sent.
 * `appliedIds` (what the registry already holds, see readAppliedIds) defaults to none.
 * @param {{ query: (sql: string) => Promise<unknown>; dir: string; apply: boolean; appliedIds?: string[] }} options
 * @returns {Promise<{ applied: string[]; planned: string[] }>}
 */
export async function runMigrations({ query, dir, apply, appliedIds = [] }) {
  const pending = pendingMigrations(await listMigrations(dir), appliedIds);
  const planned = pending.map((migration) => migration.id);
  const applied = [];
  if (!apply) return { applied, planned };
  for (const migration of pending) {
    try {
      await query(withRegistry(migration));
    } catch (cause) {
      const reason = cause instanceof Error ? cause.message : String(cause);
      throw Object.assign(new Error(`migration ${migration.id} failed: ${reason}`, { cause }), {
        applied: [...applied],
      });
    }
    applied.push(migration.id);
  }
  return { applied, planned };
}

/**
 * The ids the registry holds. A database where the registry does not exist yet (the very first run, before 0000) has
 * nothing applied. Any other error, or an answer that is not a list of ids, is raised: guessing here could repeat or
 * skip a migration.
 */
export async function readAppliedIds(query) {
  let rows;
  try {
    rows = await query(`select id from ${REGISTRY} order by id;`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/schema_migrations/.test(message) && /does not exist/.test(message)) return [];
    throw error;
  }
  if (!Array.isArray(rows) || rows.some((row) => typeof row?.id !== 'string')) {
    throw new Error('the registry answered with something that is not a list of ids');
  }
  return rows.map((row) => row.id);
}

const normalizeLabel = (label) =>
  label
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

const cleanValue = (value) =>
  value
    .trim()
    .replace(/^[`'"*]+|[`'"*]+$/g, '')
    .trim();

/** The URL and the service key of a "Label: value" file, whatever the accents, case, bullets or markdown. */
export function parseCredentialsFile(text) {
  const found = {};
  for (const line of text.split(/\r?\n/)) {
    const match = /^\s*(?:[-*]\s+)?(.+?)\s*[:=]\s*(.+?)\s*$/.exec(line);
    if (!match) continue;
    const label = normalizeLabel(match[1]);
    const value = cleanValue(match[2]);
    if (value === '') continue;
    if (URL_LABELS.has(label) && found.url === undefined) found.url = value;
    if (SERVICE_KEY_LABELS.has(label) && found.serviceKey === undefined) found.serviceKey = value;
  }
  return found;
}

/** The address must be https (a plain http address would send the key in the clear) and carry no user or password. */
function checkAddress(raw) {
  let address;
  try {
    address = new URL(raw);
  } catch {
    throw new Error('SUPABASE_URL is not a valid address');
  }
  if (address.protocol !== 'https:' && !(address.protocol === 'http:' && LOCAL_HOSTS.has(address.hostname))) {
    throw new Error('SUPABASE_URL must be an https address');
  }
  if (address.username !== '' || address.password !== '')
    throw new Error('SUPABASE_URL must not carry a user or a password');
  return address.href.replace(/\/+$/, '');
}

/**
 * The credentials to use: the environment first, the file for what the environment lacks.
 * @param {{ env: Record<string, string | undefined>; file: string }} options
 * @returns {{ url: string; serviceKey: string }}
 */
export function resolveCredentials({ env, file }) {
  const fromFile = file !== '' && existsSync(file) ? parseCredentialsFile(readFileSync(file, 'utf8')) : {};
  const url = env.SUPABASE_URL || fromFile.url;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY || fromFile.serviceKey;
  const missing = [url ? '' : 'SUPABASE_URL', serviceKey ? '' : 'SUPABASE_SERVICE_ROLE_KEY'].filter(Boolean);
  if (missing.length > 0) {
    throw new Error(
      `missing ${missing.join(' and ')}: set them in the environment, or put "Label: value" lines in the credentials file`,
    );
  }
  return { url: checkAddress(url), serviceKey };
}

const redactor = (secret) => (text) => (secret ? text.split(secret).join('[redacted]') : text);

/** A query function over the /pg/query route. Its errors never carry the key. */
export function createQuery({ url, serviceKey, fetch: fetchImpl = fetch }) {
  const redact = redactor(serviceKey);
  return async (sql) => {
    const response = await fetchImpl(`${url}/pg/query`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
      body: JSON.stringify({ query: sql }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    const text = await response.text();
    if (!response.ok) {
      let detail = text;
      try {
        const body = JSON.parse(text);
        detail = body?.message ?? body?.error ?? text;
      } catch {
        // Not JSON: the raw text is the detail.
      }
      throw new Error(redact(`/pg/query answered ${response.status}: ${String(detail).slice(0, ERROR_DETAIL_LIMIT)}`));
    }
    return text === '' ? [] : JSON.parse(text);
  };
}

function parseArgs(argv) {
  const options = { apply: false, dir: join(repoRoot, 'supabase', 'migrations'), credentials: undefined };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--apply') options.apply = true;
    else if (arg === '--dir' || arg === '--credentials') {
      const value = argv[index + 1];
      if (value === undefined) throw new Error(`${arg} needs a value`);
      options[arg === '--dir' ? 'dir' : 'credentials'] = resolve(value);
      index += 1;
    } else throw new Error(`unknown argument ${arg}`);
  }
  return options;
}

/**
 * The command line, with its inputs injected so a test can drive it without a network or a terminal.
 * @returns {Promise<number>} the exit code
 */
export async function runCli({ argv, env, fetch: fetchImpl = fetch, stdout, stderr }) {
  let secret = '';
  try {
    let options;
    try {
      options = parseArgs(argv);
    } catch (error) {
      stderr(
        `db-migrate: ${error.message}\nusage: node scripts/db-migrate.mjs [--apply] [--dir <folder>] [--credentials <file>]`,
      );
      return EXIT_BAD_USAGE;
    }
    const file = options.credentials ?? env.SUPABASE_CREDENTIALS_FILE ?? join(repoRoot, 'Acessos', 'Supabase.md');
    const { url, serviceKey } = resolveCredentials({ env, file });
    secret = serviceKey;
    const query = createQuery({ url, serviceKey, fetch: fetchImpl });
    stdout(`Target: ${new URL(url).host}`);
    const appliedIds = await readAppliedIds(query);
    const result = await runMigrations({ query, dir: options.dir, apply: options.apply, appliedIds });
    if (!options.apply) {
      stdout(renderPlan(result.planned.map((id) => ({ id }))));
      return 0;
    }
    stdout(
      result.applied.length === 0
        ? 'Nothing to apply: every migration is already registered.'
        : `Applied: ${result.applied.join(', ')}`,
    );
    return 0;
  } catch (error) {
    stderr(`db-migrate: ${redactor(secret)(error instanceof Error ? error.message : String(error))}`);
    return EXIT_FAILED;
  }
}

const isEntryPoint = process.argv[1] !== undefined && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
if (isEntryPoint) {
  process.exitCode = await runCli({
    argv: process.argv.slice(2),
    env: process.env,
    stdout: (text) => process.stdout.write(`${text}\n`),
    stderr: (text) => process.stderr.write(`${text}\n`),
  });
}
