// Measures the critical path of the built site: what the browser downloads before the home can run. That is the
// entry module of dist/index.html plus every modulepreload, each gzipped at level 9, and their sum.
//
//   npm run budget                      prints the table and the sum, always exits 0
//   npm run budget -- --enforce         exits 1 when the sum is above the budget
//   node scripts/check-bundle-budget.mjs --dist=<folder> --limit=<kB> [--enforce]
//
// The target is the 150 kB gzip JS of a landing page (rules/web/performance). The budget that --enforce holds is 160 kB.
// A kilobyte is 1000 bytes, the unit `vite build` prints, so the numbers can be compared with its output.
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { gzipSync } from 'node:zlib';

/** The number to reach: the 150 kB gzip JS of a landing page. It is printed with every report, not enforced. */
export const TARGET_KB = 150;
/**
 * The number --enforce holds, in CI. The owner accepted 160 kB (the build measures about 156) because the remainder to
 * the 150 target is three things that cannot move safely now: tailwind-merge 9.8 kB gzip (every cn() call relies on its
 * conflict rules, so a smaller config needs an equivalence test over every class string and risks visual regressions),
 * the brand icons of the integrations strip 4.8 kB, and the lucide icons chunk 5.1 kB. React, react-dom and the router
 * are 74.6 kB of the path and cannot be cut. Lower this number when one of those three moves.
 */
export const BUDGET_KB = 160;
const BYTES_PER_KB = 1000;
const GZIP_LEVEL = 9;
const ASSETS_FOLDER = 'assets/';
const EXIT_OVER_BUDGET = 1;
const EXIT_BAD_USAGE = 2;

const MODULE_SCRIPT = /<script\b[^>]*\btype="module"[^>]*\bsrc="([^"]+)"[^>]*>/gi;
const MODULE_PRELOAD = /<link\b[^>]*\brel="modulepreload"[^>]*\bhref="([^"]+)"[^>]*>/gi;

/** The path of a built file relative to dist, whatever base path the page is served under; null when it is not under assets. */
function assetPath(url) {
  const pathname = url.split(/[?#]/)[0];
  const at = pathname.indexOf(`/${ASSETS_FOLDER}`);
  return at === -1 ? null : pathname.slice(at + 1);
}

/** The files of the critical path, in the order the page lists them: its module scripts, then its modulepreloads. */
export function criticalPathAssets(html) {
  const urls = [...html.matchAll(MODULE_SCRIPT), ...html.matchAll(MODULE_PRELOAD)]
    .sort((a, b) => a.index - b.index)
    .map((match) => match[1]);
  return [...new Set(urls.map(assetPath).filter((path) => path !== null))];
}

/** Rows (file, raw and gzip bytes) of the critical path of a dist folder, their sum and the limit. */
export function measureBudget(distDir, { limitKb = BUDGET_KB } = {}) {
  const indexFile = join(distDir, 'index.html');
  if (!existsSync(indexFile)) throw new Error(`${indexFile} does not exist: run npm run build first`);
  const rows = criticalPathAssets(readFileSync(indexFile, 'utf8')).map((file) => {
    const path = join(distDir, file);
    if (!existsSync(path)) throw new Error(`index.html asks for ${file}, which is not in ${distDir}`);
    const bytes = readFileSync(path);
    return { file, rawBytes: bytes.length, gzipBytes: gzipSync(bytes, { level: GZIP_LEVEL }).length };
  });
  const totalBytes = rows.reduce((sum, row) => sum + row.gzipBytes, 0);
  return { rows, totalBytes, limitBytes: limitKb * BYTES_PER_KB };
}

const kb = (bytes) => (bytes / BYTES_PER_KB).toFixed(1);

/** The text of the report: one line per file, the sum, and where it stands against the limit. */
export function formatReport({ rows, totalBytes, limitBytes }) {
  const width = Math.max(...rows.map((row) => row.file.length), 'file'.length);
  const lines = rows.map((row) => `${row.file.padEnd(width)}  ${kb(row.rawBytes).padStart(8)} kB  ${kb(row.gzipBytes).padStart(8)} kB gzip`);
  const header = `${'file'.padEnd(width)}  ${'raw'.padStart(11)}  ${'gzip'.padStart(13)}`;
  const gap = totalBytes - limitBytes;
  const standing = gap > 0 ? `${kb(gap)} kB over the budget of ${kb(limitBytes)} kB` : `within the budget of ${kb(limitBytes)} kB (${kb(-gap)} kB to spare)`;
  const verdict = `${standing}, target ${TARGET_KB}, budget ${limitBytes / BYTES_PER_KB}`;
  return [header, ...lines, `${'total'.padEnd(width)}  ${''.padStart(11)}  ${kb(totalBytes).padStart(8)} kB gzip, ${verdict}`].join('\n');
}

function optionOf(args, name) {
  return args.find((arg) => arg.startsWith(`${name}=`))?.slice(name.length + 1);
}

function main(args) {
  const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const distDir = resolve(optionOf(args, '--dist') ?? join(repoRoot, 'dist'));
  const rawLimit = optionOf(args, '--limit');
  const limitKb = rawLimit === undefined ? BUDGET_KB : Number(rawLimit);
  if (!Number.isFinite(limitKb) || limitKb <= 0) {
    process.stderr.write(`--limit needs a positive number of kB, got "${rawLimit}"\n`);
    return EXIT_BAD_USAGE;
  }
  const result = measureBudget(distDir, { limitKb });
  process.stdout.write(`${formatReport(result)}\n`);
  if (result.totalBytes > result.limitBytes && args.includes('--enforce')) {
    process.stderr.write(`the critical path is over the budget of ${limitKb} kB gzip\n`);
    return EXIT_OVER_BUDGET;
  }
  return 0;
}

const isEntryPoint = process.argv[1] !== undefined && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
if (isEntryPoint) {
  try {
    process.exitCode = main(process.argv.slice(2));
  } catch (error) {
    process.stderr.write(`check-bundle-budget: ${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = EXIT_BAD_USAGE;
  }
}
