import { readdirSync, readFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { tokensCss } from '../test/styles';
import { EASE_OUT } from './motion';

const SRC_DIR = resolve(__dirname, '..');
const MOTION_FILE = resolve(__dirname, 'motion.ts');
const EASE_TOKEN = /--ease-out:\s*cubic-bezier\(([^)]+)\)/;
const LITERAL_CURVES = [/\[\s*0?\.22\s*,\s*1\s*,\s*0?\.36\s*,\s*1\s*\]/, /\[\s*0?\.4\s*,\s*0\s*,\s*0?\.2\s*,\s*1\s*\]/];

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.(ts|tsx)$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name) ? [path] : [];
  });
}

describe('EASE_OUT', () => {
  it('has the same four points as the --ease-out token of tokens.css', () => {
    const token = EASE_TOKEN.exec(tokensCss);
    expect(token).not.toBeNull();
    const points = token![1].split(',').map((point) => Number(point.trim()));

    expect([...EASE_OUT]).toEqual(points);
  });

  it('is the only place of the code that writes the curve as numbers', () => {
    const offenders = sourceFiles(SRC_DIR)
      .filter((file) => file !== MOTION_FILE)
      .filter((file) => LITERAL_CURVES.some((curve) => curve.test(readFileSync(file, 'utf8'))))
      .map((file) => relative(SRC_DIR, file));

    expect(offenders).toEqual([]);
  });
});
