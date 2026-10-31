// @vitest-environment node
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/** Lint policy (fix plan G.8, findings I2 and Q-12): lint is ESLint plus the type check, as errors, in CI. */

const ROOT = path.resolve(__dirname, '../..');
const read = (file: string) => readFileSync(path.join(ROOT, file), 'utf8');

describe('lint policy', () => {
  it('runs ESLint and the type check in `npm run lint`', () => {
    const scripts = (JSON.parse(read('package.json')) as { scripts: Record<string, string> }).scripts;

    expect(scripts.lint).toBe('eslint . && tsc --noEmit');
  });

  it('runs `npm run lint` in CI', () => {
    expect(read('.github/workflows/ci.yml')).toMatch(/run: npm run lint\b/);
  });

  it('turns no ESLint rule into a warning', () => {
    const config = read('eslint.config.js');

    expect(config).not.toMatch(/warnOnly|toWarning/);
    expect(config).not.toMatch(/['"]warn['"]/);
    expect(config).toMatch(/react-hooks\/exhaustive-deps['"]: ['"]error['"]/);
    expect(config).toMatch(/react-hooks\/rules-of-hooks['"]: ['"]error['"]/);
    expect(config).toMatch(/jsxA11y\.flatConfigs\.recommended/);
  });

  it('has an .editorconfig and a .prettierrc that match the code style', () => {
    expect(read('.editorconfig')).toMatch(/end_of_line = lf/);
    expect(read('.editorconfig')).toMatch(/indent_size = 2/);
    expect(read('.editorconfig')).toMatch(/insert_final_newline = true/);
    expect(existsSync(path.join(ROOT, '.prettierrc'))).toBe(true);
    const prettier = JSON.parse(read('.prettierrc')) as Record<string, unknown>;
    expect(prettier).toMatchObject({ singleQuote: true, semi: true, printWidth: 120 });
  });
});
