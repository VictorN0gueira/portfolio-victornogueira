// @vitest-environment node
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
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

function seedOutput(slug: string, files: string[], entries: object[]): void {
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
