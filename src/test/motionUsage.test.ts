import { readdirSync, readFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * MotionProvider mounts `LazyMotion` with the domAnimation features in strict mode. Two rules follow, and a break of
 * either only shows in a real browser (strict mode throws at render), so the source is scanned here:
 *  1. Components come from `m`, never from the full `motion` component: it carries every feature and throws in strict mode.
 *  2. domAnimation has no layout animation, no drag and no pop layout. A file that needs one wraps its own subtree in a
 *     nested `LazyMotion` with `domMax` and is listed in NEEDS_DOM_MAX below. Nothing needs it today.
 */
const SRC_DIR = resolve(__dirname, '..');
const NEEDS_DOM_MAX: readonly string[] = [];

const FULL_MOTION_TAG = /\bmotion\.[a-z][a-zA-Z0-9]*\b(?!\.css)/;
const FULL_MOTION_CALL = /\bmotion\(|\bmotion\.create\(/;
const FULL_MOTION_IMPORT = /import\s*\{[^}]*\bmotion\b[^}]*\}\s*from\s*'(?:motion\/react|framer-motion)'/;
const DOM_MAX_ONLY = /\blayoutId\b|\blayoutDependency\b|\blayoutScroll\b|<\w+(?:\.\w+)?\s[^>]*\blayout[\s=/>]|\bdrag=|\bdrag\b[^\n]*=\{|\bwhileDrag\b|mode="popLayout"|\bReorder\b/;

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name) ? [path] : [];
  });
}

/** The code of a file without its comments, so a sentence that mentions `motion.div` does not count. */
function codeOf(file: string): string {
  return readFileSync(file, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

function offendersOf(rules: readonly RegExp[], skip: readonly string[] = []): string[] {
  return sourceFiles(SRC_DIR)
    .map((file) => ({ file, name: relative(SRC_DIR, file).replace(/\\/g, '/') }))
    .filter(({ name }) => !skip.includes(name) && !name.startsWith('test/'))
    .filter(({ file }) => rules.some((rule) => rule.test(codeOf(file))))
    .map(({ name }) => name);
}

describe('motion usage under LazyMotion strict', () => {
  it('no source file renders or imports the full `motion` component', () => {
    expect(offendersOf([FULL_MOTION_TAG, FULL_MOTION_CALL, FULL_MOTION_IMPORT])).toEqual([]);
  });

  it('no source file outside the domMax list uses layout animation, drag or popLayout', () => {
    expect(offendersOf([DOM_MAX_ONLY], NEEDS_DOM_MAX)).toEqual([]);
  });

  it('the scan sees a violation when there is one', () => {
    expect(FULL_MOTION_TAG.test('<motion.div className="a" />')).toBe(true);
    expect(FULL_MOTION_TAG.test('<m.div className="a" />')).toBe(false);
    expect(FULL_MOTION_IMPORT.test("import { motion, useInView } from 'motion/react';")).toBe(true);
    expect(FULL_MOTION_IMPORT.test("import { m, useInView } from 'motion/react';")).toBe(false);
    expect(DOM_MAX_ONLY.test('<m.div layoutId="x" />')).toBe(true);
    expect(DOM_MAX_ONLY.test('<m.div layout className="x" />')).toBe(true);
    expect(DOM_MAX_ONLY.test('<m.div className="flex-layout" />')).toBe(false);
  });
});
