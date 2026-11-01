import { screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { REDUCED_MOTION_QUERY, stubMatchMedia } from '../../test/matchMedia';
import { renderWithProviders } from '../../test/render';
import { Marquee as DefaultMarquee, Marquee } from './Marquee';
import { A11Y_STORAGE_KEY } from '../../contexts/AccessibilityContext';

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
        {/* eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- the fixture needs a custom tab stop to prove it is copied */}
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

  it('gives the frame its width from utilities (fill the parent, shrinkable), not from tokens.css', () => {
    renderThreeItems();

    expect(screen.getByRole('region', { name: LABEL })).toHaveClass('vn-marquee-frame', 'w-full', 'min-w-0', 'max-w-full');
  });

  it('lets a consumer className override the default width limit (mx-auto max-w-4xl)', () => {
    renderWithProviders(
      <Marquee ariaLabel={LABEL} className="mx-auto max-w-4xl">
        <span>n8n</span>
      </Marquee>,
    );
    const frame = screen.getByRole('region', { name: LABEL });

    expect(frame).toHaveClass('mx-auto', 'max-w-4xl', 'w-full', 'min-w-0');
    expect(frame).not.toHaveClass('max-w-full');
  });

  it('is also the default export', () => {
    expect(DefaultMarquee).toBe(Marquee);
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

describe('Marquee pause', () => {
  beforeEach(() => {
    stubMatchMedia();
  });

  function getTrack(container: HTMLElement): HTMLElement {
    return container.querySelector('.vn-marquee') as HTMLElement;
  }

  it('does not mark the track as paused by default', () => {
    const { container } = renderThreeItems();

    expect(getTrack(container)).not.toHaveAttribute('data-paused');
  });

  it('marks the track data-paused and holds the loop with an inline play state, which the unlayered .vn-marquee rule cannot override', () => {
    const { container } = renderWithProviders(
      <Marquee ariaLabel={LABEL} isPaused>
        <span>n8n</span>
      </Marquee>,
    );

    expect(getTrack(container)).toHaveAttribute('data-paused', 'true');
    expect(getTrack(container).style.animationPlayState).toBe('paused');
  });

  it('follows the isPaused prop both ways', () => {
    const { container, rerender } = renderWithProviders(
      <Marquee ariaLabel={LABEL} isPaused>
        <span>n8n</span>
      </Marquee>,
    );

    rerender(
      <Marquee ariaLabel={LABEL} isPaused={false}>
        <span>n8n</span>
      </Marquee>,
    );

    expect(getTrack(container)).not.toHaveAttribute('data-paused');
    expect(getTrack(container).style.animationPlayState).toBe('');
  });
});

describe('Marquee as a list', () => {
  beforeEach(() => {
    stubMatchMedia();
  });

  function renderList() {
    return renderWithProviders(
      <Marquee ariaLabel={LABEL} groupAs="ul">
        <li>n8n</li>
        <li>react</li>
      </Marquee>,
    );
  }

  it('renders the first group as a list the screen reader reads, and the duplicate as an aria-hidden list', () => {
    const { container } = renderList();
    const [first, second] = getGroups(container);

    expect(first.tagName).toBe('UL');
    expect(first).toHaveAttribute('role', 'list');
    expect(first).not.toHaveAttribute('aria-hidden');
    expect(second.tagName).toBe('UL');
    expect(second).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
  });

  it('keeps plain boxes as the groups by default', () => {
    const { container } = renderThreeItems();

    expect(getGroups(container).map((group) => group.tagName)).toEqual(['DIV', 'DIV']);
  });

  it('keeps the list in the region without motion, with the wrapping row on the list', () => {
    stubMatchMedia({ [REDUCED_MOTION_QUERY]: true });

    renderList();
    const region = screen.getByRole('region', { name: LABEL });

    expect(within(region).getByRole('list')).toHaveClass('flex-wrap');
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
  });

  it('keeps keyboard users out of the duplicate list', () => {
    const { container } = renderWithProviders(
      <Marquee ariaLabel={LABEL} groupAs="ul">
        <li>
          <a href="#um">um</a>
        </li>
      </Marquee>,
    );
    const [first, second] = getGroups(container);

    expect(second.querySelector('a')).toHaveAttribute('tabindex', '-1');
    expect(first.querySelector('a')).not.toHaveAttribute('tabindex');
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
