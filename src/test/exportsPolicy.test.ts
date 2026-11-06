// @vitest-environment node
import { readFileSync } from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { beforeAll, describe, expect, it } from 'vitest';

/**
 * Export policy of the code base (fix plan G.6, findings Q-30 and Q-34):
 * - a default export exists only where a module is loaded with React.lazy or import();
 * - nothing re-exports a symbol from the path it used to live at;
 * - every export has an importer (a test counts), so nothing is exported by habit.
 * The checks read the real TypeScript program, so a renamed or moved symbol is caught as well.
 */

const ROOT = path.resolve(__dirname, '../..');

/**
 * Lead channel and legal page files are byte identical to the audited copy, so they cannot lose their default export.
 * Their other importers use the named export; PrivacyPage and LgpdPage still import SEO as a default.
 */
const DEFAULT_KEPT_ON_PURPOSE = new Set([
  'src/components/contact/ContactConsent.tsx',
  'src/components/contact/ContactErrorAlert.tsx',
  'src/components/SEO.tsx',
]);

/**
 * The legal pages are frozen and have a default export only. They are no longer loaded with import(): the routes of
 * src/pages/legal are, and each one imports its page statically, inside the frame.
 */
const FROZEN_PAGES_WITH_DEFAULT_ONLY = new Set(['src/pages/PrivacyPage.tsx', 'src/pages/LgpdPage.tsx']);
const isDefaultAllowed = (file: string, isLazy: boolean): boolean =>
  isLazy || DEFAULT_KEPT_ON_PURPOSE.has(file) || FROZEN_PAGES_WITH_DEFAULT_ONLY.has(file);

/** Exports nobody imports, in lead channel files that stay byte identical (the type is the public shape of the payload). */
const UNUSED_EXPORT_KEPT_ON_PURPOSE = new Set(['src/lib/contact.ts:ContactPayload', 'src/components/contact/pastedNumber.ts:PastedNumber']);

interface ModuleFacts {
  readonly file: string;
  readonly exports: readonly string[];
  readonly isLazy: boolean;
  readonly imported: ReadonlySet<string>;
  readonly onlyReExports: boolean;
  readonly reExportsFromSrc: boolean;
}

function readProgram(): ts.Program {
  const config = ts.getParsedCommandLineOfConfigFile(path.join(ROOT, 'tsconfig.json'), {}, {
    ...ts.sys,
    onUnRecoverableConfigFileDiagnostic: () => undefined,
  });
  if (!config) throw new Error('tsconfig.json could not be read');
  return ts.createProgram(config.fileNames, config.options);
}

function resolveModule(program: ts.Program, specifier: string, from: string): string | null {
  const resolved = ts.resolveModuleName(specifier, from, program.getCompilerOptions(), ts.sys).resolvedModule;
  return resolved && !resolved.isExternalLibraryImport ? resolved.resolvedFileName : null;
}

type UsageMap = Map<string, Set<string>>;

function markUsed(usage: UsageMap, file: string, name: string): void {
  const names = usage.get(file) ?? new Set<string>();
  names.add(name);
  usage.set(file, names);
}

function collectUsage(program: ts.Program): UsageMap {
  const usage: UsageMap = new Map();
  const visit = (sourceFile: ts.SourceFile) => (node: ts.Node): void => {
    const target = (literal: ts.Node | undefined): string | null =>
      literal && ts.isStringLiteralLike(literal) ? resolveModule(program, literal.text, sourceFile.fileName) : null;
    if (ts.isImportDeclaration(node)) {
      const file = target(node.moduleSpecifier);
      const clause = node.importClause;
      if (file && clause?.name) markUsed(usage, file, 'default');
      const bindings = clause?.namedBindings;
      if (file && bindings && ts.isNamespaceImport(bindings)) markUsed(usage, file, '*');
      if (file && bindings && ts.isNamedImports(bindings)) {
        bindings.elements.forEach((element) => markUsed(usage, file, (element.propertyName ?? element.name).text));
      }
    } else if (ts.isExportDeclaration(node) && node.moduleSpecifier) {
      const file = target(node.moduleSpecifier);
      if (file && node.exportClause && ts.isNamedExports(node.exportClause)) {
        node.exportClause.elements.forEach((element) => markUsed(usage, file, (element.propertyName ?? element.name).text));
      } else if (file) {
        markUsed(usage, file, '*');
      }
    } else if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
      const file = target(node.arguments[0]);
      if (file) markUsed(usage, file, '*dynamic');
    } else if (ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument)) {
      const file = target(node.argument.literal);
      if (file) markUsed(usage, file, '*');
    }
    ts.forEachChild(node, visit(sourceFile));
  };
  program.getSourceFiles().forEach((sourceFile) => {
    if (!sourceFile.fileName.includes('node_modules')) visit(sourceFile)(sourceFile);
  });
  return usage;
}

function isSourceModule(file: string): boolean {
  return file.startsWith('src/') && !file.endsWith('.d.ts') && !/\.test\.tsx?$/.test(file) && !file.startsWith('src/test/');
}

function describeModules(): ModuleFacts[] {
  const program = readProgram();
  const checker = program.getTypeChecker();
  const usage = collectUsage(program);
  const facts: ModuleFacts[] = [];
  for (const sourceFile of program.getSourceFiles()) {
    const file = path.relative(ROOT, sourceFile.fileName).replace(/\\/g, '/');
    const symbol = checker.getSymbolAtLocation(sourceFile);
    if (!isSourceModule(file) || !symbol) continue;
    const body = sourceFile.statements.filter((statement) => !ts.isImportDeclaration(statement));
    const reExports = body.filter((s): s is ts.ExportDeclaration => ts.isExportDeclaration(s) && Boolean(s.moduleSpecifier));
    const used = usage.get(sourceFile.fileName) ?? new Set<string>();
    const names = checker.getExportsOfModule(symbol).map((exported) => exported.name);
    facts.push({
      file,
      exports: names.filter((name) => !used.has('*') && !used.has(name) && !(name === 'default' && used.has('*dynamic'))),
      isLazy: used.has('*dynamic'),
      imported: used,
      onlyReExports: body.length > 0 && reExports.length === body.length,
      reExportsFromSrc: reExports.some((statement) => {
        const specifier = (statement.moduleSpecifier as ts.StringLiteral).text;
        return specifier.startsWith('.');
      }),
    });
  }
  return facts;
}

describe('export policy', () => {
  let modules: ModuleFacts[] = [];
  beforeAll(() => {
    modules = describeModules();
  }, 120_000);

  it('has no module that only re-exports another one (the old paths are gone)', () => {
    expect(modules.filter((facts) => facts.onlyReExports).map((facts) => facts.file)).toEqual([]);
  });

  it('has no module that re-exports a symbol from another file of the project', () => {
    expect(modules.filter((facts) => facts.reExportsFromSrc).map((facts) => facts.file)).toEqual([]);
  });

  it('exports a name that nobody imports from no module (tests count as importers)', () => {
    const unused = modules
      .flatMap((facts) =>
        facts.exports.filter((name) => !(name === 'default' && isDefaultAllowed(facts.file, facts.isLazy))).map((name) => `${facts.file}:${name}`),
      )
      .filter((entry) => !UNUSED_EXPORT_KEPT_ON_PURPOSE.has(entry));

    expect(unused).toEqual([]);
  });

  it('uses a default export only in modules loaded with React.lazy or import(), plus the files kept byte identical', () => {
    const offenders = modules
      .filter((facts) => !isDefaultAllowed(facts.file, facts.isLazy))
      .filter((facts) => /^export default\b/m.test(readFileSync(path.join(ROOT, facts.file), 'utf8')))
      .map((facts) => facts.file);

    expect(offenders).toEqual([]);
  });

  it('keeps the kept-on-purpose list honest: each file still has its default export and a named one', () => {
    for (const file of DEFAULT_KEPT_ON_PURPOSE) {
      const source = readFileSync(path.join(ROOT, file), 'utf8');
      expect(source, file).toMatch(/^export default\b/m);
      expect(source, file).toMatch(/^export (function|const|class) \w+/m);
    }
    for (const file of FROZEN_PAGES_WITH_DEFAULT_ONLY) {
      expect(readFileSync(path.join(ROOT, file), 'utf8'), file).toMatch(/^export default\b/m);
    }
  });
});

describe('tsconfig', () => {
  const options = (JSON.parse(readFileSync(path.join(ROOT, 'tsconfig.json'), 'utf8')) as { compilerOptions: Record<string, unknown> }).compilerOptions;

  it('checks unused locals and parameters', () => {
    expect(options.noUnusedLocals).toBe(true);
    expect(options.noUnusedParameters).toBe(true);
  });

  it('does not import modules with a .ts or .tsx extension', () => {
    expect(options.allowImportingTsExtensions).toBeUndefined();
  });
});
