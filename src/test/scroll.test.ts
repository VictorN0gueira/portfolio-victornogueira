import { describe, expect, it } from 'vitest';
import { stubScrollIntoView } from './scroll';

describe('stubScrollIntoView', () => {
  it('gives the element a scrollIntoView that records its calls', () => {
    const element = document.createElement('div');

    const scrollIntoView = stubScrollIntoView(element);
    element.scrollIntoView({ block: 'nearest' });

    expect(scrollIntoView).toHaveBeenCalledTimes(1);
    expect(scrollIntoView).toHaveBeenCalledWith({ block: 'nearest' });
  });

  it('stubs one element only', () => {
    const stubbed = document.createElement('div');
    const other = document.createElement('div');

    stubScrollIntoView(stubbed);

    expect(stubbed.scrollIntoView).toBeTypeOf('function');
    expect(other.scrollIntoView).toBeUndefined();
  });
});
