/** Where a note of the news chain came from. */
export type FailureSource = 'cache' | 'cache-write' | 'edge-function' | 'devto' | 'tabnews' | 'public-apis';

/**
 * Why a source did not give the list, or a note that did not stop it (a cache that could not be written, an address that
 * could not be read). The same reason of the same source is one entry with a `count`.
 */
export interface SourceFailure {
  source: FailureSource;
  reason: string;
  /** How many times it happened. Absent for once. */
  count?: number;
}

/** The most distinct entries one list keeps: a feed of many bad items cannot grow it without limit. */
export const MAX_FAILURES = 12;
const MAX_REASON_LENGTH = 200;

export interface FailureLog {
  /** Notes a failure. The same source with the same reason only raises the count. */
  record: (source: FailureSource, error: unknown) => void;
  /** The entries, in the order they first happened. */
  list: () => SourceFailure[];
}

// The message of the error, from anything that carries one (a DOMException of the storage is not always an Error).
function reasonOf(error: unknown): string {
  const message = typeof error === 'object' && error !== null && 'message' in error ? error.message : undefined;
  const text = typeof message === 'string' && message !== '' ? message : String(error);
  return text.slice(0, MAX_REASON_LENGTH);
}

export function createFailureLog(): FailureLog {
  const entries = new Map<string, SourceFailure>();

  return {
    record(source, error) {
      const reason = reasonOf(error);
      const key = `${source}|${reason}`;
      const known = entries.get(key);
      if (known) {
        entries.set(key, { ...known, count: (known.count ?? 1) + 1 });
      } else if (entries.size < MAX_FAILURES) {
        entries.set(key, { source, reason });
      }
    },
    list: () => Array.from(entries.values()),
  };
}
