import { screen, waitFor } from '@testing-library/react';
import { Profiler } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { triggerIntersection } from '../../test/intersection';
import { REDUCED_MOTION_QUERY, stubMatchMedia } from '../../test/matchMedia';
import { renderWithProviders } from '../../test/render';
import { CountUp } from './CountUp';

const A11Y_STORAGE_KEY = 'a11y-preferences';
const SHORT_DURATION_MS = 60;
const SETTLE_TIMEOUT_MS = 2000;

function getWrapper(container: HTMLElement): HTMLElement {
  return container.firstElementChild as HTMLElement;
}

describe('CountUp without motion', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('shows a numeric value at once when the system asks for reduced motion', () => {
    stubMatchMedia({ [REDUCED_MOTION_QUERY]: true });

    renderWithProviders(<CountUp value="85%" />);

    expect(screen.getByText('85%')).toBeInTheDocument();
  });

  it('shows a numeric value at once when the accessibility toggle paused animations', () => {
    stubMatchMedia();
    localStorage.setItem(A11Y_STORAGE_KEY, JSON.stringify({ noAnimations: true }));

    renderWithProviders(<CountUp value="500h+" />);

    expect(screen.getByText('500h+')).toBeInTheDocument();
  });

  it('shows the raw text of a non numeric value', () => {
    stubMatchMedia({ [REDUCED_MOTION_QUERY]: true });

    renderWithProviders(<CountUp value="contínuo" />);

    expect(screen.getByText('contínuo')).toBeInTheDocument();
  });

  it('shows the raw text of a non numeric value even with motion allowed', () => {
    stubMatchMedia();

    const { container } = renderWithProviders(<CountUp value="contínuo" />);

    expect(getWrapper(container)).toHaveTextContent('contínuo');
    expect(getWrapper(container)).not.toHaveAttribute('aria-label');
  });

  it('merges a consumer className on the raw text', () => {
    stubMatchMedia({ [REDUCED_MOTION_QUERY]: true });

    const { container } = renderWithProviders(<CountUp value="85%" className="text-4xl" />);

    expect(getWrapper(container)).toHaveClass('text-4xl');
  });
});

describe('CountUp with motion allowed', () => {
  beforeEach(() => {
    stubMatchMedia();
  });

  it('starts at zero, keeps the suffix, and labels the final value for assistive tech', () => {
    const { container } = renderWithProviders(<CountUp value="85%" />);
    const wrapper = getWrapper(container);

    expect(wrapper).toHaveAttribute('aria-label', '85%');
    expect(wrapper.firstElementChild).toHaveTextContent('0');
    expect(wrapper).toHaveTextContent('0%');
  });

  it('exposes the final value once by name and hides every visual piece from assistive tech', () => {
    renderWithProviders(<CountUp value="85%" />);

    expect(screen.getByLabelText('85%')).toBeInTheDocument();
    const visualPieces = screen.getByLabelText('85%').children;
    expect([...visualPieces].every((piece) => piece.getAttribute('aria-hidden') === 'true')).toBe(true);
  });

  it('does not count before the element enters the view', async () => {
    const { container } = renderWithProviders(<CountUp value="85%" durationMs={SHORT_DURATION_MS} />);

    await new Promise((resolve) => setTimeout(resolve, SHORT_DURATION_MS * 3));

    expect(getWrapper(container)).toHaveTextContent('0%');
  });

  it('counts up to the number once the element enters the view', async () => {
    const { container } = renderWithProviders(<CountUp value="85%" durationMs={SHORT_DURATION_MS} />);
    const wrapper = getWrapper(container);

    triggerIntersection(wrapper);

    await waitFor(() => expect(wrapper).toHaveTextContent('85%'), { timeout: SETTLE_TIMEOUT_MS });
    expect(wrapper).toHaveAttribute('aria-label', '85%');
  });

  it('passes through intermediate numbers on the way up', async () => {
    const { container } = renderWithProviders(<CountUp value="500h+" durationMs={300} />);
    const wrapper = getWrapper(container);
    const numberNode = wrapper.firstElementChild as HTMLElement;
    const seen = new Set<string>();
    const observer = new MutationObserver(() => seen.add(numberNode.textContent ?? ''));
    observer.observe(numberNode, { childList: true, characterData: true, subtree: true });

    triggerIntersection(wrapper);
    await waitFor(() => expect(wrapper).toHaveTextContent('500h+'), { timeout: SETTLE_TIMEOUT_MS });
    observer.disconnect();

    expect(seen.has('500')).toBe(true);
    expect([...seen].filter((text) => text !== '0' && text !== '500').length).toBeGreaterThan(0);
  });

  it('writes the frames through the DOM, so React commits a handful of times and not once per frame', async () => {
    let commits = 0;
    const { container } = renderWithProviders(
      <Profiler id="count" onRender={() => (commits += 1)}>
        <CountUp value="500h+" durationMs={300} />
      </Profiler>,
    );
    const wrapper = getWrapper(container);

    triggerIntersection(wrapper);
    await waitFor(() => expect(wrapper).toHaveTextContent('500h+'), { timeout: SETTLE_TIMEOUT_MS });

    expect(commits).toBeLessThanOrEqual(3);
  });

  it('keeps decimals with the pt-BR comma', async () => {
    const { container } = renderWithProviders(<CountUp value="1,5x" durationMs={SHORT_DURATION_MS} />);
    const wrapper = getWrapper(container);

    triggerIntersection(wrapper);

    await waitFor(() => expect(wrapper).toHaveTextContent('1,5x'), { timeout: SETTLE_TIMEOUT_MS });
  });

  it('groups thousands with the pt-BR dot', async () => {
    const { container } = renderWithProviders(<CountUp value="1200+" durationMs={SHORT_DURATION_MS} />);
    const wrapper = getWrapper(container);

    triggerIntersection(wrapper);

    await waitFor(() => expect(wrapper).toHaveTextContent('1.200+'), { timeout: SETTLE_TIMEOUT_MS });
  });

  it('can unmount while counting without errors', () => {
    const { container, unmount } = renderWithProviders(<CountUp value="85%" durationMs={SHORT_DURATION_MS * 10} />);

    triggerIntersection(getWrapper(container));

    expect(() => unmount()).not.toThrow();
  });
});
