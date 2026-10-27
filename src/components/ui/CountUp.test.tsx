import { screen, waitFor } from '@testing-library/react';
import { Profiler } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { triggerIntersection } from '../../test/intersection';
import { REDUCED_MOTION_QUERY, stubMatchMedia } from '../../test/matchMedia';
import { renderWithProviders } from '../../test/render';
import DefaultCountUp, { CountUp } from './CountUp';

const A11Y_STORAGE_KEY = 'a11y-preferences';
const SHORT_DURATION_MS = 60;
const SETTLE_TIMEOUT_MS = 2000;

function getWrapper(container: HTMLElement): HTMLElement {
  return container.firstElementChild as HTMLElement;
}

// The wrapper holds the screen reader only text, then the counting number, then the suffix.
function getNumber(wrapper: HTMLElement): HTMLElement {
  return wrapper.children[1] as HTMLElement;
}

function getSuffix(wrapper: HTMLElement): HTMLElement | undefined {
  return wrapper.children[2] as HTMLElement | undefined;
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

  it('renders the plain text only, with no screen reader only copy of it', () => {
    stubMatchMedia({ [REDUCED_MOTION_QUERY]: true });

    const { container } = renderWithProviders(<CountUp value="85%" />);

    expect(screen.getAllByText('85%')).toHaveLength(1);
    expect(container.querySelector('.sr-only')).toBeNull();
    expect(container.querySelector('[aria-hidden]')).toBeNull();
    expect(getWrapper(container).children).toHaveLength(0);
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

  it('starts at zero and keeps the suffix', () => {
    const { container } = renderWithProviders(<CountUp value="85%" />);
    const wrapper = getWrapper(container);

    expect(getNumber(wrapper)).toHaveTextContent(/^0$/);
    expect(getSuffix(wrapper)).toHaveTextContent(/^%$/);
  });

  it('gives assistive tech the final value once, as screen reader only text', () => {
    const { container } = renderWithProviders(<CountUp value="85%" />);
    const wrapper = getWrapper(container);

    const readable = screen.getAllByText('85%');
    expect(readable).toHaveLength(1);
    expect(readable[0]).toHaveClass('sr-only');
    expect(readable[0]).not.toHaveAttribute('aria-hidden');
    expect(wrapper.firstElementChild).toBe(readable[0]);
  });

  it('hides the counting number and the suffix from assistive tech, and puts no role or label on the wrapper', () => {
    const { container } = renderWithProviders(<CountUp value="85%" />);
    const wrapper = getWrapper(container);

    expect(getNumber(wrapper)).toHaveAttribute('aria-hidden', 'true');
    expect(getSuffix(wrapper)).toHaveAttribute('aria-hidden', 'true');
    expect(wrapper).not.toHaveAttribute('role');
    expect(wrapper).not.toHaveAttribute('aria-label');
  });

  it('is positioned, so the screen reader only text can never widen the page', () => {
    const { container } = renderWithProviders(<CountUp value="85%" />);

    expect(getWrapper(container)).toHaveClass('relative');
  });

  it('does not count before the element enters the view', async () => {
    const { container } = renderWithProviders(<CountUp value="85%" durationMs={SHORT_DURATION_MS} />);

    await new Promise((resolve) => setTimeout(resolve, SHORT_DURATION_MS * 3));

    expect(getNumber(getWrapper(container))).toHaveTextContent(/^0$/);
  });

  it('counts up to the number once the element enters the view', async () => {
    const { container } = renderWithProviders(<CountUp value="85%" durationMs={SHORT_DURATION_MS} />);
    const wrapper = getWrapper(container);

    triggerIntersection(wrapper);

    await waitFor(() => expect(getNumber(wrapper)).toHaveTextContent(/^85$/), { timeout: SETTLE_TIMEOUT_MS });
    expect(getSuffix(wrapper)).toHaveTextContent(/^%$/);
  });

  it('passes through intermediate numbers on the way up', async () => {
    const { container } = renderWithProviders(<CountUp value="500h+" durationMs={300} />);
    const wrapper = getWrapper(container);
    const numberNode = getNumber(wrapper);
    const seen = new Set<string>();
    const observer = new MutationObserver(() => seen.add(numberNode.textContent ?? ''));
    observer.observe(numberNode, { childList: true, characterData: true, subtree: true });

    triggerIntersection(wrapper);
    await waitFor(() => expect(numberNode).toHaveTextContent(/^500$/), { timeout: SETTLE_TIMEOUT_MS });
    observer.disconnect();

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
    await waitFor(() => expect(getNumber(wrapper)).toHaveTextContent(/^500$/), { timeout: SETTLE_TIMEOUT_MS });

    expect(commits).toBeLessThanOrEqual(3);
  });

  it.each([
    ['85%', '85'],
    ['1,5x', '1,5'],
    ['1.5x', '1.5'],
    ['1200+', '1200'],
    ['99,9%', '99,9'],
    ['500h+', '500'],
  ])('ends on the number exactly as written, so %s settles on the same text it has without motion', async (value, written) => {
    const { container } = renderWithProviders(<CountUp value={value} durationMs={SHORT_DURATION_MS} />);
    const wrapper = getWrapper(container);

    triggerIntersection(wrapper);

    await waitFor(() => expect(getNumber(wrapper).textContent).toBe(written), { timeout: SETTLE_TIMEOUT_MS });
    await new Promise((resolve) => setTimeout(resolve, SHORT_DURATION_MS));
    expect(getNumber(wrapper).textContent).toBe(written);
    expect(`${getNumber(wrapper).textContent}${getSuffix(wrapper)?.textContent ?? ''}`).toBe(value);
  });

  it('formats the numbers with the pt-BR separators while it counts', async () => {
    const { container } = renderWithProviders(<CountUp value="1200+" durationMs={300} />);
    const wrapper = getWrapper(container);
    const numberNode = getNumber(wrapper);
    const seen = new Set<string>();
    const observer = new MutationObserver(() => seen.add(numberNode.textContent ?? ''));
    observer.observe(numberNode, { childList: true, characterData: true, subtree: true });

    triggerIntersection(wrapper);
    await waitFor(() => expect(numberNode.textContent).toBe('1200'), { timeout: SETTLE_TIMEOUT_MS });
    observer.disconnect();

    expect([...seen].some((text) => /^\d\.\d{3}$/.test(text))).toBe(true);
  });

  it('keeps the number box as wide as its widest text, so the box does not jump when the count ends', () => {
    const { container } = renderWithProviders(<CountUp value="1200+" />);

    expect(getNumber(getWrapper(container)).style.minWidth).toBe('5ch');
  });

  it('can unmount while counting without errors', () => {
    const { container, unmount } = renderWithProviders(<CountUp value="85%" durationMs={SHORT_DURATION_MS * 10} />);

    triggerIntersection(getWrapper(container));

    expect(() => unmount()).not.toThrow();
  });

  it('is also the default export', () => {
    expect(DefaultCountUp).toBe(CountUp);
  });
});
