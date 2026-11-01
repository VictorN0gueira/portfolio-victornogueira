import { screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { REDUCED_MOTION_QUERY, stubMatchMedia } from '../../test/matchMedia';
import { IntersectionObserverMock, triggerIntersection } from '../../test/intersection';
import { renderWithProviders } from '../../test/render';
import { RevealGroup, RevealItem, type RevealVariant } from './Reveal';

const ITEM_SELECTOR = '[data-reveal-item]';
const REVEALED_TIMEOUT_MS = 3000;
const NO_DELAY_TIMEOUT_MS = 500;
// How far from its end value (opacity 1, blur and offset 0) an animated style may still be and count as arrived.
const SETTLED_TOLERANCE = 0.01;

/** The first number of a style value such as `blur(0.0003px)` or `translateY(2px)`; `none` and an empty value are 0. */
function firstNumber(value: string): number {
  const match = /-?\d*\.?\d+(?:e-?\d+)?/i.exec(value);
  return match ? Number(match[0]) : 0;
}

function getGroup(container: HTMLElement): HTMLElement {
  return container.firstElementChild as HTMLElement;
}

function getItem(testId: string): HTMLElement {
  return screen.getByTestId(testId);
}

describe('RevealItem with motion allowed', () => {
  beforeEach(() => {
    localStorage.clear();
    stubMatchMedia();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('is hidden (opacity 0) until its group enters the view', () => {
    renderWithProviders(
      <RevealGroup>
        <RevealItem>
          <p data-testid="item">oi</p>
        </RevealItem>
      </RevealGroup>,
    );

    expect(getItem('item').parentElement?.style.opacity).toBe('0');
  });

  it('becomes visible once the group enters the view', async () => {
    const { container } = renderWithProviders(
      <RevealGroup>
        <RevealItem>
          <p data-testid="item">oi</p>
        </RevealItem>
      </RevealGroup>,
    );
    const wrapper = getItem('item').parentElement as HTMLElement;

    triggerIntersection(getGroup(container));

    await waitFor(() => expect(wrapper.style.opacity).toBe('1'), { timeout: REVEALED_TIMEOUT_MS });
    expect(wrapper.style.transform).toMatch(/^(none|translateY\(0(px)?\))?$/);
  });

  it('shows an item that mounts after its group was revealed in its final state, never hiding it again', async () => {
    const { container, rerender } = renderWithProviders(
      <RevealGroup>
        <RevealItem>
          <p data-testid="first">um</p>
        </RevealItem>
      </RevealGroup>,
    );
    const first = getItem('first').parentElement as HTMLElement;
    triggerIntersection(getGroup(container));
    await waitFor(() => expect(first.style.opacity).toBe('1'), { timeout: REVEALED_TIMEOUT_MS });

    rerender(
      <RevealGroup>
        <RevealItem>
          <p data-testid="first">um</p>
        </RevealItem>
        <RevealItem>
          <p data-testid="late">tarde</p>
        </RevealItem>
      </RevealGroup>,
    );

    expect((getItem('late').parentElement as HTMLElement).style.opacity).toBe('1');
  });

  it('stops observing the group after the first reveal (once)', async () => {
    const { container } = renderWithProviders(
      <RevealGroup>
        <RevealItem>
          <p data-testid="item">oi</p>
        </RevealItem>
      </RevealGroup>,
    );
    const wrapper = getItem('item').parentElement as HTMLElement;

    triggerIntersection(getGroup(container));
    await waitFor(() => expect(wrapper.style.opacity).toBe('1'), { timeout: REVEALED_TIMEOUT_MS });

    expect(() => triggerIntersection(getGroup(container), false)).toThrow(/no IntersectionObserver/);
  });

  it.each<[RevealVariant, string | null]>([
    ['up', 'translateY(32px)'],
    ['fade', null],
    ['rise-blur', 'translateY(24px)'],
  ])('starts the %s variant hidden at its offset', (variant, transform) => {
    renderWithProviders(
      <RevealGroup>
        <RevealItem variant={variant}>
          <p data-testid="item">oi</p>
        </RevealItem>
      </RevealGroup>,
    );
    const wrapper = getItem('item').parentElement as HTMLElement;

    expect(wrapper.style.opacity).toBe('0');
    if (transform === null) {
      expect(wrapper.style.transform).toBe('');
    } else {
      expect(wrapper.style.transform).toBe(transform);
    }
  });

  it('starts the rise-blur variant blurred, and clears the blur once its group is in view', async () => {
    const { container } = renderWithProviders(
      <RevealGroup>
        <RevealItem variant="rise-blur">
          <p data-testid="item">oi</p>
        </RevealItem>
      </RevealGroup>,
    );
    const wrapper = getItem('item').parentElement as HTMLElement;
    expect(wrapper.style.filter).toBe('blur(8px)');

    triggerIntersection(getGroup(container));

    // The three values settle on their last frame together, and on a busy machine a frame can land a hair short of
    // the end (opacity 0.99999, blur 0.0003px): they are read as numbers and must come within a hundredth of the end.
    await waitFor(
      () => {
        expect(1 - Number(wrapper.style.opacity)).toBeLessThan(SETTLED_TOLERANCE);
        expect(firstNumber(wrapper.style.filter)).toBeLessThan(SETTLED_TOLERANCE);
        expect(Math.abs(firstNumber(wrapper.style.transform))).toBeLessThan(SETTLED_TOLERANCE);
      },
      { timeout: REVEALED_TIMEOUT_MS },
    );
  });

  it('renders a div item by default and a span item with as="span", so a heading can hold items', () => {
    renderWithProviders(
      <RevealGroup as="h1">
        <RevealItem>
          <b data-testid="block">um</b>
        </RevealItem>
        <RevealItem as="span">
          <b data-testid="inline">dois</b>
        </RevealItem>
      </RevealGroup>,
    );

    expect(getItem('block').parentElement?.tagName).toBe('DIV');
    expect(getItem('inline').parentElement?.tagName).toBe('SPAN');
    expect(getItem('inline').parentElement).toHaveAttribute('data-reveal-item');
  });

  it('staggers and reveals span items like div items, in document order', async () => {
    const { container } = renderWithProviders(
      <RevealGroup as="h1" stagger={0.1}>
        <RevealItem as="span" variant="rise-blur">
          <b data-testid="first">um</b>
        </RevealItem>{' '}
        <RevealItem as="span" variant="rise-blur">
          <b data-testid="second">dois</b>
        </RevealItem>{' '}
        <RevealItem as="span" variant="rise-blur">
          <b data-testid="third">tres</b>
        </RevealItem>
      </RevealGroup>,
    );
    const items = ['first', 'second', 'third'].map((id) => getItem(id).parentElement as HTMLElement);
    items.forEach((item) => {
      expect(item.style.opacity).toBe('0');
      expect(item.style.filter).toBe('blur(8px)');
    });
    // The batch (one frame of mutations) in which each item first left opacity 0. Time never enters the check:
    // a loaded machine may put several items in one batch, but an item can never start before the one before it.
    const startedIn = new Map<HTMLElement, number>();
    let batch = 0;
    const observer = new MutationObserver(() => {
      batch += 1;
      items.forEach((item) => {
        if (!startedIn.has(item) && item.style.opacity !== '0') startedIn.set(item, batch);
      });
    });
    items.forEach((item) => observer.observe(item, { attributes: true, attributeFilter: ['style'] }));

    triggerIntersection(getGroup(container));
    await waitFor(() => items.forEach((item) => expect(item.style.opacity).toBe('1')), { timeout: REVEALED_TIMEOUT_MS });
    observer.disconnect();

    const order = items.map((item) => startedIn.get(item) as number);
    expect(order.every((value) => value !== undefined)).toBe(true);
    expect(order).toEqual([...order].sort((first, second) => first - second));
  });

  it('shows a span item in its final state, without a hidden style, when motion is reduced', () => {
    stubMatchMedia({ [REDUCED_MOTION_QUERY]: true });

    renderWithProviders(
      <RevealGroup>
        <RevealItem as="span">
          <b data-testid="inline">oi</b>
        </RevealItem>
      </RevealGroup>,
    );

    const wrapper = getItem('inline').parentElement as HTMLElement;
    expect(wrapper.tagName).toBe('SPAN');
    expect(wrapper).not.toHaveAttribute('style');
  });

  it('defaults to the up variant', () => {
    renderWithProviders(
      <RevealGroup>
        <RevealItem>
          <p data-testid="item">oi</p>
        </RevealItem>
      </RevealGroup>,
    );

    expect((getItem('item').parentElement as HTMLElement).style.transform).toBe('translateY(32px)');
  });

  it('merges the className of group and item and renders the group as the requested tag', () => {
    const { container } = renderWithProviders(
      <RevealGroup as="section" className="grid gap-4">
        <RevealItem className="col-span-2">
          <p data-testid="item">oi</p>
        </RevealItem>
      </RevealGroup>,
    );

    expect(getGroup(container).tagName).toBe('SECTION');
    expect(getGroup(container)).toHaveClass('grid', 'gap-4');
    expect(getItem('item').parentElement).toHaveClass('col-span-2');
  });

  it('renders the group as a div by default', () => {
    const { container } = renderWithProviders(<RevealGroup>texto</RevealGroup>);

    expect(getGroup(container).tagName).toBe('DIV');
  });

  it('observes once per group, however many items it holds, with the 8 percent bottom margin', () => {
    const created: Array<{ rootMargin: string }> = [];
    class CountingObserver extends IntersectionObserverMock {
      constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
        super(callback, options);
        created.push({ rootMargin: this.rootMargin });
      }
    }
    vi.stubGlobal('IntersectionObserver', CountingObserver);

    renderWithProviders(
      <RevealGroup>
        {[0, 1, 2, 3, 4].map((index) => (
          <RevealItem key={index}>
            <p>{index}</p>
          </RevealItem>
        ))}
      </RevealGroup>,
    );

    expect(created).toEqual([{ rootMargin: '0px 0px -8% 0px' }]);
  });

  it('staggers the items in document order, also through wrapper elements', async () => {
    const { container } = renderWithProviders(
      <RevealGroup stagger={1}>
        <RevealItem>
          <p data-testid="first">um</p>
        </RevealItem>
        <div>
          <RevealItem>
            <p data-testid="second">dois</p>
          </RevealItem>
        </div>
      </RevealGroup>,
    );
    const first = getItem('first').parentElement as HTMLElement;
    const second = getItem('second').parentElement as HTMLElement;

    triggerIntersection(getGroup(container));

    // The first item has no delay, the second waits a full second: when the first one is moving the second is not.
    await waitFor(() => expect(first.style.opacity).not.toBe('0'), { timeout: REVEALED_TIMEOUT_MS });
    expect(second.style.opacity).toBe('0');
  });

  it('does not count the items of a nested group in the outer stagger', async () => {
    const { container } = renderWithProviders(
      <RevealGroup stagger={1}>
        <RevealGroup>
          <RevealItem>
            <p data-testid="nested">aninhado</p>
          </RevealItem>
        </RevealGroup>
        <RevealItem>
          <p data-testid="outer">fora</p>
        </RevealItem>
      </RevealGroup>,
    );
    const outer = getItem('outer').parentElement as HTMLElement;

    triggerIntersection(getGroup(container));

    // The nested item belongs to the nested group, so the outer item is the first of the outer group: no
    // delay. Counted wrongly it would wait a full second, longer than this timeout.
    await waitFor(() => expect(outer.style.opacity).not.toBe('0'), { timeout: NO_DELAY_TIMEOUT_MS });
  });

  it('shows an item that has no group around it in its final state', () => {
    renderWithProviders(
      <RevealItem>
        <p data-testid="item">oi</p>
      </RevealItem>,
    );

    expect((getItem('item').parentElement as HTMLElement).style.opacity).toBe('');
  });
});

// The sideways and zoom variants were used by no section, and the query that turned the sideways ones into "up" below md
// was read by every item for nothing. Items now read no breakpoint at all.
describe('RevealItem and the viewport width', () => {
  it('reads no media query of its own: the only one asked for is the motion preference', () => {
    const media = stubMatchMedia();

    renderWithProviders(
      <RevealGroup>
        {[0, 1, 2].map((index) => (
          <RevealItem key={index}>
            <p>{index}</p>
          </RevealItem>
        ))}
      </RevealGroup>,
    );

    const asked = new Set(media.matchMedia.mock.calls.map(([query]) => query as string));
    expect([...asked]).toEqual([REDUCED_MOTION_QUERY]);
  });
});

// Where each item sits among its siblings is read from the DOM once for the whole group, not once per item.
describe('RevealGroup positions', () => {
  const countItemQueries = () => {
    const original = Element.prototype.querySelectorAll;
    const spy = vi.spyOn(Element.prototype, 'querySelectorAll').mockImplementation(function (this: Element, selector: string) {
      return original.call(this, selector);
    });
    return () => spy.mock.calls.filter(([selector]) => selector === ITEM_SELECTOR).length;
  };

  it('looks up the items of the group once, however many items it holds', async () => {
    const queries = countItemQueries();
    const { container } = renderWithProviders(
      <RevealGroup stagger={0.01}>
        {[0, 1, 2, 3, 4, 5, 6, 7].map((index) => (
          <RevealItem key={index}>
            <p data-testid={`item-${index}`}>{index}</p>
          </RevealItem>
        ))}
      </RevealGroup>,
    );

    triggerIntersection(getGroup(container));
    await waitFor(() => expect(getItem('item-7').parentElement?.style.opacity).toBe('1'), { timeout: REVEALED_TIMEOUT_MS });

    expect(queries()).toBe(1);
  });

  it('still staggers by position after the lookup is shared', async () => {
    const { container } = renderWithProviders(
      <RevealGroup stagger={1}>
        <RevealItem>
          <p data-testid="first">um</p>
        </RevealItem>
        <RevealItem>
          <p data-testid="second">dois</p>
        </RevealItem>
      </RevealGroup>,
    );

    triggerIntersection(getGroup(container));

    await waitFor(() => expect((getItem('first').parentElement as HTMLElement).style.opacity).not.toBe('0'), { timeout: REVEALED_TIMEOUT_MS });
    expect((getItem('second').parentElement as HTMLElement).style.opacity).toBe('0');
  });
});
