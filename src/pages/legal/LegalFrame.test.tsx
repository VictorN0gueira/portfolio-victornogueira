import { fireEvent, screen, within } from '@testing-library/react';
import type { ComponentType } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { legalCopy } from '../../data/legalCopy';
import { IntersectionObserverMock, triggerIntersection } from '../../test/intersection';
import { LGPD_TEXT_HASH, PRIVACY_TEXT_HASH, hashOfText, visibleText } from '../../test/legalText';
import { REDUCED_MOTION_QUERY, stubMatchMedia } from '../../test/matchMedia';
import { renderWithProviders } from '../../test/render';
import { A11Y_STORAGE_KEY } from '../../contexts/AccessibilityContext';
import LgpdPage from '../LgpdPage';
import PrivacyPage from '../PrivacyPage';
import { LegalFrame } from './LegalFrame';

const WIDE_QUERY = '(min-width: 64rem)';
const ACTIVE_LINE_PX = 120;

// The words of the contents, from the titles of the frozen pages (the first of the LGPD page is the kicker of its black card).
const PRIVACY_LABELS = [
  '1. Quem é o controlador',
  '2. Quais dados são coletados',
  '3. Finalidades e bases legais',
  '4. Armazenamento e retenção',
  '5. Compartilhamento',
  '6. Cookies e armazenamento local',
  '7. Seus direitos (art. 18 da LGPD)',
  '8. Atualizações desta política',
];
const LGPD_LABELS = ['Controlador dos dados', 'Bases legais', 'Seus direitos', 'Quer exercer um direito?'];

const PAGES: ReadonlyArray<readonly [name: string, Page: ComponentType, hash: string, labels: readonly string[]]> = [
  ['PrivacyPage', PrivacyPage, PRIVACY_TEXT_HASH, PRIVACY_LABELS],
  ['LgpdPage', LgpdPage, LGPD_TEXT_HASH, LGPD_LABELS],
];

const renderFrame = (Page: ComponentType, strict = false) =>
  renderWithProviders(
    <LegalFrame>
      <Page />
    </LegalFrame>,
    { route: '/privacidade', strict },
  );

const bodyOf = (container: HTMLElement): HTMLElement => {
  const body = container.querySelector<HTMLElement>('[data-legal-body]');
  if (!body) throw new Error('the frame has no [data-legal-body]');
  return body;
};
const headingsOf = (container: HTMLElement): HTMLElement[] => Array.from(bodyOf(container).querySelectorAll('h2'));
const tocNav = () => screen.getByRole('navigation', { name: legalCopy.tocLabel });
const tocLinks = () => within(tocNav()).getAllByRole('link', { hidden: true });

function placeHeadings(headings: HTMLElement[], tops: number[]): void {
  headings.forEach((heading, index) => {
    vi.spyOn(heading, 'getBoundingClientRect').mockReturnValue({
      top: tops[index],
      bottom: tops[index] + 30,
    } as DOMRect);
  });
}

describe('LegalFrame', () => {
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

  describe.each(PAGES)('around %s', (_name, Page, hash, labels) => {
    it('leaves the text exactly as the page alone says it', () => {
      const { container } = renderFrame(Page);

      expect(hashOfText(visibleText(bodyOf(container)))).toBe(hash);
    });

    it('lists one link per h2 of the page, in the same order, from what is on the screen', () => {
      const { container } = renderFrame(Page);

      expect(tocLinks()).toHaveLength(headingsOf(container).length);
      expect(tocLinks().map((link) => link.textContent)).toEqual(labels);
    });

    it('points every link at an id that exists in the body, with a title a script can focus', () => {
      const { container } = renderFrame(Page);
      const body = bodyOf(container);

      for (const link of tocLinks()) {
        const id = link.getAttribute('href')?.slice(1) ?? '';
        const target = body.querySelector(`#${CSS.escape(id)}`);
        expect(target, `#${id}`).not.toBeNull();
        expect(target?.tagName).toBe('H2');
        expect(target?.getAttribute('tabindex')).toBe('-1');
      }
    });

    it('moves focus to the title when a link is pressed, and puts only the hash in the address', () => {
      const { container } = renderFrame(Page);
      const [first] = tocLinks();
      const target = headingsOf(container)[0];

      const wasNotCancelled = fireEvent.click(first);

      expect(wasNotCancelled, 'the browser does not jump on its own').toBe(false);
      expect(target).toHaveFocus();
      expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });
      expect(window.history.replaceState).toHaveBeenCalledWith(window.history.state, '', `#${target.id}`);
    });
  });

  it('scrolls at once when the system asks for reduced motion', () => {
    stubMatchMedia({ [REDUCED_MOTION_QUERY]: true });
    renderFrame(PrivacyPage);

    fireEvent.click(tocLinks()[1]);

    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'instant', block: 'start' });
  });

  it('scrolls at once when the visitor paused the animations in the widget', () => {
    localStorage.setItem(A11Y_STORAGE_KEY, JSON.stringify({ noAnimations: true }));
    renderFrame(PrivacyPage);

    fireEvent.click(tocLinks()[1]);

    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'instant', block: 'start' });
  });

  it('leaves a link alone when it is opened in another tab (a modifier key is held)', () => {
    renderFrame(PrivacyPage);

    const wasNotCancelled = fireEvent.click(tocLinks()[0], { ctrlKey: true });

    expect(wasNotCancelled).toBe(true);
    expect(scrollIntoView).not.toHaveBeenCalled();
  });

  it('marks the section being read with aria-current, from the headings that crossed the line', () => {
    const { container } = renderFrame(PrivacyPage);
    const headings = headingsOf(container);
    placeHeadings(
      headings,
      headings.map((_, index) => index * 200 - 450),
    );

    triggerIntersection(headings[2], true);

    const current = tocLinks().filter((link) => link.getAttribute('aria-current') === 'location');
    expect(current).toHaveLength(1);
    expect(current[0].textContent).toBe(headings[2].textContent);
    expect(headings[3].getBoundingClientRect().top).toBeGreaterThan(ACTIVE_LINE_PX);
  });

  it('marks nothing while the visitor is still above the first title', () => {
    const { container } = renderFrame(PrivacyPage);
    const headings = headingsOf(container);
    placeHeadings(
      headings,
      headings.map((_, index) => 300 + index * 200),
    );

    triggerIntersection(headings[0], true);

    expect(tocLinks().some((link) => link.hasAttribute('aria-current'))).toBe(false);
  });

  it('marks the link that was pressed right away, before any scroll event', () => {
    const { container } = renderFrame(PrivacyPage);
    const headings = headingsOf(container);
    placeHeadings(
      headings,
      headings.map(() => 900),
    );

    fireEvent.click(tocLinks()[3]);

    expect(tocLinks()[3]).toHaveAttribute('aria-current', 'location');
    expect(headings[3]).toHaveFocus();
  });

  it('folds the list away in a details below the desktop width, and closes it after a choice', () => {
    const { container } = renderFrame(PrivacyPage);
    const details = container.querySelector('details');

    expect(details).not.toBeNull();
    expect(details?.open).toBe(false);
    expect(within(details as HTMLElement).getByText(legalCopy.tocLabel)).toBeInTheDocument();

    (details as HTMLDetailsElement).open = true;
    fireEvent.click(tocLinks()[0]);

    expect((details as HTMLDetailsElement).open).toBe(false);
  });

  it('closes the folded list before it scrolls, so the scroll aims at the layout the visitor will see', () => {
    const { container } = renderFrame(PrivacyPage);
    const details = container.querySelector('details') as HTMLDetailsElement;
    details.open = true;
    const openWhenScrolling: boolean[] = [];
    scrollIntoView.mockImplementation(() => {
      openWhenScrolling.push(details.open);
    });

    fireEvent.click(tocLinks()[2]);

    expect(openWhenScrolling).toEqual([false]);
  });

  it('shows the list as a sticky column from the desktop width, with no details', () => {
    stubMatchMedia({ [WIDE_QUERY]: true });
    const { container } = renderFrame(PrivacyPage);

    expect(container.querySelector('details')).toBeNull();
    expect(tocNav().className).toContain('sticky');
    expect(tocLinks().length).toBeGreaterThan(2);
  });

  it('has a single navigation with that name, whatever the width', () => {
    stubMatchMedia({ [WIDE_QUERY]: true });
    renderFrame(LgpdPage);

    expect(screen.getAllByRole('navigation', { name: legalCopy.tocLabel })).toHaveLength(1);
  });

  describe('the attributes put on the frozen titles', () => {
    it('are taken back when the frame goes away', () => {
      const { container, unmount } = renderFrame(PrivacyPage);
      const headings = headingsOf(container);
      expect(headings.every((heading) => heading.id !== '' && heading.getAttribute('tabindex') === '-1')).toBe(true);

      unmount();

      expect(headings.every((heading) => !heading.hasAttribute('id') && !heading.hasAttribute('tabindex'))).toBe(true);
    });

    it('survive the double effect of StrictMode once: one id each, one link each', () => {
      const { container } = renderFrame(PrivacyPage, true);
      const headings = headingsOf(container);
      const ids = headings.map((heading) => heading.id);

      expect(new Set(ids).size).toBe(headings.length);
      expect(ids.every((id) => id !== '')).toBe(true);
      expect(tocLinks()).toHaveLength(headings.length);
    });

    it('stop watching the headings: the observer is disconnected with the frame', () => {
      const disconnect = vi.spyOn(IntersectionObserverMock.prototype, 'disconnect');
      const { container, unmount } = renderFrame(PrivacyPage);
      const heading = headingsOf(container)[0];

      unmount();

      expect(disconnect).toHaveBeenCalled();
      expect(() => triggerIntersection(heading, true)).toThrow(/no IntersectionObserver/);
    });
  });

  it('builds the list with text, never with markup: a title with a tag in it stays a text', () => {
    const { container } = renderWithProviders(
      <LegalFrame>
        <h2>{'<img src=x onerror=alert(1)> título'}</h2>
        <h2>Outro</h2>
      </LegalFrame>,
    );

    expect(within(tocNav()).queryByRole('img', { hidden: true })).toBeNull();
    expect(container.querySelector('nav img, details img')).toBeNull();
    expect(tocLinks()[0].textContent).toBe('<img src=x onerror=alert(1)> título');
  });

  it('shows no list at all when the page has no titles', () => {
    renderWithProviders(
      <LegalFrame>
        <p>sem títulos</p>
      </LegalFrame>,
    );

    expect(screen.queryByRole('navigation', { name: legalCopy.tocLabel })).toBeNull();
  });
});
