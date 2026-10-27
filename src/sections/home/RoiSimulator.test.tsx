import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { buildQuoteMessage } from '../../lib/roi';
import {
  CTA_NAME,
  DEFAULT_INPUT,
  NBSP,
  figuresOf,
  getAmounts,
  getCta,
  getRadio,
  getRate,
  getSlider,
  renderSimulator,
} from './RoiSimulator.helpers';
import { MAX_HOURLY_RATE } from './roiInput';

const DEFAULT_COST = `R$${NBSP}78.000`;
const DEFAULT_SAVINGS = `R$${NBSP}62.400`;
const ONE_PERSON_COST = `R$${NBSP}31.200`;
const ZERO = `R$${NBSP}0`;

describe('RoiSimulator results', () => {
  it('shows the cost and the savings of the default values, with motion off', () => {
    renderSimulator();

    expect(getAmounts(DEFAULT_COST)).toHaveLength(1);
    expect(getAmounts(DEFAULT_SAVINGS)).toHaveLength(1);
  });

  it('counts an emptied hourly rate as 0 in both numbers and never shows NaN', () => {
    const { container } = renderSimulator();

    fireEvent.change(getRate(), { target: { value: '' } });

    expect(getAmounts(ZERO)).toHaveLength(2);
    expect(container.textContent).not.toContain('NaN');
    expect(document.body.textContent).not.toContain('NaN');
  });

  it('recomputes with one person: R$ 31.200 a year', () => {
    renderSimulator();

    fireEvent.click(getRadio('1 pessoa'));

    expect(getAmounts(ONE_PERSON_COST)).toHaveLength(1);
  });

  it('recomputes when the slider moves, with the shared formula', () => {
    renderSimulator();

    fireEvent.change(getSlider(), { target: { value: '40' } });

    const { cost, savings } = figuresOf({ ...DEFAULT_INPUT, hoursPerWeek: 40 });
    expect(getAmounts(cost)).toHaveLength(1);
    expect(getAmounts(savings)).toHaveLength(1);
  });

  it('recomputes when the hourly rate changes', () => {
    renderSimulator();

    fireEvent.change(getRate(), { target: { value: '100' } });

    const { cost, savings } = figuresOf({ ...DEFAULT_INPUT, hourlyRate: 100 });
    expect(getAmounts(cost)).toHaveLength(1);
    expect(getAmounts(savings)).toHaveLength(1);
  });

  it('counts a negative hourly rate as 0, never NaN or a negative amount', () => {
    renderSimulator();

    fireEvent.change(getRate(), { target: { value: '-5' } });

    expect(getAmounts(ZERO)).toHaveLength(2);
    expect(document.body.textContent).not.toMatch(/NaN|-\d/);
  });

  it('counts a rate that overflows to infinity as 0', () => {
    renderSimulator();

    fireEvent.change(getRate(), { target: { value: '1e999' } });

    expect(getAmounts(ZERO)).toHaveLength(2);
    expect(document.body.textContent).not.toMatch(/NaN|Infinity|∞/);
  });

  it('computes an absurd rate at the cap, so the biggest number stays one the panel can draw', () => {
    renderSimulator();

    fireEvent.change(getRate(), { target: { value: '99999999999' } });

    const { cost, savings } = figuresOf({ ...DEFAULT_INPUT, hourlyRate: MAX_HOURLY_RATE });
    expect(getAmounts(cost)).toHaveLength(1);
    expect(getAmounts(savings)).toHaveLength(1);
  });

  it('does not rewrite what the visitor types: a negative text stays in the field, only the result counts it as 0', () => {
    renderSimulator();

    fireEvent.change(getRate(), { target: { value: '-5' } });

    expect(getRate()).toHaveValue(-5);
  });

  it('shows the note that explains the estimate', () => {
    renderSimulator();

    expect(
      screen.getByText('Considera 80% do tempo automatizado. É uma estimativa, o número real sai do diagnóstico.'),
    ).toBeInTheDocument();
  });
});

describe('RoiSimulator call to action', () => {
  it('sends the exact quote message of the default values', () => {
    const onQuoteRequest = vi.fn();
    renderSimulator({ onQuoteRequest });

    fireEvent.click(getCta());

    expect(onQuoteRequest).toHaveBeenCalledTimes(1);
    expect(onQuoteRequest).toHaveBeenCalledWith(buildQuoteMessage(DEFAULT_INPUT));
  });

  it('does not call it before the visitor clicks', () => {
    const onQuoteRequest = vi.fn();
    renderSimulator({ onQuoteRequest });

    expect(onQuoteRequest).not.toHaveBeenCalled();
  });

  it('sends the message of the slider value after the slider moved', () => {
    const onQuoteRequest = vi.fn();
    renderSimulator({ onQuoteRequest });

    fireEvent.change(getSlider(), { target: { value: '30' } });
    fireEvent.click(getCta());

    expect(onQuoteRequest).toHaveBeenCalledWith(buildQuoteMessage({ ...DEFAULT_INPUT, hoursPerWeek: 30 }));
  });

  it('sends the message of the team that was chosen', () => {
    const onQuoteRequest = vi.fn();
    renderSimulator({ onQuoteRequest });

    fireEvent.click(getRadio('mais de 10 pessoas'));
    fireEvent.click(getCta());

    expect(onQuoteRequest).toHaveBeenCalledWith(buildQuoteMessage({ ...DEFAULT_INPUT, teamMultiplier: 15 }));
  });

  it('sends the message of the hourly rate that was typed', () => {
    const onQuoteRequest = vi.fn();
    renderSimulator({ onQuoteRequest });

    fireEvent.change(getRate(), { target: { value: '120' } });
    fireEvent.click(getCta());

    expect(onQuoteRequest).toHaveBeenCalledWith(buildQuoteMessage({ ...DEFAULT_INPUT, hourlyRate: 120 }));
  });

  it('sends a cost of R$ 0 for an emptied or negative rate, with the sanitizing of the shared formula', () => {
    const onQuoteRequest = vi.fn();
    renderSimulator({ onQuoteRequest });

    fireEvent.change(getRate(), { target: { value: '' } });
    fireEvent.click(getCta());
    fireEvent.change(getRate(), { target: { value: '-20' } });
    fireEvent.click(getCta());

    const zeroRate = buildQuoteMessage({ ...DEFAULT_INPUT, hourlyRate: 0 });
    expect(onQuoteRequest).toHaveBeenNthCalledWith(1, zeroRate);
    expect(onQuoteRequest).toHaveBeenNthCalledWith(2, zeroRate);
    expect(zeroRate).toContain(`R$${NBSP}0`);
  });

  it('is one button with the final copy of the brief', () => {
    renderSimulator();

    expect(screen.getAllByRole('button')).toHaveLength(1);
    expect(getCta()).toHaveTextContent(CTA_NAME);
  });
});
