// A read only audit of what the four roles of the foundation can reach in the owner's Supabase, to run right after the
// migrations are applied (and again after any change of the Supabase itself):
//
//   node scripts/db-audit.mjs --host <host> [--credentials <file>]
//
// It goes through the same pinned /pg/query client as db-migrate (host named with --host, no redirects, TLS checked) and
// sends only `select` statements. It prints a report and never a secret.
//
// What to look for in the report:
//   * Functions with EXECUTE: anon and authenticated should hold none of ours. A new function of the schema public that
//     is not revoked from PUBLIC is callable by anon through the API.
//   * CREATE on schema public: false for all four roles.
//   * Relations of public and private: who owns each one and the ACL. The OWNER decides which default privileges applied
//     when the table was created (default ACLs are per owner role), so after the first apply check that the owner is the
//     role whose default ACL the migration cleared, and that anon and authenticated are absent from every ACL but the one
//     of articles.
//   * Default ACLs (pg_default_acl): no entry may hand anon or authenticated anything in the schema public.
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { connect, parseArgs } from './db-migrate.mjs';

export const AUDIT_ROLES = ['anon', 'authenticated', 'news_writer', 'n8n_leads'];
const ROLE_LIST = AUDIT_ROLES.map((role) => `'${role}'`).join(', ');
const EXIT_FAILED = 1;
const EXIT_BAD_USAGE = 2;

export const AUDIT_QUERIES = [
  {
    title: 'Roles: login, bypass, limits and settings',
    sql: `select rolname, rolcanlogin, rolsuper, rolbypassrls, rolconnlimit, rolconfig::text as rolconfig
      from pg_roles where rolname in (${ROLE_LIST}) order by rolname`,
  },
  {
    title: 'Memberships that involve these roles',
    sql: `select roleid::regrole::text as role, member::regrole::text as member
      from pg_auth_members where roleid::regrole::text in (${ROLE_LIST}) or member::regrole::text in (${ROLE_LIST}) order by 1, 2`,
  },
  {
    title: 'Functions each role can EXECUTE, outside pg_catalog and information_schema',
    sql: `select r.rolname as role, n.nspname as schema, p.proname as function, p.prosecdef as security_definer
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      cross join (select rolname from pg_roles where rolname in (${ROLE_LIST})) r
      where n.nspname not in ('pg_catalog', 'information_schema') and has_function_privilege(r.rolname, p.oid, 'execute')
      order by 1, 2, 3`,
  },
  {
    title: 'Schema and database privileges of each role',
    sql: `select r.rolname as role,
        has_schema_privilege(r.rolname, 'public', 'create') as create_in_public,
        has_schema_privilege(r.rolname, 'public', 'usage') as usage_of_public,
        has_schema_privilege(r.rolname, 'private', 'usage') as usage_of_private,
        has_database_privilege(r.rolname, current_database(), 'temp') as temp_on_database
      from pg_roles r where r.rolname in (${ROLE_LIST}) order by 1`,
  },
  {
    title: 'Schemas each role can USE',
    sql: `select r.rolname as role, n.nspname as schema
      from pg_namespace n cross join (select rolname from pg_roles where rolname in (${ROLE_LIST})) r
      where n.nspname not like 'pg\\_%' and n.nspname <> 'information_schema' and has_schema_privilege(r.rolname, n.oid, 'usage')
      order by 1, 2`,
  },
  {
    title: 'Relations of public and private: kind, owner and ACL',
    sql: `select n.nspname as schema, c.relname, c.relkind, c.relowner::regrole::text as owner,
        c.relrowsecurity as rls, c.relacl::text as acl
      from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname in ('public', 'private') and c.relkind in ('r', 'p', 'v', 'm', 'f', 'S') order by 1, 2`,
  },
  {
    title: 'Default privileges (pg_default_acl), per owner role',
    sql: `select d.defaclrole::regrole::text as owner, coalesce(n.nspname, '(all schemas)') as schema,
        d.defaclobjtype as object_type, d.defaclacl::text as acl
      from pg_default_acl d left join pg_namespace n on n.oid = d.defaclnamespace order by 1, 2, 3`,
  },
];

/**
 * Runs every query, in order. A query that fails is reported in its own section, so one missing privilege does not hide
 * the rest of the report.
 * @returns {Promise<{ title: string; rows: Record<string, unknown>[]; error?: string }[]>}
 */
export async function runAudit({ query }) {
  const sections = [];
  for (const { title, sql } of AUDIT_QUERIES) {
    try {
      const rows = await query(sql);
      sections.push({ title, rows: Array.isArray(rows) ? rows : [] });
    } catch (error) {
      sections.push({ title, rows: [], error: error instanceof Error ? error.message : String(error) });
    }
  }
  return sections;
}

const cell = (value) => (value === null || value === undefined ? '-' : String(value));

/** The report as text: one block per section, one line per row, columns separated by " | ". */
export function renderAudit(sections) {
  return sections
    .map(({ title, rows, error }) => {
      const head = `== ${title} (${rows.length})`;
      if (error) return `${head}\n  could not run: ${error}`;
      if (rows.length === 0) return `${head}\n  none`;
      const columns = Object.keys(rows[0]);
      return [
        head,
        `  ${columns.join(' | ')}`,
        ...rows.map((row) => `  ${columns.map((column) => cell(row[column])).join(' | ')}`),
      ].join('\n');
    })
    .join('\n\n');
}

/**
 * The command line, with its inputs injected like db-migrate's.
 * @returns {Promise<number>} the exit code
 */
export async function runAuditCli({ argv, env, fetch: fetchImpl = fetch, stdout, stderr }) {
  let secret = '';
  try {
    let options;
    try {
      options = parseArgs(argv, { allowed: [] });
    } catch (error) {
      stderr(`db-audit: ${error.message}\nusage: node scripts/db-audit.mjs --host <host> [--credentials <file>]`);
      return EXIT_BAD_USAGE;
    }
    let connection;
    try {
      connection = connect({ options, env, fetch: fetchImpl });
    } catch (error) {
      stderr(`db-audit: ${error.message}`);
      return EXIT_BAD_USAGE;
    }
    secret = connection.serviceKey;
    stdout(`Target: ${new URL(connection.url).host}`);
    stdout(renderAudit(await runAudit({ query: connection.query })));
    return 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    stderr(`db-audit: ${secret ? message.split(secret).join('[redacted]') : message}`);
    return EXIT_FAILED;
  }
}

const isEntryPoint = process.argv[1] !== undefined && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
if (isEntryPoint) {
  process.exitCode = await runAuditCli({
    argv: process.argv.slice(2),
    env: process.env,
    stdout: (text) => process.stdout.write(`${text}\n`),
    stderr: (text) => process.stderr.write(`${text}\n`),
  });
}
