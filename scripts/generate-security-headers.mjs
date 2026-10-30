// Writes nginx/security-headers.conf from config/securityHeaders.mjs, the single source of the security headers.
// `node scripts/generate-security-headers.mjs` regenerates it; `--check` exits 1 when the committed file is stale.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderNginxSnippet } from '../config/securityHeaders.mjs';

const target = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'nginx', 'security-headers.conf');
const expected = renderNginxSnippet();

if (process.argv.includes('--check')) {
  const current = existsSync(target) ? readFileSync(target, 'utf8') : '';
  if (current !== expected) {
    process.stderr.write('nginx/security-headers.conf is stale: run `npm run headers`\n');
    process.exit(1);
  }
} else {
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, expected, 'utf8');
  process.stdout.write(`wrote ${target}\n`);
}
