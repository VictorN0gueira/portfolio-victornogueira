import { act, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { triggerIntersection } from '../../test/intersection';
import PrivacyPage from '../PrivacyPage';
import { bodyOf, headingsOf, placeHeadings, renderFrame, tocLinks, useFrameEnvironment } from './legalFrameKit';

// Which entry of the contents is marked as the one being read: what moves the mark and what holds it still.
const ACTIVE_LINE_PX = 120;

describe('LegalFrame, the entry being read', () => {
  useFrameEnvironment();

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

  it('counts a title that landed under an anchor as read: the line is the scroll padding plus the margin of the title', () => {
    const real = window.getComputedStyle.bind(window);
    vi.spyOn(window, 'getComputedStyle').mockImplementation((element, pseudo) => {
      if (element === document.documentElement) return { scrollPaddingTop: '96px' } as CSSStyleDeclaration;
      if (element.tagName === 'H2') return { scrollMarginTop: '48px' } as CSSStyleDeclaration;
      return real(element, pseudo);
    });
    const { container } = renderFrame(PrivacyPage);
    const headings = headingsOf(container);
    // A jump to the third title puts it at 96 + 48: the first line of the second one is above, the fourth far below.
    placeHeadings(
      headings,
      headings.map((_, index) => (index - 2) * 400 + 144),
    );

    triggerIntersection(headings[2], true);

    expect(tocLinks()[2]).toHaveAttribute('aria-current', 'location');
  });

  it('marks the title above while the reader goes up, as soon as the one below it is back under the line', () => {
    const real = window.getComputedStyle.bind(window);
    vi.spyOn(window, 'getComputedStyle').mockImplementation((element, pseudo) => {
      if (element === document.documentElement) return { scrollPaddingTop: '96px' } as CSSStyleDeclaration;
      if (element.tagName === 'H2') return { scrollMarginTop: '48px' } as CSSStyleDeclaration;
      return real(element, pseudo);
    });
    const { container } = renderFrame(PrivacyPage);
    const headings = headingsOf(container);
    // The third title is just under the line (the line is 146): the one before it must be the marked one.
    placeHeadings(
      headings,
      headings.map((_, index) => (index - 2) * 400 + 200),
    );

    triggerIntersection(headings[1], true);

    expect(tocLinks()[1]).toHaveAttribute('aria-current', 'location');
  });

  it('puts the line of the title being read just under the space the page keeps free at the top (scroll-padding-top)', () => {
    const real = window.getComputedStyle.bind(window);
    vi.spyOn(window, 'getComputedStyle').mockImplementation((element, pseudo) =>
      element === document.documentElement
        ? ({ scrollPaddingTop: '200px' } as CSSStyleDeclaration)
        : real(element, pseudo),
    );
    const { container } = renderFrame(PrivacyPage);
    const headings = headingsOf(container);
    // The third title sits at 180px: below the old fixed line (120) and above the one derived from the padding (224).
    placeHeadings(
      headings,
      headings.map((_, index) => [-500, -300, 180, 600, 900, 1200, 1500, 1800][index]),
    );

    triggerIntersection(headings[2], true);

    expect(tocLinks()[2]).toHaveAttribute('aria-current', 'location');
  });

  describe('after a link was pressed', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('keeps that link marked while the scroll goes on, and listens to the page again once it settled', () => {
      const { container } = renderFrame(PrivacyPage);
      const headings = headingsOf(container);
      placeHeadings(
        headings,
        headings.map((_, index) => index * 300 - 700),
      );

      fireEvent.click(tocLinks()[4]);
      // The smooth scroll passes by the earlier titles: the observer reports them, and it must not move the mark.
      placeHeadings(
        headings,
        headings.map((_, index) => index * 300 - 1000),
      );
      triggerIntersection(headings[1], true);
      expect(tocLinks()[4]).toHaveAttribute('aria-current', 'location');

      act(() => {
        window.dispatchEvent(new Event('scroll'));
        vi.advanceTimersByTime(300);
      });
      triggerIntersection(headings[1], true);

      expect(tocLinks().filter((link) => link.hasAttribute('aria-current'))).toHaveLength(1);
      expect(tocLinks()[3]).toHaveAttribute('aria-current', 'location');
    });

    it('marks the section the reader is in once the scroll ends, with no new report of the observer (a jump past titles)', () => {
      const { container } = renderFrame(PrivacyPage);
      const headings = headingsOf(container);
      placeHeadings(
        headings,
        headings.map((_, index) => index * 300 - 700),
      );
      fireEvent.click(tocLinks()[2]);

      // The reader jumps far down: the observer reported the titles it passed while the pressed link held the mark.
      placeHeadings(
        headings,
        headings.map((_, index) => index * 300 - 1800),
      );
      triggerIntersection(headings[5], true);
      act(() => {
        window.dispatchEvent(new Event('scroll'));
        vi.advanceTimersByTime(300);
      });

      expect(tocLinks()[6]).toHaveAttribute('aria-current', 'location');
      expect(tocLinks().filter((link) => link.hasAttribute('aria-current'))).toHaveLength(1);
    });

    it('lets go of the pressed link at the first wheel, touch or key of the reader, and marks where they are', () => {
      const { container } = renderFrame(PrivacyPage);
      const headings = headingsOf(container);
      placeHeadings(
        headings,
        headings.map((_, index) => index * 300 - 700),
      );
      fireEvent.click(tocLinks()[2]);
      placeHeadings(
        headings,
        headings.map((_, index) => index * 300 - 1500),
      );

      act(() => {
        window.dispatchEvent(new Event('wheel'));
      });

      expect(tocLinks()[5]).toHaveAttribute('aria-current', 'location');
    });

    it('settles by itself when the page does not scroll at all (the title was already in place)', () => {
      const { container } = renderFrame(PrivacyPage);
      const headings = headingsOf(container);
      placeHeadings(
        headings,
        headings.map((_, index) => index * 300 - 700),
      );
      fireEvent.click(tocLinks()[4]);

      act(() => {
        vi.advanceTimersByTime(300);
      });
      placeHeadings(
        headings,
        headings.map((_, index) => index * 300 - 1000),
      );
      triggerIntersection(headings[1], true);

      expect(tocLinks()[3]).toHaveAttribute('aria-current', 'location');
    });
  });

  describe('when a title shows up in the text later', () => {
    it('adds it to the list, in its place, and takes its attributes back when it goes', async () => {
      const { container } = renderFrame(PrivacyPage);
      const body = bodyOf(container);
      const before = tocLinks().length;
      const late = document.createElement('h2');
      late.textContent = 'Título que chegou depois';

      act(() => {
        const second = body.querySelectorAll('h2')[1];
        second.parentElement?.insertBefore(late, second);
      });

      await waitFor(() => expect(tocLinks()).toHaveLength(before + 1));
      expect(tocLinks()[1]).toHaveTextContent('Título que chegou depois');
      expect(late.id).toBe('titulo-que-chegou-depois');
      expect(late.getAttribute('tabindex')).toBe('-1');

      act(() => {
        late.remove();
      });

      await waitFor(() => expect(tocLinks()).toHaveLength(before));
      expect(late.hasAttribute('id')).toBe(false);
      expect(late.hasAttribute('tabindex')).toBe(false);
    });

    it('stops watching the text when the frame goes away', () => {
      const disconnect = vi.spyOn(MutationObserver.prototype, 'disconnect');
      const { unmount } = renderFrame(PrivacyPage);

      unmount();

      expect(disconnect).toHaveBeenCalled();
    });
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
});
