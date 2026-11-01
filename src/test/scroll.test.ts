import { afterEach, describe, expect, it } from 'vitest';
import { removeScrollIntoViewStub, stubScrollIntoView, stubScrollIntoViewEverywhere } from './scroll';

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

describe('stubScrollIntoViewEverywhere', () => {
  afterEach(() => {
    removeScrollIntoViewStub();
  });

  it('gives every element a recording scrollIntoView, also one created after the call', () => {
    const scrollIntoView = stubScrollIntoViewEverywhere();
    const later = document.createElement('section');

    later.scrollIntoView();

    expect(scrollIntoView).toHaveBeenCalledTimes(1);
    expect(scrollIntoView.mock.contexts[0]).toBe(later);
  });

  it('is put back to nothing by removeScrollIntoViewStub, so a test cannot leak it', () => {
    stubScrollIntoViewEverywhere();

    removeScrollIntoViewStub();

    expect(document.createElement('div').scrollIntoView).toBeUndefined();
  });
});
