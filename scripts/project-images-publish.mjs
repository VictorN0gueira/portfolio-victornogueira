// Moves the staged images into the output folder and the new manifest into place, as one step that can be undone:
// every file it replaces or removes is first moved into a backup folder, and any failure puts everything back.
// The order is: write the manifest to a temporary file (it may fail), move the images, rename the manifest last.
import { existsSync, mkdirSync, readdirSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const BACKUP_FOLDER = '.backup';

/** Journal of what was done, so that it can be undone in reverse order. */
function newJournal() {
  return { placed: [], saved: [] };
}

function moveInto(journal, file, backupFile) {
  mkdirSync(dirname(backupFile), { recursive: true });
  renameSync(file, backupFile);
  journal.saved.push({ file, backupFile });
}

function undo(journal) {
  for (const target of journal.placed.reverse()) rmSync(target, { force: true });
  for (const { file, backupFile } of journal.saved.reverse()) {
    mkdirSync(dirname(file), { recursive: true });
    renameSync(backupFile, file);
  }
}

/** The files of the output folder that a clean run drops: those of the given projects that the run did not write. */
function staleFiles(outputDir, slug, written) {
  const folder = join(outputDir, slug);
  if (!existsSync(folder)) return [];
  return readdirSync(folder).filter((name) => !written.has(name));
}

function placeStaged(journal, { stagingDir, outputDir, slugs, backupDir }) {
  for (const slug of slugs) {
    const staged = join(stagingDir, slug);
    mkdirSync(join(outputDir, slug), { recursive: true });
    for (const name of readdirSync(staged)) {
      const target = join(outputDir, slug, name);
      if (existsSync(target)) moveInto(journal, target, join(backupDir, slug, name));
      renameSync(join(staged, name), target);
      journal.placed.push(target);
    }
  }
}

function dropStale(journal, { stagingDir, outputDir, slugs, backupDir }) {
  const removed = [];
  for (const slug of slugs) {
    const written = new Set(readdirSync(join(stagingDir, slug)));
    for (const name of staleFiles(outputDir, slug, written)) {
      moveInto(journal, join(outputDir, slug, name), join(backupDir, slug, `${name}.dropped`));
      removed.push(`${slug}/${name}`);
    }
  }
  return removed;
}

/**
 * Publishes a run. `manifestText` is written to a temporary file first; if that or anything after it fails, the
 * output folder and the manifest are exactly as they were. Returns the names of the files a clean run dropped.
 */
export function publishRun({ stagingDir, outputDir, slugs, clean, manifestFile, manifestText }) {
  const backupDir = join(stagingDir, BACKUP_FOLDER);
  const temporaryManifest = `${manifestFile}.${process.pid}.tmp`;
  const journal = newJournal();
  const context = { stagingDir, outputDir, slugs, backupDir };
  try {
    mkdirSync(dirname(manifestFile), { recursive: true });
    writeFileSync(temporaryManifest, manifestText, 'utf8');
    const removed = clean ? dropStale(journal, context) : [];
    placeStaged(journal, context);
    renameSync(temporaryManifest, manifestFile);
    return removed;
  } catch (error) {
    undo(journal);
    throw error;
  } finally {
    rmSync(temporaryManifest, { force: true });
  }
}
