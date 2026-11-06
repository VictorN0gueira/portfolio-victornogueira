import { screen, within } from '@testing-library/react';
import type { ComponentType } from 'react';
import { afterEach, beforeEach, vi } from 'vitest';
import { legalCopy } from '../../data/legalCopy';
import { stubMatchMedia } from '../../test/matchMedia';
import { renderWithProviders } from '../../test/render';
import { LegalFrame } from './LegalFrame';

// What the tests of the frame share: how it is rendered, how its parts are found, and the browser it runs in (scrollIntoView
// and the history are watched, the media queries answer no, and everything is put back after each test).

export const renderFrame = (Page: ComponentType, strict = false) =>
  renderWithProviders(
    <LegalFrame>
      <Page />
    </LegalFrame>,
    { route: '/privacidade', strict },
  );

export const bodyOf = (container: HTMLElement): HTMLElement => {
  const body = container.querySelector<HTMLElement>('[data-legal-body]');
  if (!body) throw new Error('the frame has no [data-legal-body]');
  return body;
};
export const headingsOf = (container: HTMLElement): HTMLElement[] =>
  Array.from(bodyOf(container).querySelectorAll('h2'));
export const tocNav = () => screen.getByRole('navigation', { name: legalCopy.tocLabel });
export const tocLinks = () => within(tocNav()).getAllByRole('link', { hidden: true });

export function placeHeadings(headings: HTMLElement[], tops: number[]): void {
  headings.forEach((heading, index) => {
    vi.spyOn(heading, 'getBoundingClientRect').mockReturnValue({
      top: tops[index],
      bottom: tops[index] + 30,
    } as DOMRect);
  });
}

/** Call inside a describe: installs the watched browser around each test and returns the scrollIntoView spy. */
export function useFrameEnvironment(): ReturnType<typeof vi.fn> {
  const scrollIntoView = vi.fn();

  beforeEach(() => {
    localStorage.clear();
    stubMatchMedia();
    Element.prototype.scrollIntoView = scrollIntoView;
    vi.spyOn(window.history, 'replaceState');
  });

  afterEach(() => {
    scrollIntoView.mockReset();
    vi.restoreAllMocks();
    localStorage.clear();
    window.location.hash = '';
    delete (Element.prototype as Partial<Element>).scrollIntoView;
  });

  return scrollIntoView;
}
