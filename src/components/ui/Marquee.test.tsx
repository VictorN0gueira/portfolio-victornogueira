import { screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { REDUCED_MOTION_QUERY, stubMatchMedia } from '../../test/matchMedia';
import { renderWithProviders } from '../../test/render';
import { Marquee } from './Marquee';

const A11Y_STORAGE_KEY = 'a11y-preferences';
const LABEL = 'tecnologias que a gente usa';

function renderThreeItems(durationS?: number) {
  return renderWithProviders(
    <Marquee ariaLabel={LABEL} durationS={durationS}>
      <span data-testid="item">n8n</span>
      <span data-testid="item">react</span>
      <span data-testid="item">supabase</span>
    </Marquee>,
  );
}

/** The two copies of the items, in the order they sit in the track. */
function getGroups(container: HTMLElement): HTMLElement[] {
  const track = container.querySelector('.vn-marquee') as HTMLElement;
  return [...track.children] as HTMLElement[];
}

describe('Marquee with motion allowed', () => {
  beforeEach(() => {
    stubMatchMedia();
  });

  it('renders every child twice', () => {
    renderThreeItems();

    expect(screen.getAllByTestId('item')).toHaveLength(6);
  });

  it('hides the second copy from assistive tech and leaves the first one exposed', () => {
    const { container } = renderThreeItems();
    const [first, second] = getGroups(container);

    expect(first).not.toHaveAttribute('aria-hidden');
    expect(second).toHaveAttribute('aria-hidden', 'true');
  });

  it('is a named region so the scrolling list is a landmark', () => {
    renderThreeItems();

    expect(screen.getByRole('region', { name: LABEL })).toBeInTheDocument();
  });

  it('keeps keyboard users out of the duplicate copy', () => {
    const { container } = renderWithProviders(
      <Marquee ariaLabel={LABEL}>
        <a href="#um">um</a>
        <button type="button">dois</button>
        <input aria-label="tres" />
        <span tabIndex={0}>quatro</span>
        <span>cinco</span>
      </Marquee>,
    );
    const [first, second] = getGroups(container);
    const focusable = 'a[href], button, input, [tabindex]';

    const firstCopy = [...first.querySelectorAll<HTMLElement>(focusable)];
    const duplicate = [...second.querySelectorAll<HTMLElement>(focusable)];

    expect(duplicate).toHaveLength(4);
    expect(duplicate.every((element) => element.getAttribute('tabindex') === '-1')).toBe(true);
    expect(firstCopy.filter((element) => element.getAttribute('tabindex') === '-1')).toHaveLength(0);
  });

  it('does not turn a natively focusable control of the first copy into a negative tab stop', () => {
    renderWithProviders(
      <Marquee ariaLabel={LABEL}>
        <a href="#um">um</a>
      </Marquee>,
    );

    const [original] = screen.getAllByRole('link', { hidden: true });

    expect(original).not.toHaveAttribute('tabindex');
  });

  it('moves a track that is the .vn-marquee layer inside a clipped frame', () => {
    const { container } = renderThreeItems();
    const frame = screen.getByRole('region', { name: LABEL });
    const track = container.querySelector('.vn-marquee') as HTMLElement;

    expect(frame).toHaveClass('vn-marquee-frame');
    expect(frame).toContainElement(track);
    expect(track.children).toHaveLength(2);
  });

  it('sets the loop duration through a CSS variable, 32s by default', () => {
    const { container } = renderThreeItems();

    expect((container.querySelector('.vn-marquee') as HTMLElement).style.getPropertyValue('--vn-marquee-duration')).toBe('32s');
  });

  it('uses the given duration', () => {
    const { container } = renderThreeItems(20);

    expect((container.querySelector('.vn-marquee') as HTMLElement).style.getPropertyValue('--vn-marquee-duration')).toBe('20s');
  });

  it('merges a consumer className on the frame', () => {
    renderWithProviders(
      <Marquee ariaLabel={LABEL} className="py-4">
        <span>n8n</span>
      </Marquee>,
    );

    expect(screen.getByRole('region', { name: LABEL })).toHaveClass('py-4', 'vn-marquee-frame');
  });
});

describe('Marquee without motion', () => {
  afterEach(() => {
    localStorage.clear();
  });

  it('renders one copy when the system asks for reduced motion', () => {
    stubMatchMedia({ [REDUCED_MOTION_QUERY]: true });

    renderThreeItems();

    expect(screen.getAllByTestId('item')).toHaveLength(3);
  });

  it('renders one copy when the accessibility toggle paused animations', () => {
    stubMatchMedia();
    localStorage.setItem(A11Y_STORAGE_KEY, JSON.stringify({ noAnimations: true }));

    renderThreeItems();

    expect(screen.getAllByTestId('item')).toHaveLength(3);
  });

  it('lays the single copy out in a wrapping row, with no animated track and nothing hidden', () => {
    stubMatchMedia({ [REDUCED_MOTION_QUERY]: true });

    const { container } = renderThreeItems();
    const region = screen.getByRole('region', { name: LABEL });

    expect(region).toHaveClass('flex-wrap');
    expect(container.querySelector('.vn-marquee')).toBeNull();
    expect(container.querySelector('[aria-hidden="true"]')).toBeNull();
  });
});
