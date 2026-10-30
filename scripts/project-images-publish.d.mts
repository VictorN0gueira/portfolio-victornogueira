// Types for scripts/project-images-publish.mjs, so the unit tests can import it under strict TypeScript without allowJs.

/** The two file operations the publish step uses; a test can replace them to make one step fail. */
export interface PublishOps {
  rename: (from: string, to: string) => void;
  remove: (path: string) => void;
}

export interface PublishOptions {
  stagingDir: string;
  outputDir: string;
  slugs: ReadonlySet<string> | readonly string[];
  clean?: boolean;
  manifestFile: string;
  manifestText: string;
  ops?: PublishOps;
}

export const BACKUP_FOLDER: string;
export class UndoFailedError extends Error {
  constructor(backupDir: string, causes: string[]);
  backupDir: string;
}
export function backupLeftoverMessage(backupDir: string): string;
export function backupDirOf(outputDir: string): string;
export function publishRun(options: PublishOptions): string[];
