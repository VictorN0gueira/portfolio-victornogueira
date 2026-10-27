import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { TEAM_OPTIONS } from '../../lib/roi';
import { amountWidthEm } from './amountFit';
import {
  DEFAULT_COST,
  DEFAULT_SAVINGS,
  getAmounts,
  getCta,
  getRadio,
  getRate,
  getSlider,
  getTeamGroup,
  renderSimulator,
} from './RoiSimulator.helpers';

const FIT_EM = '--vn-fit-em';

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

  it('sizes the savings number from the brief clamp, capped by the width of its box divided by the width of its final text', () => {
    renderSimulator();
    const savings = getAmounts(DEFAULT_SAVINGS)[0];
    const box = savings.closest('.\\@container') as HTMLElement;

    expect(box.style.getPropertyValue(FIT_EM)).toBe(String(amountWidthEm(62400)));
    expect(savings.className).toContain('clamp(2.5rem,1.5rem+5vw,5rem)');
    expect(savings.className).toContain('cqi');
    expect(savings.className).toContain(`var(${FIT_EM})`);
    expect(savings).toHaveClass('tabular-nums');
  });

  it('keeps the tight line height on both numbers next to the font size, which twMerge drops if it comes before it', () => {
    renderSimulator();

    for (const text of [DEFAULT_COST, DEFAULT_SAVINGS]) {
      expect(getAmounts(text)[0]).toHaveClass('leading-none');
    }
  });

  it('sizes the cost number the same way, from its own final text and the smaller clamp', () => {
    renderSimulator();
    const cost = getAmounts(DEFAULT_COST)[0];
    const box = cost.closest('.\\@container') as HTMLElement;

    expect(box.style.getPropertyValue(FIT_EM)).toBe(String(amountWidthEm(78000)));
    expect(cost.className).toContain('clamp(1.75rem,1.2rem+2.4vw,2.75rem)');
    expect(cost.className).toContain(`var(${FIT_EM})`);
  });

  it('reserves the line box of the brief clamp for each number, so the panel keeps its height when the digits change', () => {
    renderSimulator();

    expect(getAmounts(DEFAULT_SAVINGS)[0].parentElement).toHaveClass('min-h-[clamp(2.5rem,1.5rem+5vw,5rem)]');
    expect(getAmounts(DEFAULT_COST)[0].parentElement).toHaveClass('min-h-[clamp(1.75rem,1.2rem+2.4vw,2.75rem)]');
  });

  it('measures the fit again from the new final text when the number of digits changes', () => {
    renderSimulator();
    const savings = getAmounts(DEFAULT_SAVINGS)[0];
    const box = savings.closest('.\\@container') as HTMLElement;

    fireEvent.change(getRate(), { target: { value: '5000' } });

    // 12 hours, 2 to 3 people, R$ 5.000 per hour: R$ 7.800.000 a year and R$ 6.240.000 saved.
    expect(box.style.getPropertyValue(FIT_EM)).toBe(String(amountWidthEm(6240000)));
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
