import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../../test/render';
import { MotionArrow } from './MotionArrow';

const state = vi.hoisted(() => ({ isMotionAllowed: true }));

vi.mock('../../hooks/useMotionAllowed', () => ({ useMotionAllowed: () => state.isMotionAllowed }));

function arrow(direction?: 'left' | 'right'): SVGElement {
  const { container } = renderWithProviders(<MotionArrow direction={direction} />);
  return container.querySelector('svg') as unknown as SVGElement;
}

describe('MotionArrow', () => {
  it('is hidden from assistive technology', () => {
    state.isMotionAllowed = true;

    expect(arrow()).toHaveAttribute('aria-hidden', 'true');
  });

  it('settles toward where it points under the pointer and on keyboard focus, when motion is allowed', () => {
    state.isMotionAllowed = true;

    const right = arrow('right').getAttribute('class') ?? '';
    expect(right).toContain('group-hover:translate-x-1');
    expect(right).toContain('group-focus-visible:translate-x-1');
  });

  it('points left and settles to the left for the back link', () => {
    state.isMotionAllowed = true;

    const left = arrow('left').getAttribute('class') ?? '';

    expect(left).toContain('group-hover:-translate-x-1');
    expect(left).toContain('group-focus-visible:-translate-x-1');
  });

  it('does not move at all when motion is off, with the pointer or with the keyboard', () => {
    state.isMotionAllowed = false;

    const off = arrow('right').getAttribute('class') ?? '';

    expect(off).not.toMatch(/translate|transition/);
  });
});
