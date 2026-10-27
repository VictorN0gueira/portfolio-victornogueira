import { waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { findAccentElements } from '../../test/accent';
import { REDUCED_MOTION_QUERY, stubMatchMedia } from '../../test/matchMedia';
import { renderWithProviders } from '../../test/render';
import { AnimatedCurrency } from './AnimatedCurrency';

const NBSP = String.fromCharCode(0x00a0);
// A whole count takes 0.55s: waiting this long is waiting past the end of any count.
const PAST_A_COUNT_MS = 3000;

/** Renders the number alone: the root of the component is the only child of the container. */
function renderAmount(value: number, className?: string) {
  const view = renderWithProviders(<AnimatedCurrency value={value} className={className} />);
  const element = (): HTMLElement => view.container.firstElementChild as HTMLElement;
  const text = (): string => element().textContent ?? '';
  const change = (next: number) => view.rerender(<AnimatedCurrency value={next} className={className} />);
  return { ...view, element, text, change };
}

describe('AnimatedCurrency without motion', () => {
  it('shows the value in reais, with the non breaking space of the pt-BR format', () => {
    stubMatchMedia({ [REDUCED_MOTION_QUERY]: true });

    const amount = renderAmount(78000);

    expect(amount.text()).toBe(`R$${NBSP}78.000`);
  });

  it('jumps to a new value at once, in the same render', () => {
    stubMatchMedia({ [REDUCED_MOTION_QUERY]: true });
    const amount = renderAmount(78000);

    amount.change(31200);

    expect(amount.text()).toBe(`R$${NBSP}31.200`);
  });

  it('shows R$ 0 for zero', () => {
    stubMatchMedia({ [REDUCED_MOTION_QUERY]: true });

    expect(renderAmount(0).text()).toBe(`R$${NBSP}0`);
  });
});

describe('AnimatedCurrency with motion', () => {
  it('shows the value at once on the first render, it never counts up from zero on mount', () => {
    stubMatchMedia();

    expect(renderAmount(62400).text()).toBe(`R$${NBSP}62.400`);
  });

  it('does not flash the new value on the render that changes it: the old number is still on screen', () => {
    stubMatchMedia();
    const amount = renderAmount(78000);

    amount.change(31200);

    expect(amount.text()).toBe(`R$${NBSP}78.000`);
  });

  it('counts to the new value and ends exactly on it', async () => {
    stubMatchMedia();
    const amount = renderAmount(78000);

    amount.change(31200);

    await waitFor(() => expect(amount.text()).toBe(`R$${NBSP}31.200`), { timeout: PAST_A_COUNT_MS });
  });

  it('starts the next count from the number on screen, and still ends on the last value', async () => {
    stubMatchMedia();
    const amount = renderAmount(0);

    amount.change(100000);
    amount.change(50000);

    await waitFor(() => expect(amount.text()).toBe(`R$${NBSP}50.000`), { timeout: PAST_A_COUNT_MS });
  });
});

describe('AnimatedCurrency markup', () => {
  it('is hidden from assistive tech, because a status region speaks the final value once', () => {
    stubMatchMedia();

    expect(renderAmount(78000).element()).toHaveAttribute('aria-hidden', 'true');
  });

  it('uses tabular figures and never wraps, with or without motion', () => {
    for (const isReduced of [true, false]) {
      stubMatchMedia({ [REDUCED_MOTION_QUERY]: isReduced });
      const amount = renderAmount(78000);

      expect(amount.element()).toHaveClass('tabular-nums', 'whitespace-nowrap');
      amount.unmount();
    }
  });

  it('puts the className on one element only, so an accent class is never counted twice', () => {
    stubMatchMedia();

    const amount = renderAmount(78000, 'text-vn-accent');

    expect(findAccentElements(amount.container)).toHaveLength(1);
  });

  it('renders the same element while the value changes, so React never rewrites the counting text', () => {
    stubMatchMedia();
    const amount = renderAmount(78000);
    const element = amount.element();

    amount.change(31200);

    expect(amount.element()).toBe(element);
  });
});
