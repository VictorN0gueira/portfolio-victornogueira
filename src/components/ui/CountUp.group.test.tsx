import { waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { IntersectionObserverMock, triggerIntersection } from '../../test/intersection';
import { stubMatchMedia } from '../../test/matchMedia';
import { renderWithProviders } from '../../test/render';
import { CountUp } from './CountUp';
import { RevealGroup, RevealItem } from './Reveal';
import { useRevealGroupInView } from './revealGroupContext';

const SHORT_DURATION_MS = 60;
const SETTLE_TIMEOUT_MS = 2000;
const STATS = ['500h+', '100+', '85%', '10+'];

function statsInAGroup() {
  return (
    <RevealGroup>
      {STATS.map((stat) => (
        <RevealItem key={stat}>
          <CountUp value={stat} durationMs={SHORT_DURATION_MS} />
        </RevealItem>
      ))}
    </RevealGroup>
  );
}

function countObservers(): () => number {
  let created = 0;
  class CountingObserver extends IntersectionObserverMock {
    constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
      super(callback, options);
      created += 1;
    }
  }
  vi.stubGlobal('IntersectionObserver', CountingObserver);
  return () => created;
}

describe('useRevealGroupInView', () => {
  it('is null outside a group and the in view state of the group inside it', () => {
    stubMatchMedia();
    const seen: Array<boolean | null> = [];
    function Probe() {
      seen.push(useRevealGroupInView());
      return null;
    }

    renderWithProviders(<Probe />);
    renderWithProviders(
      <RevealGroup>
        <Probe />
      </RevealGroup>,
    );

    expect(seen[0]).toBeNull();
    expect(seen.at(-1)).toBe(false);
  });
});

// A stat inside a RevealGroup follows the group: one observer for the whole grid (the rule of the page), and the count
// starts when the group reveals, not at a different margin of its own while its card is still transparent.
describe('CountUp inside a RevealGroup', () => {
  beforeEach(() => {
    stubMatchMedia();
  });

  it('adds no observer of its own: the group is the only one', () => {
    const observers = countObservers();

    renderWithProviders(statsInAGroup());

    expect(observers()).toBe(1);
  });

  it('keeps its own observer when it stands alone', () => {
    const observers = countObservers();

    renderWithProviders(<CountUp value="85%" />);

    expect(observers()).toBe(1);
  });

  it('counts when the group comes into view, and not before', async () => {
    const { container } = renderWithProviders(statsInAGroup());
    const numbers = Array.from(container.querySelectorAll<HTMLElement>('span[data-width-text]'));
    expect(numbers).toHaveLength(STATS.length);

    await new Promise((resolve) => setTimeout(resolve, SHORT_DURATION_MS * 3));
    expect(numbers.map((node) => node.textContent)).toEqual(STATS.map(() => '0'));

    triggerIntersection(container.firstElementChild as HTMLElement);

    await waitFor(() => expect(numbers.map((node) => node.textContent)).toEqual(['500', '100', '85', '10']), {
      timeout: SETTLE_TIMEOUT_MS,
    });
  });
});
