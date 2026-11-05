import { describe, expect, it } from 'vitest';
import { MAX_FAILURES, createFailureLog } from './newsFailures';

describe('createFailureLog', () => {
  it('lists the failures in the order they first happened', () => {
    const log = createFailureLog();

    log.record('edge-function', new Error('Edge function error: 502'));
    log.record('devto', new Error('No articles from Dev.to'));

    expect(log.list()).toEqual([
      { source: 'edge-function', reason: 'Edge function error: 502' },
      { source: 'devto', reason: 'No articles from Dev.to' },
    ]);
  });

  it('is empty when nothing was recorded', () => {
    expect(createFailureLog().list()).toEqual([]);
  });

  it('keeps one entry with a count when the same source fails for the same reason again', () => {
    const log = createFailureLog();

    for (let index = 0; index < 30; index += 1) log.record('tabnews', new TypeError('Invalid URL'));

    expect(log.list()).toEqual([{ source: 'tabnews', reason: 'Invalid URL', count: 30 }]);
  });

  it('keeps two entries when one source fails for two reasons', () => {
    const log = createFailureLog();

    log.record('cache', new Error('Unexpected token'));
    log.record('cache', new Error('quota'));

    expect(log.list().map((failure) => failure.reason)).toEqual(['Unexpected token', 'quota']);
  });

  it('stops at a limit of distinct entries, and still counts the ones it has', () => {
    const log = createFailureLog();

    for (let index = 0; index < MAX_FAILURES + 20; index += 1) log.record('tabnews', new Error(`reason ${index}`));
    log.record('tabnews', new Error('reason 0'));

    expect(log.list()).toHaveLength(MAX_FAILURES);
    expect(log.list()[0].count).toBe(2);
  });

  it('reads the message of anything that carries one, a DOMException included, and a text of anything else', () => {
    const log = createFailureLog();

    log.record('cache-write', new DOMException('quota', 'QuotaExceededError'));
    log.record('devto', 'plain text');
    log.record('devto', { message: '' });

    expect(log.list().map((failure) => failure.reason)).toEqual(['quota', 'plain text', '[object Object]']);
  });

  it('cuts a very long reason, which could come from the network', () => {
    const log = createFailureLog();

    log.record('edge-function', new Error('x'.repeat(5000)));

    expect(log.list()[0].reason).toHaveLength(200);
  });
});
