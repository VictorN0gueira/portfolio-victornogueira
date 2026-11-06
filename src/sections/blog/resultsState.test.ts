import { describe, expect, it } from 'vitest';
import { pickState } from './resultsState';

describe('pickState', () => {
  it('shows the skeleton while a load runs, whatever else is true', () => {
    expect(pickState(true, 'erro', 3, 3)).toBe('loading');
  });

  it('shows the error when the load failed, and only then the lists', () => {
    expect(pickState(false, 'erro', 3, 3)).toBe('error');
  });

  it('tells no article at all from filters that match nothing', () => {
    expect(pickState(false, null, 0, 0)).toBe('empty');
    expect(pickState(false, null, 4, 0)).toBe('no-match');
  });

  it('shows the articles when some pass the filters', () => {
    expect(pickState(false, null, 4, 2)).toBe('articles');
  });
});
