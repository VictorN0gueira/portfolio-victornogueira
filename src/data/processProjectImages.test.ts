// @vitest-environment node
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import sharp from 'sharp';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  PipelineError,
  checkFolders,
  hasImageSignature,
  listOriginals,
  parseArguments,
  run,
  shareNameFor,
  widthsFor,
} from '../../scripts/process-project-images.mjs';
import { UndoFailedError, backupDirOf, publishRun } from '../../scripts/project-images-publish.mjs';
import { UsageScanError, findUsedKeys, findUsedKeysInFile, stringLiterals } from '../../scripts/project-images-usage.mjs';
import { projects } from './projects';
import type { ManifestEntry } from '../../scripts/project-images-manifest.mjs';
import { mergeEntries, parseManifest, readManifestEntries, renderManifest, writeFileAtomic } from '../../scripts/project-images-manifest.mjs';
import { regionsFor } from '../../scripts/project-blur-regions.mjs';
import { regionBounds } from '../../scripts/blur-regions.mjs';

const REPO_ROOT = resolve(__dirname, '../..');
const ENTRY = { key: 'travel-ia/cover', width: 1000, height: 500, widths: [800], hasShare: true };

let workDir = '';

beforeEach(() => {
  workDir = mkdtempSync(join(tmpdir(), 'process-project-images-'));
  vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
});

afterEach(() => {
  vi.restoreAllMocks();
  rmSync(workDir, { recursive: true, force: true });
});

/** A plain synthetic screenshot: two flat halves, enough for sharp to resize and encode. */
async function syntheticPng(width = 1000, height = 500): Promise<Buffer> {
  return sharp({ create: { width, height, channels: 3, background: '#223344' } })
    .composite([{ input: { create: { width: Math.floor(width / 2), height, channels: 3, background: '#ddeeff' } }, left: 0, top: 0 }])
    .png()
    .toBuffer();
}

async function writeOriginal(inputDir: string, slug: string, fileName: string, bytes?: Buffer): Promise<void> {
  mkdirSync(join(inputDir, slug), { recursive: true });
  writeFileSync(join(inputDir, slug, fileName), bytes ?? (await syntheticPng()));
}

function options(overrides: Record<string, unknown> = {}) {
  return {
    inputDir: join(workDir, 'input'),
    outputDir: join(workDir, 'output'),
    manifestFile: join(workDir, 'manifest.ts'),
    previewDir: null,
    clean: false,
    keepNames: false,
    ...overrides,
  };
}

function seedOutput(slug: string, files: string[], entries: ManifestEntry[]): void {
  const folder = join(workDir, 'output', slug);
  mkdirSync(folder, { recursive: true });
  for (const file of files) writeFileSync(join(folder, file), 'old');
  writeFileSync(join(workDir, 'manifest.ts'), renderManifest(entries));
}

describe('the pure parts', () => {
  it('writes the 800 and 1600 widths that fit, or the natural width of a narrow image', () => {
    expect(widthsFor(1920)).toEqual([800, 1600]);
    expect(widthsFor(1000)).toEqual([800]);
    expect(widthsFor(504)).toEqual([504]);
  });

  it('shares the image named in COVER_SOURCES for a project, and the one called cover for the others', () => {
    expect(shareNameFor('hub081')).toBe('dashboards');
    expect(shareNameFor('dizpara')).toBe('lista-de-leads');
    expect(shareNameFor('travel-ia')).toBe('cover');
  });

  it('trusts the signature, never the extension', () => {
    expect(hasImageSignature(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0]))).toBe(true);
    expect(hasImageSignature(Buffer.from([0xff, 0xd8, 0xff, 0xe0]))).toBe(true);
    expect(hasImageSignature(Buffer.from('<svg></svg>'))).toBe(false);
  });

  it('reads the options, and refuses an unknown one or a wrong number of folders', () => {
    const parsed = parseArguments(['in', 'out', '--clean', '--keep-names', '--manifest=m.ts']);

    expect([parsed.clean, parsed.keepNames, parsed.previewDir]).toEqual([true, true, null]);
    expect(parsed.manifestFile.endsWith('m.ts')).toBe(true);
    expect(() => parseArguments(['in', 'out', '--blur-everything'])).toThrow(PipelineError);
    expect(() => parseArguments(['only-one'])).toThrow(/usage/);
  });
});

describe('the manifest', () => {
  it('round trips: what is rendered is what is parsed', () => {
    const entries = [ENTRY, { key: 'dizpara/lista-de-leads', width: 1600, height: 741, widths: [800, 1600], hasShare: true }];

    expect(parseManifest(renderManifest(entries))).toEqual(entries.slice().sort((a, b) => a.key.localeCompare(b.key)));
  });

  it('refuses a manifest whose entry lines no longer have the generated shape', () => {
    const reformatted = renderManifest([ENTRY]).replace("{ width: 1000, height: 500, widths: [800], hasShare: true },", '{ width: 1000, height: 500, widths: [800], hasShare: true }');

    expect(() => parseManifest(reformatted)).toThrow(/refusing to overwrite/);
  });

  it('refuses a file that is not empty but yields no entry, and reads a missing file as empty', () => {
    const file = join(workDir, 'strange.ts');
    writeFileSync(file, 'export const nothing = 1;\n');

    expect(() => readManifestEntries(file)).toThrow(/holds no entry/);
    expect(readManifestEntries(join(workDir, 'missing.ts'))).toEqual([]);
  });

  it('keeps the other projects on a merge, and drops the cleaned project entries that were not rewritten', () => {
    const existing = [ENTRY, { ...ENTRY, key: 'travel-ia/old' }, { ...ENTRY, key: 'dizpara/x' }];
    const fresh = [{ ...ENTRY, width: 2000 }];

    expect(mergeEntries(existing, fresh).map((entry) => entry.key).sort()).toEqual(['dizpara/x', 'travel-ia/cover', 'travel-ia/old']);
    expect(mergeEntries(existing, fresh, new Set(['travel-ia'])).map((entry) => entry.key).sort()).toEqual(['dizpara/x', 'travel-ia/cover']);
    expect(mergeEntries(existing, fresh)[2].width).toBe(2000);
  });

  it('writes through a temporary file and leaves none behind', () => {
    const file = join(workDir, 'atomic.ts');
    writeFileAtomic(file, 'one');
    writeFileAtomic(file, 'two');

    expect(readFileSync(file, 'utf8')).toBe('two');
    expect(readdirSync(workDir).filter((name) => name.endsWith('.tmp'))).toEqual([]);
  });
});

describe('the input folder', () => {
  it('skips the junk files of Windows and macOS and any dot file, in the root and in a project', async () => {
    const input = join(workDir, 'input');
    await writeOriginal(input, 'travel-ia', 'cover.png');
    writeFileSync(join(input, 'Thumbs.db'), 'x');
    writeFileSync(join(input, '.DS_Store'), 'x');
    writeFileSync(join(input, 'travel-ia', 'desktop.ini'), 'x');
    writeFileSync(join(input, 'travel-ia', '.hidden'), 'x');

    expect(listOriginals(input).map((original) => `${original.slug}/${original.name}`)).toEqual(['travel-ia/cover']);
  });

  it('takes .PNG, .jpg and .jpeg in any case, and refuses any other extension', async () => {
    const input = join(workDir, 'input');
    await writeOriginal(input, 'travel-ia', 'cover.PNG');
    await writeOriginal(input, 'travel-ia', 'tela-email.jpeg');
    await writeOriginal(input, 'travel-ia', 'tela-mobile.JpG');

    expect(listOriginals(input).map((original) => original.name)).toEqual(['cover', 'tela-email', 'tela-mobile']);

    writeFileSync(join(input, 'travel-ia', 'notes.txt'), 'x');
    expect(() => listOriginals(input)).toThrow(/only PNG and JPEG/);
  });

  it('refuses names that are not lower case kebab-case ASCII', async () => {
    const input = join(workDir, 'input');
    await writeOriginal(input, 'travel-ia', 'Tela Email.png');

    expect(() => listOriginals(input)).toThrow(/kebab-case/);
  });

  it('refuses an input and an output folder that are the same, or one inside the other', () => {
    expect(() => checkFolders(join(workDir, 'a'), join(workDir, 'a'))).toThrow(/overlap/);
    expect(() => checkFolders(join(workDir, 'a'), join(workDir, 'a', 'out'))).toThrow(/overlap/);
    expect(() => checkFolders(join(workDir, 'a', 'in'), join(workDir, 'a'))).toThrow(/overlap/);
    expect(() => checkFolders(join(workDir, 'in'), join(workDir, 'out'))).not.toThrow();
  });

  it('refuses originals kept inside the published folders of the repo', () => {
    expect(() => checkFolders(join(REPO_ROOT, 'public', 'originals'), join(workDir, 'out'))).toThrow(/outside the repo/);
    expect(() => checkFolders(join(REPO_ROOT, 'src', 'originals'), join(workDir, 'out'))).toThrow(/outside the repo/);
  });
});

describe('running the pipeline', () => {
  it('writes the WebP files, the share JPEG of the cover and a manifest, from a clean start', async () => {
    await writeOriginal(options().inputDir, 'travel-ia', 'cover.png');

    const { entries } = await run(options());

    expect(entries).toMatchObject([{ key: 'travel-ia/cover', width: 800, height: 400, widths: [800], hasShare: true }]);
    expect(existsSync(join(workDir, 'output', 'travel-ia', 'cover-800.webp'))).toBe(true);
    expect(existsSync(join(workDir, 'output', 'travel-ia', 'cover-share.jpg'))).toBe(true);
    expect(readdirSync(join(workDir, 'output'))).toEqual(['travel-ia']);
  });

  it('merges without --clean: another project and another image of the same project keep their files and entries', async () => {
    seedOutput('dizpara', ['lista-de-leads-800.webp'], [{ key: 'dizpara/lista-de-leads', width: 1600, height: 741, widths: [800], hasShare: true }]);
    seedOutput('travel-ia', ['tela-email-800.webp'], [ENTRY, { ...ENTRY, key: 'travel-ia/tela-email', hasShare: false }]);
    await writeOriginal(options().inputDir, 'travel-ia', 'cover.png');

    const { entries } = await run(options());

    expect(entries.map((entry: { key: string }) => entry.key).sort()).toEqual(['travel-ia/cover', 'travel-ia/tela-email']);
    expect(existsSync(join(workDir, 'output', 'travel-ia', 'tela-email-800.webp'))).toBe(true);
    expect(parseManifest(readFileSync(join(workDir, 'manifest.ts'), 'utf8'))).toHaveLength(2);
  });

  it('with --clean, rebuilds only the projects present in the input and removes their stale files after success', async () => {
    seedOutput('travel-ia', ['stale-800.webp', 'cover-800.webp'], [{ ...ENTRY, key: 'travel-ia/stale' }, ENTRY]);
    mkdirSync(join(workDir, 'output', 'dizpara'), { recursive: true });
    writeFileSync(join(workDir, 'output', 'dizpara', 'kept-800.webp'), 'untouched');
    writeFileSync(join(workDir, 'manifest.ts'), renderManifest([{ ...ENTRY, key: 'travel-ia/stale' }, ENTRY, { ...ENTRY, key: 'dizpara/kept', hasShare: false }]));
    await writeOriginal(options().inputDir, 'travel-ia', 'cover.png');

    const result = await run(options({ clean: true }));

    expect(result.removed).toEqual(['travel-ia/stale-800.webp']);
    expect(existsSync(join(workDir, 'output', 'travel-ia', 'stale-800.webp'))).toBe(false);
    expect(readFileSync(join(workDir, 'output', 'dizpara', 'kept-800.webp'), 'utf8')).toBe('untouched');
    expect(result.entries.map((entry: { key: string }) => entry.key).sort()).toEqual(['dizpara/kept', 'travel-ia/cover']);
  });

  it('with --clean, deletes nothing when an original fails: files, folders and manifest stay as they were', async () => {
    seedOutput('travel-ia', ['stale-800.webp', 'cover-800.webp'], [ENTRY]);
    const before = readFileSync(join(workDir, 'manifest.ts'), 'utf8');
    await writeOriginal(options().inputDir, 'travel-ia', 'cover.png');
    await writeOriginal(options().inputDir, 'travel-ia', 'tela-email.png', Buffer.from('this is not an image at all'));

    await expect(run(options({ clean: true }))).rejects.toThrow(/signature/);

    expect(readdirSync(join(workDir, 'output', 'travel-ia')).sort()).toEqual(['cover-800.webp', 'stale-800.webp']);
    expect(readFileSync(join(workDir, 'manifest.ts'), 'utf8')).toBe(before);
    expect(existsSync(join(workDir, 'output', '.staging'))).toBe(false);
  });

  it('refuses to overwrite a manifest it cannot read, and leaves the output untouched', async () => {
    writeFileSync(join(workDir, 'manifest.ts'), "export const projectImageManifest = {\n  'a/b': { width: 1, height: 1 },\n};\n");
    await writeOriginal(options().inputDir, 'travel-ia', 'cover.png');

    await expect(run(options())).rejects.toThrow(/refusing to overwrite/);
    expect(existsSync(join(workDir, 'output'))).toBe(false);
  });

  it('refuses overlapping folders even with --clean, before any file is touched', async () => {
    const shared = join(workDir, 'shared');
    await writeOriginal(shared, 'travel-ia', 'cover.png');

    await expect(run(options({ inputDir: shared, outputDir: shared, clean: true }))).rejects.toThrow(/overlap/);
    expect(existsSync(join(shared, 'travel-ia', 'cover.png'))).toBe(true);
  });

  it('stops on a screenshot that is not listed for blur, so nothing private is published by mistake', async () => {
    await writeOriginal(options().inputDir, 'hub081', 'conversa-nova.png');

    await expect(run(options())).rejects.toThrow(/not listed in scripts\/project-blur-regions\.mjs/);
    expect(readdirSync(join(workDir, 'output')).filter((name) => name !== '.staging')).toEqual([]);
  });

  it('stops on a listed screenshot of another size, because its coordinates would blur the wrong pixels', async () => {
    await writeOriginal(options().inputDir, 'hub081', 'conversas.png', await syntheticPng(1280, 720));

    await expect(run(options())).rejects.toThrow(/measured on 1919x911/);
  });

  it('crops the originals that have a crop and does not write them as themselves', async () => {
    await writeOriginal(options().inputDir, 'hub081', 'login.png', await syntheticPng(1918, 911));

    const { entries } = await run(options());

    expect(entries).toMatchObject([{ key: 'hub081/login', width: 800, height: 476, widths: [800], hasShare: false }]);
  });

  it.each(['conversas.PNG', 'conversas.png', 'conversas.jpeg'])('blurs the contact photos of hub081/%s: no extension or case lets it through', async (fileName) => {
    const noise = Buffer.alloc(1919 * 911 * 3);
    for (let index = 0; index < noise.length; index += 1) noise[index] = (index * 2654435761) % 251 > 125 ? 240 : 15;
    const raw = sharp(noise, { raw: { width: 1919, height: 911, channels: 3 } });
    const bytes = fileName.endsWith('jpeg') ? await raw.jpeg({ quality: 95 }).toBuffer() : await raw.png().toBuffer();
    await writeOriginal(options().inputDir, 'hub081', fileName, bytes);

    await run(options());
    const output = await sharp(readFileSync(join(workDir, 'output', 'hub081', 'conversas-1600.webp'))).greyscale().raw().toBuffer({ resolveWithObject: true });
    const photo = regionsFor('hub081/conversas').find((region: { shape: string }) => region.shape === 'circle');
    if (!photo) throw new Error('hub081/conversas lost its circular contact photo region');
    const bounds = regionBounds(photo);
    const scale = 1600 / 1919;
    const middle = Math.round((bounds.top + bounds.height / 2) * scale) * output.info.width + Math.round((bounds.left + bounds.width / 2) * scale);
    let jump = 0;
    for (let offset = 0; offset < 12; offset += 1) jump += Math.abs(output.data[middle + offset] - output.data[middle + offset + 1]);

    expect(jump).toBeLessThan(40);
  }, 60_000);

  it('writes only previews, and no image or manifest, with --preview', async () => {
    await writeOriginal(options().inputDir, 'travel-ia', 'cover.png');
    const previewDir = join(workDir, 'preview');

    await run(options({ previewDir }));

    expect(readdirSync(previewDir)).toEqual(['travel-ia-cover-regions.png']);
    expect(existsSync(join(workDir, 'output'))).toBe(false);
    expect(existsSync(join(workDir, 'manifest.ts'))).toBe(false);
  });
});

describe('publishing a run', () => {
  function stage(slug: string, files: Record<string, string>): string {
    const stagingDir = join(workDir, 'output', '.staging');
    mkdirSync(join(stagingDir, slug), { recursive: true });
    for (const [name, content] of Object.entries(files)) writeFileSync(join(stagingDir, slug, name), content);
    return stagingDir;
  }

  it('puts every file back, and leaves the manifest as it was, when the last step fails', () => {
    mkdirSync(join(workDir, 'output', 'travel-ia'), { recursive: true });
    writeFileSync(join(workDir, 'output', 'travel-ia', 'cover-800.webp'), 'old cover');
    writeFileSync(join(workDir, 'output', 'travel-ia', 'stale-800.webp'), 'old stale');
    const stagingDir = stage('travel-ia', { 'cover-800.webp': 'new cover', 'extra-800.webp': 'new extra' });
    // A non empty folder where the manifest should go makes the final rename fail.
    const manifestFile = join(workDir, 'manifest-folder');
    mkdirSync(manifestFile);
    writeFileSync(join(manifestFile, 'inside.txt'), 'x');

    expect(() =>
      publishRun({ stagingDir, outputDir: join(workDir, 'output'), slugs: new Set(['travel-ia']), clean: true, manifestFile, manifestText: 'new manifest' }),
    ).toThrow();

    expect(readFileSync(join(workDir, 'output', 'travel-ia', 'cover-800.webp'), 'utf8')).toBe('old cover');
    expect(readFileSync(join(workDir, 'output', 'travel-ia', 'stale-800.webp'), 'utf8')).toBe('old stale');
    expect(existsSync(join(workDir, 'output', 'travel-ia', 'extra-800.webp'))).toBe(false);
    expect(readdirSync(workDir).filter((name) => name.endsWith('.tmp'))).toEqual([]);
  });

  /** A rename that records every call, and throws for the ones the test picks. */
  function spyOps(failWhen: (from: string, to: string) => boolean = () => false) {
    const calls: Array<[string, string]> = [];
    const ops = {
      rename: (from: string, to: string) => {
        calls.push([from, to]);
        if (failWhen(from, to)) throw new Error('injected rename failure');
        renameSync(from, to);
      },
      remove: (path: string) => rmSync(path, { recursive: true, force: true }),
    };
    return { ops, calls };
  }

  function seedTravel(): { stagingDir: string; manifestFile: string } {
    mkdirSync(join(workDir, 'output', 'travel-ia'), { recursive: true });
    writeFileSync(join(workDir, 'output', 'travel-ia', 'cover-800.webp'), 'old cover');
    writeFileSync(join(workDir, 'output', 'travel-ia', 'stale-800.webp'), 'old stale');
    const manifestFile = join(workDir, 'manifest.ts');
    writeFileSync(manifestFile, 'old manifest');
    return { stagingDir: stage('travel-ia', { 'cover-800.webp': 'new cover', 'extra-800.webp': 'new extra' }), manifestFile };
  }

  function publish(stagingDir: string, manifestFile: string, ops: ReturnType<typeof spyOps>['ops']) {
    return publishRun({ stagingDir, outputDir: join(workDir, 'output'), slugs: new Set(['travel-ia']), clean: true, manifestFile, manifestText: 'new manifest', ops });
  }

  it('renames the manifest only after every image is in place', () => {
    const { stagingDir, manifestFile } = seedTravel();
    const { ops, calls } = spyOps();

    publish(stagingDir, manifestFile, ops);

    const manifestStep = calls.findIndex(([, to]) => to === manifestFile);
    const lastImageStep = calls.reduce((last, [, to], index) => (to.includes(join('output', 'travel-ia')) ? index : last), -1);
    expect(manifestStep).toBe(calls.length - 1);
    expect(lastImageStep).toBeGreaterThanOrEqual(0);
    expect(manifestStep).toBeGreaterThan(lastImageStep);
    expect(readFileSync(manifestFile, 'utf8')).toBe('new manifest');
    expect(readFileSync(join(workDir, 'output', 'travel-ia', 'cover-800.webp'), 'utf8')).toBe('new cover');
    expect(existsSync(backupDirOf(join(workDir, 'output')))).toBe(false);
  });

  it('restores every image byte for byte and keeps the old manifest when the final manifest rename fails', () => {
    const { stagingDir, manifestFile } = seedTravel();
    const { ops } = spyOps((_from, to) => to === manifestFile);

    expect(() => publish(stagingDir, manifestFile, ops)).toThrow(/injected rename failure/);

    expect(readFileSync(join(workDir, 'output', 'travel-ia', 'cover-800.webp'), 'utf8')).toBe('old cover');
    expect(readFileSync(join(workDir, 'output', 'travel-ia', 'stale-800.webp'), 'utf8')).toBe('old stale');
    expect(existsSync(join(workDir, 'output', 'travel-ia', 'extra-800.webp'))).toBe(false);
    expect(readFileSync(manifestFile, 'utf8')).toBe('old manifest');
    expect(readdirSync(workDir).filter((name) => name.endsWith('.tmp'))).toEqual([]);
    expect(existsSync(backupDirOf(join(workDir, 'output')))).toBe(false);
  });

  it('keeps the backup, names it and says how to recover, when the undo itself fails', () => {
    const { stagingDir, manifestFile } = seedTravel();
    // The manifest rename fails, and so does every move back out of the backup.
    const { ops } = spyOps((from, to) => to === manifestFile || from.includes('.backup'));

    let error: unknown;
    try {
      publish(stagingDir, manifestFile, ops);
    } catch (caught) {
      error = caught;
    }

    expect(error).toBeInstanceOf(UndoFailedError);
    expect((error as Error).message).toContain(backupDirOf(join(workDir, 'output')));
    expect((error as Error).message).toMatch(/by hand/);
    const backup = backupDirOf(join(workDir, 'output'));
    expect(readFileSync(join(backup, 'travel-ia', 'cover-800.webp'), 'utf8')).toBe('old cover');
    expect(readFileSync(join(backup, 'travel-ia', 'stale-800.webp.dropped'), 'utf8')).toBe('old stale');
    expect(readdirSync(workDir).filter((name) => name.endsWith('.tmp'))).toEqual([]);
  });

  it('refuses to start a run while a backup of an earlier failed run exists, and touches nothing', async () => {
    const backup = backupDirOf(join(workDir, 'output'));
    mkdirSync(join(backup, 'travel-ia'), { recursive: true });
    writeFileSync(join(backup, 'travel-ia', 'cover-800.webp'), 'the only copy');
    await writeOriginal(options().inputDir, 'travel-ia', 'cover.png');

    await expect(run(options())).rejects.toThrow(/earlier run failed/);

    expect(readFileSync(join(backup, 'travel-ia', 'cover-800.webp'), 'utf8')).toBe('the only copy');
    expect(existsSync(join(workDir, 'manifest.ts'))).toBe(false);
  });

  it('removes a leftover .staging of an interrupted run at the start of the next run', async () => {
    mkdirSync(join(workDir, 'output', '.staging', 'hub081'), { recursive: true });
    writeFileSync(join(workDir, 'output', '.staging', 'hub081', 'conversas-800.webp'), 'unblurred leftover');
    await writeOriginal(options().inputDir, 'travel-ia', 'cover.png');

    await run(options());

    expect(existsSync(join(workDir, 'output', '.staging'))).toBe(false);
    expect(existsSync(join(workDir, 'output', 'hub081'))).toBe(false);
  });

  it('refuses --clean when it would drop an image that projects.ts still shows, unless --force-clean is given', async () => {
    const projectsFile = join(workDir, 'projects.ts');
    writeFileSync(projectsFile, "shot('travel-ia/stale', 'x')");
    seedOutput('travel-ia', ['stale-800.webp', 'cover-800.webp'], [{ ...ENTRY, key: 'travel-ia/stale' }, ENTRY]);
    await writeOriginal(options().inputDir, 'travel-ia', 'cover.png');

    await expect(run(options({ clean: true, projectsFile }))).rejects.toThrow(/still uses/);
    expect(existsSync(join(workDir, 'output', 'travel-ia', 'stale-800.webp'))).toBe(true);

    const result = await run(options({ clean: true, forceClean: true, projectsFile }));
    expect(result.removed).toEqual(['travel-ia/stale-800.webp']);
  });
});

describe('the usage scan that guards --clean', () => {
  const KEYS = ['travel-ia/cover', 'dizpara/lista-de-leads'];

  it.each([
    ['single quotes', "shot('travel-ia/cover', 'x')"],
    ['double quotes', 'shot("travel-ia/cover", "x")'],
    ['backticks without a placeholder', 'shot(`travel-ia/cover`, `x`)'],
    ['a comment', "// was 'travel-ia/cover'"],
  ])('sees a key written with %s as used', (_label, source) => {
    expect(findUsedKeys(source, KEYS)).toEqual(['travel-ia/cover']);
  });

  it('does not see a key that only looks alike', () => {
    expect(findUsedKeys("shot('travel-ia/cover-2', 'x')", KEYS)).toEqual([]);
  });

  it.each([
    ['a template with a placeholder', 'shot(`travel-ia/${name}`, `x`)'],
    ['literals joined with +', "shot('travel-ia/' + 'cover', 'x')"],
  ])('refuses a source that builds a key at run time: %s', (_label, source) => {
    expect(() => findUsedKeys(source, KEYS)).toThrow(UsageScanError);
  });

  it('refuses a file that does not exist', () => {
    expect(() => findUsedKeysInFile(join(workDir, 'missing.ts'), KEYS)).toThrow(/does not exist/);
  });

  it('reads literals of any quote style, with escapes', () => {
    expect([...stringLiterals(`const a = 'it\\'s'; const b = "x"; const c = \`y\`;`)].sort()).toEqual(["it\\'s", 'x', 'y']);
  });

  it('canary: sees every image the real src/data/projects.ts shows as used', () => {
    const keysShown = projects.flatMap((project) => project.shots.map((shot) => /^\/projects\/(.+)-\d+\.webp$/.exec(shot.image.src)?.[1] as string));
    const real = resolve(REPO_ROOT, 'src', 'data', 'projects.ts');

    expect(keysShown).toHaveLength(21);
    expect(findUsedKeysInFile(real, keysShown).sort()).toEqual([...keysShown].sort());
  });

  it('refuses --clean, with exit code semantics of a PipelineError, when the projects file cannot be scanned', async () => {
    const projectsFile = join(workDir, 'projects.ts');
    writeFileSync(projectsFile, 'shot(`travel-ia/${name}`, `x`)');
    seedOutput('travel-ia', ['stale-800.webp', 'cover-800.webp'], [{ ...ENTRY, key: 'travel-ia/stale' }, ENTRY]);
    await writeOriginal(options().inputDir, 'travel-ia', 'cover.png');

    await expect(run(options({ clean: true, projectsFile }))).rejects.toThrow(/cannot tell which images/);
    expect(existsSync(join(workDir, 'output', 'travel-ia', 'stale-800.webp'))).toBe(true);
  });
});
