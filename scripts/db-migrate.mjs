// Applies the SQL migrations of supabase/migrations to the self-hosted Supabase of the owner, through the /pg/query
// route of pg-meta (the only way in: the Postgres port is not reachable from outside the EasyPanel).
//
//   npm run db:plan                       shows what is pending, runs nothing (it only reads the registry)
//   npm run db:migrate                    the same as `node scripts/db-migrate.mjs --apply`: runs what is pending
//   node scripts/db-migrate.mjs --host <host> [--apply --yes] [--dir <folder>] [--credentials <file>]
//
// The service key is powerful, so three things hold before it is sent anywhere:
//   1. The host is pinned: --host <host> (or SUPABASE_EXPECTED_HOST) must equal the host of the address, before the very
//      first request, even for the plan. A wrong address in the environment or in the file cannot receive the key.
//   2. Redirects are never followed (redirect: 'error'), because a redirect to another origin would keep the apikey
//      header and the body, which is the SQL.
//   3. A TLS check that is switched off (NODE_TLS_REJECT_UNAUTHORIZED=0) is refused, and the address must be https.
// --apply also needs --yes, after the host and the pending ids were shown.
//
// Credentials: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from the environment. Whatever the environment lacks is read
// from Acessos/Supabase.md (lines "Label: value"; the folder is ignored by git) or from --credentials. The key is never
// printed, and it is cut out of any message that is.
//
// Each migration goes in one request together with its row in private.schema_migrations, inside begin/commit with
// server side timeouts, so a migration is either applied and registered or neither. A migration may not control the
// transaction itself, nor use a command that cannot run in one (see assertTransactional). The registry keeps the sha256
// of each applied file: editing an applied migration fails the plan instead of being ignored. A failed migration stops
// the run, a rollback is sent, and the registry is read again to say what was really applied.
import { createHash, randomBytes } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const MIGRATION_FILE = /^\d{4}_[a-z0-9_]+\.sql$/;
const REGISTRY = 'private.schema_migrations';
const REQUEST_TIMEOUT_MS = 60_000;
// The server gives up before the client does, so an aborted request never leaves a statement running behind it.
const STATEMENT_TIMEOUT_S = 55;
const LOCK_TIMEOUT_S = 10;
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
 * The migrations of a folder, in the order of the file name. Only NNNN_name.sql files count, with a lower case name of
 * letters, digits and underscores (a README, a folder, or a name with a quote, a space or a dollar sign is ignored). The
 * id is the file name without .sql.
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

/** The hex sha256 of a migration. Line endings are normalised, so a Windows checkout hashes like a Linux one. */
export function sha256Of(sql) {
  return createHash('sha256').update(sql.replace(/\r\n/g, '\n')).digest('hex');
}

/** What is still to apply, in the original order. */
export function pendingMigrations(all, appliedIds) {
  const applied = new Set(appliedIds);
  return all.filter((migration) => !applied.has(migration.id));
}

/**
 * The ids of the applied migrations whose file no longer has the hash the registry kept (or whose hash is missing).
 * A migration that is applied but no longer in the folder, or not applied yet, is not "edited".
 * @param {{ id: string; sql: string }[]} all
 * @param {{ id: string; sha256: string | null }[]} registry
 */
export function editedMigrations(all, registry) {
  const byId = new Map(all.map((migration) => [migration.id, migration]));
  return registry
    .filter((row) => byId.has(row.id) && row.sha256 !== sha256Of(byId.get(row.id).sql))
    .map((row) => row.id);
}

/** The SQL with comments and string literals (quoted, escaped and dollar quoted) replaced by a blank. */
function stripLiteralsAndComments(sql) {
  let out = '';
  let index = 0;
  while (index < sql.length) {
    const rest = sql.slice(index);
    let match;
    if ((match = /^--[^\n]*/.exec(rest))) {
      out += ' ';
      index += match[0].length;
    } else if (rest.startsWith('/*')) {
      // Block comments nest in Postgres.
      let depth = 1;
      let cursor = 2;
      while (cursor < rest.length && depth > 0) {
        if (rest.startsWith('/*', cursor)) {
          depth += 1;
          cursor += 2;
        } else if (rest.startsWith('*/', cursor)) {
          depth -= 1;
          cursor += 2;
        } else {
          cursor += 1;
        }
      }
      out += ' ';
      index += cursor;
    } else if ((match = /^\$([A-Za-z_][A-Za-z0-9_]*)?\$/.exec(rest))) {
      const close = rest.indexOf(match[0], match[0].length);
      out += ' ';
      index += close === -1 ? rest.length : close + match[0].length;
    } else if ((match = /^[eE]?'(?:[^'\\]|''|\\.)*'/.exec(rest)) || (match = /^'(?:[^']|'')*'/.exec(rest))) {
      out += ' ';
      index += match[0].length;
    } else if ((match = /^"(?:[^"]|"")*"/.exec(rest))) {
      out += ' ';
      index += match[0].length;
    } else {
      out += sql[index];
      index += 1;
    }
  }
  return out;
}

const TRANSACTION_CONTROL = /^(begin|start|commit|end|rollback|abort|prepare\s+transaction)\b/i;
const NOT_TRANSACTIONAL = [
  [/\bconcurrently\b/i, 'a command with CONCURRENTLY'],
  [/^vacuum\b/i, 'VACUUM'],
  [/^alter\s+type\b[^;]*\badd\s+value\b/i, 'ALTER TYPE ... ADD VALUE'],
  [/^(create|drop)\s+database\b/i, 'CREATE DATABASE or DROP DATABASE'],
  [/^(create|drop)\s+tablespace\b/i, 'CREATE TABLESPACE or DROP TABLESPACE'],
  [/^alter\s+system\b/i, 'ALTER SYSTEM'],
  [/^cluster\b/i, 'CLUSTER'],
];

/**
 * Throws when the migration would break the all or nothing promise: a transaction control statement of its own (a
 * `commit;` would end the transaction of the runner and leave the registry row outside it), or a command that cannot run
 * inside a transaction block.
 * @param {{ id: string; sql: string }} migration
 */
export function assertTransactional(migration) {
  const statements = stripLiteralsAndComments(migration.sql)
    .split(';')
    .map((statement) => statement.trim())
    .filter((statement) => statement !== '');
  for (const statement of statements) {
    const control = TRANSACTION_CONTROL.exec(statement);
    if (control) {
      throw new Error(
        `migration ${migration.id} controls the transaction itself (${statement.split(/\s+/).slice(0, 2).join(' ').toLowerCase()}): the runner owns begin and commit`,
      );
    }
    for (const [pattern, name] of NOT_TRANSACTIONAL) {
      if (pattern.test(statement)) {
        throw new Error(
          `migration ${migration.id} uses ${name}, which cannot run inside a transaction: apply it by hand`,
        );
      }
    }
  }
}

/** The plan as text: ids and what to do next. No SQL and no credential, so it is safe to print and to paste. */
export function renderPlan(pending) {
  if (pending.length === 0) return 'Nothing to apply: every migration is already registered.';
  const lines = pending.map((migration) => `  - ${migration.id}`);
  return [
    `${pending.length} pending migration(s), in this order:`,
    ...lines,
    'Run again with --apply --yes to execute them.',
  ].join('\n');
}

/**
 * The request of one migration: its SQL and its registry row share a transaction, with server side timeouts. The id and
 * the hash go in dollar quoted literals with a random tag, so whatever they hold cannot close the literal.
 */
export function buildMigrationSql(migration) {
  const tag = `vn_${randomBytes(8).toString('hex')}`;
  const literal = (text) => `$${tag}$${text}$${tag}$`;
  return [
    'begin;',
    `set local statement_timeout = '${STATEMENT_TIMEOUT_S}s';`,
    `set local lock_timeout = '${LOCK_TIMEOUT_S}s';`,
    migration.sql.trim(),
    `insert into ${REGISTRY} (id, sha256) values (${literal(migration.id)}, ${literal(sha256Of(migration.sql))}) on conflict (id) do nothing;`,
    'commit;',
  ].join('\n');
}

/**
 * Plans or applies the migrations. With apply false it does not call query at all. With apply true it calls query once
 * per pending migration, in order, and stops at the first one that fails (after a best effort rollback), so the next ones
 * are never sent. `applied` is what the registry already holds (see readRegistry), `[{ id, sha256 }]`, none by default.
 * It throws, plan or apply, before any request, when an applied migration was edited or a pending one is not safe to run
 * inside a transaction.
 * @param {{ query: (sql: string) => Promise<unknown>; dir: string; apply: boolean; applied?: { id: string; sha256: string | null }[] }} options
 * @returns {Promise<{ applied: string[]; planned: string[] }>}
 */
export async function runMigrations({ query, dir, apply, applied = [] }) {
  const all = await listMigrations(dir);
  const edited = editedMigrations(all, applied);
  if (edited.length > 0) {
    throw new Error(
      `migration ${edited.join(', ')} was edited after it was applied: undo the edit and add a new migration instead`,
    );
  }
  const pending = pendingMigrations(
    all,
    applied.map((row) => row.id),
  );
  pending.forEach(assertTransactional);
  const planned = pending.map((migration) => migration.id);
  const done = [];
  if (!apply) return { applied: done, planned };
  for (const migration of pending) {
    try {
      await query(buildMigrationSql(migration));
    } catch (cause) {
      // The connection may hold an aborted transaction. Best effort: a failing rollback must not hide the real error.
      await Promise.resolve(query('rollback;')).catch(() => undefined);
      const reason = cause instanceof Error ? cause.message : String(cause);
      throw Object.assign(new Error(`migration ${migration.id} failed: ${reason}`, { cause }), { applied: [...done] });
    }
    done.push(migration.id);
  }
  return { applied: done, planned };
}

/**
 * What the registry holds, `[{ id, sha256 }]`. A database where the registry does not exist yet (the very first run, before
 * 0000) has nothing applied. Any other error, or an answer that is not a list of rows, is raised: guessing here could
 * repeat or skip a migration.
 */
export async function readRegistry(query) {
  let rows;
  try {
    rows = await query(`select id, sha256 from ${REGISTRY} order by id;`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/does not exist/.test(message) && /schema_migrations|schema "private"/.test(message)) return [];
    throw error;
  }
  const valid =
    Array.isArray(rows) &&
    rows.every((row) => typeof row?.id === 'string' && (row.sha256 === null || typeof row.sha256 === 'string'));
  if (!valid) throw new Error('the registry answered with something that is not a list of migrations');
  return rows.map((row) => ({ id: row.id, sha256: row.sha256 }));
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

/**
 * Throws unless the host of the address is the one the owner named (--host or SUPABASE_EXPECTED_HOST), compared without
 * regard to case. It runs before the first request, so the key never reaches a host that was not named.
 */
export function assertPinnedHost(url, expectedHost) {
  if (!expectedHost) {
    throw new Error(
      'name the host the key may be sent to with --host <host> (or SUPABASE_EXPECTED_HOST), so a wrong address cannot receive it',
    );
  }
  const actual = new URL(url);
  const named = expectedHost.trim().toLowerCase();
  if (named !== actual.host.toLowerCase() && named !== actual.hostname.toLowerCase()) {
    throw new Error(
      `the address points to ${actual.host}, which is not the host named with --host (${expectedHost}): nothing was sent`,
    );
  }
}

/** Throws when the environment switches the TLS check off: the key would travel to whoever answers. */
export function assertTlsChecked(env) {
  if (env.NODE_TLS_REJECT_UNAUTHORIZED === '0') {
    throw new Error(
      'NODE_TLS_REJECT_UNAUTHORIZED=0 switches the TLS check off: unset it, the key is not sent without that check',
    );
  }
}

const redactor = (secret) => (text) => (secret ? text.split(secret).join('[redacted]') : text);

/** A query function over the /pg/query route. It never follows a redirect, and its errors never carry the key. */
export function createQuery({ url, serviceKey, fetch: fetchImpl = fetch }) {
  const redact = redactor(serviceKey);
  return async (sql) => {
    let response;
    try {
      response = await fetchImpl(`${url}/pg/query`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
        body: JSON.stringify({ query: sql }),
        redirect: 'error',
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch (error) {
      const reason =
        error instanceof Error ? (error.cause instanceof Error ? error.cause.message : error.message) : String(error);
      throw new Error(redact(`the request to /pg/query failed: ${reason}`));
    }
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

/** The arguments of the command line of db-migrate, and of db-audit, which shares the pin. */
export function parseArgs(argv, { allowed = ['--apply', '--yes'] } = {}) {
  const options = {
    apply: false,
    yes: false,
    host: undefined,
    dir: join(repoRoot, 'supabase', 'migrations'),
    credentials: undefined,
  };
  const valued = { '--dir': 'dir', '--credentials': 'credentials', '--host': 'host' };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--apply' && allowed.includes(arg)) options.apply = true;
    else if (arg === '--yes' && allowed.includes(arg)) options.yes = true;
    else if (valued[arg] !== undefined) {
      const value = argv[index + 1];
      if (value === undefined) throw new Error(`${arg} needs a value`);
      options[valued[arg]] = arg === '--host' ? value : resolve(value);
      index += 1;
    } else throw new Error(`unknown argument ${arg}`);
  }
  return options;
}

/**
 * The setup both command lines share, before any request: the TLS check, the credentials and the pinned host.
 * @returns {{ url: string; serviceKey: string; query: (sql: string) => Promise<unknown> }}
 */
export function connect({ options, env, fetch: fetchImpl }) {
  assertTlsChecked(env);
  const file = options.credentials ?? env.SUPABASE_CREDENTIALS_FILE ?? join(repoRoot, 'Acessos', 'Supabase.md');
  const { url, serviceKey } = resolveCredentials({ env, file });
  assertPinnedHost(url, options.host ?? env.SUPABASE_EXPECTED_HOST);
  return { url, serviceKey, query: createQuery({ url, serviceKey, fetch: fetchImpl }) };
}

async function reportRegistryAfterFailure(query, stdout) {
  try {
    const rows = await readRegistry(query);
    stdout(`Registered after the failure: ${rows.length === 0 ? 'none' : rows.map((row) => row.id).join(', ')}`);
  } catch {
    stdout('Could not read the registry after the failure: check it before running again.');
  }
}

/**
 * The command line, with its inputs injected so a test can drive it without a network or a terminal.
 * @returns {Promise<number>} the exit code
 */
export async function runCli({ argv, env, fetch: fetchImpl = fetch, stdout, stderr }) {
  let secret = '';
  let query;
  try {
    let options;
    try {
      options = parseArgs(argv);
    } catch (error) {
      stderr(
        `db-migrate: ${error.message}\nusage: node scripts/db-migrate.mjs --host <host> [--apply --yes] [--dir <folder>] [--credentials <file>]`,
      );
      return EXIT_BAD_USAGE;
    }
    let connection;
    try {
      connection = connect({ options, env, fetch: fetchImpl });
    } catch (error) {
      stderr(`db-migrate: ${error.message}`);
      return EXIT_BAD_USAGE;
    }
    secret = connection.serviceKey;
    query = connection.query;
    stdout(`Target: ${new URL(connection.url).host}`);
    const applied = await readRegistry(query);
    const result = await runMigrations({ query, dir: options.dir, apply: false, applied });
    stdout(renderPlan(result.planned.map((id) => ({ id }))));
    if (!options.apply || result.planned.length === 0) return 0;
    if (!options.yes) {
      stderr('db-migrate: nothing was applied. Check the host and the ids above, then add --yes.');
      return EXIT_BAD_USAGE;
    }
    const done = await runMigrations({ query, dir: options.dir, apply: true, applied });
    stdout(`Applied: ${done.applied.join(', ')}`);
    return 0;
  } catch (error) {
    stderr(`db-migrate: ${redactor(secret)(error instanceof Error ? error.message : String(error))}`);
    if (query && Array.isArray(error?.applied)) await reportRegistryAfterFailure(query, stdout);
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
