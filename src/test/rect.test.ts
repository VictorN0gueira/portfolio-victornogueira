import { afterEach, describe, expect, it, vi } from 'vitest';
import { stubRect } from './rect';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('stubRect', () => {
  it('gives the element a default box and reports it back', () => {
    const element = document.createElement('div');

    const box = stubRect(element);

    expect(element.getBoundingClientRect()).toBe(box);
    expect(box).toMatchObject({ left: 10, top: 20, width: 200, height: 100, right: 210, bottom: 120, x: 10, y: 20 });
  });

  it('takes the position and the size a test gives and derives the far edges from them', () => {
    const element = document.createElement('div');

    stubRect(element, { left: 5, top: 7, width: 30, height: 40 });

    expect(element.getBoundingClientRect()).toMatchObject({ left: 5, top: 7, right: 35, bottom: 47, x: 5, y: 7 });
  });

  it('keeps the default size when only the position is given', () => {
    const element = document.createElement('div');

    stubRect(element, { left: 0, top: 0 });

    expect(element.getBoundingClientRect()).toMatchObject({ width: 200, height: 100 });
  });

  it('only changes the element it was given', () => {
    const stubbed = document.createElement('div');
    const other = document.createElement('div');

    stubRect(stubbed, { left: 50 });

    expect(other.getBoundingClientRect().left).toBe(0);
  });

  it('is undone by restoreAllMocks', () => {
    const element = document.createElement('div');
    stubRect(element, { left: 50 });

    vi.restoreAllMocks();

    expect(element.getBoundingClientRect().left).toBe(0);
  });
});
