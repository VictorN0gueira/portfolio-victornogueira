// Moves the staged images into the output folder and the new manifest into place, as one step that can be undone:
// every file it replaces or removes is first moved into a backup folder, and any failure puts everything back.
// The order is: write the manifest to a temporary file (it may fail), move the images, rename the manifest last.
//
// The backup lives in <output>/.backup, beside the staging folder and not inside it. It is deleted only when the
// run worked or when the undo worked. If the undo itself fails, it is the only copy of the old files: it is kept,
// its path is reported, and the next run refuses to start until somebody has looked at it.
import { existsSync, mkdirSync, readdirSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

export const BACKUP_FOLDER = '.backup';

const DEFAULT_OPS = Object.freeze({ rename: renameSync, remove: (path) => rmSync(path, { recursive: true, force: true }) });

export class UndoFailedError extends Error {
  constructor(backupDir, causes) {
    super(
      `the publish step failed and could not be undone: the old files are in ${backupDir} (do not delete it). ` +
        `Move them back into their project folders by hand (the path inside the backup is <project>/<file>, dropped files end in .dropped), then delete the backup. ` +
        `Causes: ${causes.join('; ')}`,
    );
    this.backupDir = backupDir;
  }
}

/** The error message of a run that must not start because an earlier failed run left its backup. */
export function backupLeftoverMessage(backupDir) {
  return `${backupDir} exists: an earlier run failed and could not undo itself, and it holds the old files. Restore them by hand and delete that folder before running again`;
}

/** The backup folder of an output folder. */
export function backupDirOf(outputDir) {
  return join(outputDir, BACKUP_FOLDER);
}

function moveInto(journal, ops, file, backupFile) {
  mkdirSync(dirname(backupFile), { recursive: true });
  ops.rename(file, backupFile);
  journal.saved.push({ file, backupFile });
}

/** Puts everything back, step after step; a step that fails does not stop the others. Returns the messages of the failures. */
function undo(journal, ops) {
  const failures = [];
  const attempt = (step) => {
    try {
      step();
    } catch (error) {
      failures.push(error instanceof Error ? error.message : String(error));
    }
  };
  for (const target of journal.placed.reverse()) attempt(() => ops.remove(target));
  for (const { file, backupFile } of journal.saved.reverse()) {
    attempt(() => {
      mkdirSync(dirname(file), { recursive: true });
      ops.rename(backupFile, file);
    });
  }
  return failures;
}

function placeStaged(journal, ops, { stagingDir, outputDir, slugs, backupDir }) {
  for (const slug of slugs) {
    const staged = join(stagingDir, slug);
    mkdirSync(join(outputDir, slug), { recursive: true });
    for (const name of readdirSync(staged)) {
      const target = join(outputDir, slug, name);
      if (existsSync(target)) moveInto(journal, ops, target, join(backupDir, slug, name));
      ops.rename(join(staged, name), target);
      journal.placed.push(target);
    }
  }
}

/** Moves the files of the given projects that the run did not write into the backup (a clean run). */
function dropStale(journal, ops, { stagingDir, outputDir, slugs, backupDir }) {
  const removed = [];
  for (const slug of slugs) {
    const folder = join(outputDir, slug);
    if (!existsSync(folder)) continue;
    const written = new Set(readdirSync(join(stagingDir, slug)));
    for (const name of readdirSync(folder).filter((file) => !written.has(file))) {
      moveInto(journal, ops, join(folder, name), join(backupDir, slug, `${name}.dropped`));
      removed.push(`${slug}/${name}`);
    }
  }
  return removed;
}

/**
 * Publishes a run. `manifestText` is written to a temporary file first; if that or anything after it fails, the
 * output folder and the manifest are exactly as they were. Returns the names of the files a clean run dropped.
 * `ops` can replace rename and remove, so a test can make one step fail and record the order of the steps.
 */
export function publishRun({ stagingDir, outputDir, slugs, clean, manifestFile, manifestText, ops = DEFAULT_OPS }) {
  const backupDir = backupDirOf(outputDir);
  const temporaryManifest = `${manifestFile}.${process.pid}.tmp`;
  const journal = { placed: [], saved: [] };
  const context = { stagingDir, outputDir, slugs, backupDir };
  let undoFailed = false;
  try {
    mkdirSync(dirname(manifestFile), { recursive: true });
    writeFileSync(temporaryManifest, manifestText, 'utf8');
    const removed = clean ? dropStale(journal, ops, context) : [];
    placeStaged(journal, ops, context);
    ops.rename(temporaryManifest, manifestFile);
    return removed;
  } catch (error) {
    const failures = undo(journal, ops);
    if (failures.length > 0) {
      undoFailed = true;
      throw new UndoFailedError(backupDir, [error instanceof Error ? error.message : String(error), ...failures]);
    }
    throw error;
  } finally {
    rmSync(temporaryManifest, { force: true });
    if (!undoFailed) rmSync(backupDir, { recursive: true, force: true });
  }
}
