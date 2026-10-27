import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { TEAM_OPTIONS } from '../../lib/roi';
import { NBSP, getAmounts, getCta, getRadio, getRate, getSlider, getTeamGroup, renderSimulator } from './RoiSimulator.helpers';

const DEFAULT_COST = `R$${NBSP}78.000`;
const DEFAULT_SAVINGS = `R$${NBSP}62.400`;

describe('RoiSimulator wrapper', () => {
  it('puts the black section inside a rounded wrapper with side margins that grow with the screen', () => {
    const { container } = renderSimulator();
    const wrapper = container.firstElementChild as HTMLElement;

    expect(wrapper).toHaveClass('mx-2', 'min-[360px]:mx-3', 'md:mx-6', 'rounded-[clamp(24px,4vw,40px)]');
    expect(wrapper.querySelector('section')).toHaveAttribute('data-tone', 'black');
    expect(wrapper.children).toHaveLength(1);
  });

  it('clips the black background to the rounded corners of the wrapper, in its own stacking context', () => {
    const { container } = renderSimulator();

    expect(container.firstElementChild).toHaveClass('overflow-hidden', 'isolate');
  });
});

describe('RoiSimulator layout', () => {
  it('reveals the header and the body through one group each, with no observer per item', () => {
    const { container } = renderSimulator();
    const groups = container.querySelectorAll('[data-reveal-group]');

    expect(groups).toHaveLength(2);
    expect(screen.getByRole('heading', { level: 2 }).closest('[data-reveal-group]')).toBe(groups[0]);
    expect(getSlider().closest('[data-reveal-group]')).toBe(groups[1]);
    expect(getCta().closest('[data-reveal-group]')).toBe(groups[1]);
  });

  it('sets the controls and the results side by side from lg and stacked below it, in that order', () => {
    const { container } = renderSimulator();
    const body = container.querySelectorAll('[data-reveal-group]')[1] as HTMLElement;
    const [controls, results] = Array.from(body.children);

    expect(body).toHaveClass('grid', 'lg:grid-cols-2');
    expect(controls).toContainElement(getSlider());
    expect(controls).toContainElement(getRate());
    expect(results).toContainElement(getCta());
  });

  it('draws the results in a white at 5 percent panel with a white at 10 percent border', () => {
    renderSimulator();
    const panel = getAmounts(DEFAULT_COST)[0].closest('[class*="bg-vn-white/5"]');

    expect(panel).toHaveClass('border', 'border-vn-white/10');
    expect(panel).toContainElement(getAmounts(DEFAULT_SAVINGS)[0]);
    expect(panel).toContainElement(getCta());
  });

  it('sizes the savings number from clamp(2.5rem,1.5rem+5vw,5rem), capped by the width of its own box', () => {
    renderSimulator();
    const savings = getAmounts(DEFAULT_SAVINGS)[0];

    expect(savings.className).toContain('clamp(2.5rem,1.5rem+5vw,5rem)');
    expect(savings.className).toMatch(/cqi/);
    expect(savings).toHaveClass('tabular-nums');
    expect(savings.closest('.\\@container')).not.toBeNull();
  });

  it('sizes the cost number from the width of its box too, so the biggest value never overflows the panel', () => {
    renderSimulator();
    const cost = getAmounts(DEFAULT_COST)[0];

    expect(cost.className).toMatch(/cqi/);
    expect(cost).toHaveClass('tabular-nums');
    expect(cost.closest('.\\@container')).not.toBeNull();
  });

  it('sets the team options as a 2 by 2 grid below sm and a row from sm', () => {
    renderSimulator();

    expect(getTeamGroup()).toHaveClass('grid', 'grid-cols-2', 'sm:grid-cols-4');
    expect(getTeamGroup().querySelectorAll('input[type="radio"]')).toHaveLength(TEAM_OPTIONS.length);
  });

  it('makes every option at least 44px tall, with a selected style of white on ink', () => {
    renderSimulator();

    for (const { label } of TEAM_OPTIONS) {
      const box = getRadio(label).closest('label') as HTMLElement;
      expect(box).toHaveClass('min-h-11');
      expect(box.querySelector('[class*="peer-checked:bg-vn-white"]')).toHaveClass('peer-checked:text-vn-ink');
    }
  });

  it('keeps the chosen option and the button visible in forced colors, where the white backgrounds are dropped', () => {
    renderSimulator();
    const chosen = getRadio('2 a 3 pessoas').closest('label')?.querySelector('span');

    expect(chosen).toHaveClass('forced-colors:peer-checked:underline', 'forced-colors:peer-checked:decoration-2');
    expect(getCta()).toHaveClass('forced-colors:border', 'forced-colors:border-[color:ButtonText]');
  });

  it('makes the slider box and the rate field at least 44px tall', () => {
    renderSimulator();

    expect(getSlider()).toHaveClass('vn-range', 'h-11');
    expect(getRate()).toHaveClass('min-h-11');
  });

  it('draws the call to action as the dark (white) button, full width on a phone', () => {
    renderSimulator();

    expect(getCta()).toHaveClass('bg-vn-white', 'text-vn-black', 'w-full');
  });
});
