import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { buildQuoteMessage } from '../../lib/roi';
import {
  CTA_NAME,
  DEFAULT_COST,
  DEFAULT_INPUT,
  DEFAULT_SAVINGS,
  NBSP,
  RATE_CAP_NOTE,
  figuresOf,
  getAmounts,
  getCta,
  getRadio,
  getRate,
  getSlider,
  renderSimulator,
} from '../../test/roiSimulatorKit';
import { MAX_HOURLY_RATE } from './roiInput';

const INFINITY_SIGN = String.fromCharCode(0x221e);
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

  it('counts a non finite value that the field hands over as 0, never NaN or Infinity', () => {
    renderSimulator();

    fireEvent.change(getRate(), { target: { value: '1e999' } });

    expect(getAmounts(ZERO)).toHaveLength(2);
    expect(document.body.textContent).not.toMatch(new RegExp(`NaN|Infinity|${INFINITY_SIGN}`));
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

/** Stubs what the browser reports for a number field: jsdom never flags incomplete text such as "12." as bad input. */
function reportBadInput(input: HTMLInputElement, isBadInput: boolean): void {
  Object.defineProperty(input, 'validity', { value: { badInput: isBadInput }, configurable: true });
}

describe('RoiSimulator incomplete rate text', () => {
  it('keeps the last complete rate while the browser reports text it cannot read yet, so the results do not fall to R$ 0', () => {
    renderSimulator();
    const rate = getRate();

    reportBadInput(rate, true);
    fireEvent.change(rate, { target: { value: '' } });

    expect(getAmounts(DEFAULT_COST)).toHaveLength(1);
    expect(getAmounts(DEFAULT_SAVINGS)).toHaveLength(1);
  });

  it('keeps what the visitor typed in the field: the shown text is never dropped with the incomplete value', () => {
    renderSimulator();
    const rate = getRate();

    reportBadInput(rate, true);
    fireEvent.change(rate, { target: { value: '' } });
    reportBadInput(rate, false);
    fireEvent.change(rate, { target: { value: '12.5' } });

    expect(getRate()).toHaveValue(12.5);
  });

  it('counts the number again as soon as the text is complete', () => {
    renderSimulator();
    const rate = getRate();

    reportBadInput(rate, true);
    fireEvent.change(rate, { target: { value: '' } });
    reportBadInput(rate, false);
    fireEvent.change(rate, { target: { value: '12.5' } });

    const { cost, savings } = figuresOf({ ...DEFAULT_INPUT, hourlyRate: 12.5 });
    expect(getAmounts(cost)).toHaveLength(1);
    expect(getAmounts(savings)).toHaveLength(1);
  });

  it('still counts a field that the browser reports as complete and empty as 0', () => {
    renderSimulator();
    const rate = getRate();

    reportBadInput(rate, false);
    fireEvent.change(rate, { target: { value: '' } });

    expect(getAmounts(`R$${NBSP}0`)).toHaveLength(2);
  });

  // Chromium reports no value and badInput for "1e999", so typed key by key the count stays on the last readable
  // text ("1e99", capped at R$ 5.000) and does not fall to R$ 0: the cost of the rule above.
  it('keeps the last readable count for a huge exponent that the field cannot read', () => {
    renderSimulator();
    const rate = getRate();

    fireEvent.change(rate, { target: { value: '1e99' } });
    reportBadInput(rate, true);
    fireEvent.change(rate, { target: { value: '' } });

    const { cost, savings } = figuresOf({ ...DEFAULT_INPUT, hourlyRate: MAX_HOURLY_RATE });
    expect(getAmounts(cost)).toHaveLength(1);
    expect(getAmounts(savings)).toHaveLength(1);
    expect(getAmounts(RATE_CAP_NOTE)).toHaveLength(1);
  });
});

/**
 * Clears text that the browser had called incomplete. The value was '' already (with badInput on), so it stays '' and
 * React never calls onChange: only the input event says that the field is now really empty.
 */
function clearIncompleteText(rate: HTMLInputElement): void {
  reportBadInput(rate, false);
  fireEvent.input(rate, { target: { value: '' } });
}

describe('RoiSimulator field cleared after incomplete text', () => {
  it('counts the field as 0 when "12." is cleared, instead of keeping the 12', () => {
    renderSimulator();
    const rate = getRate();

    fireEvent.change(rate, { target: { value: '12' } });
    reportBadInput(rate, true);
    fireEvent.change(rate, { target: { value: '' } });
    const { cost } = figuresOf({ ...DEFAULT_INPUT, hourlyRate: 12 });
    expect(getAmounts(cost)).toHaveLength(1);

    clearIncompleteText(rate);

    expect(getAmounts(`R$${NBSP}0`)).toHaveLength(2);
    expect(getAmounts(cost)).toHaveLength(0);
  });

  it('counts the field as 0 when "5-" is cleared too', () => {
    renderSimulator();
    const rate = getRate();

    fireEvent.change(rate, { target: { value: '5' } });
    reportBadInput(rate, true);
    fireEvent.change(rate, { target: { value: '' } });
    const { cost, savings } = figuresOf({ ...DEFAULT_INPUT, hourlyRate: 5 });
    expect(getAmounts(cost)).toHaveLength(1);
    expect(getAmounts(savings)).toHaveLength(1);

    clearIncompleteText(rate);

    expect(getAmounts(`R$${NBSP}0`)).toHaveLength(2);
  });

  it('takes the cap note away when "6000." is cleared', () => {
    renderSimulator();
    const rate = getRate();

    fireEvent.change(rate, { target: { value: '6000' } });
    reportBadInput(rate, true);
    fireEvent.change(rate, { target: { value: '' } });
    expect(getAmounts(RATE_CAP_NOTE)).toHaveLength(1);

    clearIncompleteText(rate);

    expect(getAmounts(RATE_CAP_NOTE)).toHaveLength(0);
    expect(rate).not.toHaveAttribute('aria-describedby');
    expect(getAmounts(`R$${NBSP}0`)).toHaveLength(2);
  });

  it('sends the rate of the cleared field, 0, and not the stale one', () => {
    const onQuoteRequest = vi.fn();
    renderSimulator({ onQuoteRequest });
    const rate = getRate();

    fireEvent.change(rate, { target: { value: '12' } });
    reportBadInput(rate, true);
    fireEvent.change(rate, { target: { value: '' } });
    clearIncompleteText(rate);
    fireEvent.click(getCta());

    expect(onQuoteRequest).toHaveBeenCalledWith(buildQuoteMessage({ ...DEFAULT_INPUT, hourlyRate: 0 }));
  });

  it('counts a typed number once when both the change and the input handler run for it', () => {
    renderSimulator();

    // An input event that changes the value reaches both onChange and onInput, as a keystroke does in a browser.
    fireEvent.input(getRate(), { target: { value: '15' } });

    const { cost, savings } = figuresOf({ ...DEFAULT_INPUT, hourlyRate: 15 });
    expect(getAmounts(cost)).toHaveLength(1);
    expect(getAmounts(savings)).toHaveLength(1);
    expect(getRate()).toHaveValue(15);
  });
});

describe('RoiSimulator rate cap note', () => {
  it('says under the field that a rate above R$ 5.000 is counted at R$ 5.000, and links the note to the field', () => {
    renderSimulator();

    fireEvent.change(getRate(), { target: { value: '6000' } });

    const [note] = getAmounts(RATE_CAP_NOTE);
    expect(note).toBeInTheDocument();
    expect(note.id).not.toBe('');
    expect(getRate()).toHaveAttribute('aria-describedby', note.id);
  });

  it('computes and sends the capped rate, not the typed one', () => {
    const onQuoteRequest = vi.fn();
    renderSimulator({ onQuoteRequest });

    fireEvent.change(getRate(), { target: { value: '6000' } });
    fireEvent.click(getCta());

    const { cost, savings } = figuresOf({ ...DEFAULT_INPUT, hourlyRate: MAX_HOURLY_RATE });
    expect(getAmounts(cost)).toHaveLength(1);
    expect(getAmounts(savings)).toHaveLength(1);
    expect(onQuoteRequest).toHaveBeenCalledWith(buildQuoteMessage({ ...DEFAULT_INPUT, hourlyRate: MAX_HOURLY_RATE }));
  });

  it('has no cap note at the default rate, at the cap itself or for text that counts as 0', () => {
    renderSimulator();

    expect(getAmounts(RATE_CAP_NOTE)).toHaveLength(0);
    for (const text of ['5000', '1e999', '-1', '']) {
      fireEvent.change(getRate(), { target: { value: text } });

      expect(getAmounts(RATE_CAP_NOTE), text).toHaveLength(0);
    }
  });

  it('has no description at the cap itself or for an empty field, only the cap or the issue notes describe it', () => {
    renderSimulator();

    for (const text of ['5000', '']) {
      fireEvent.change(getRate(), { target: { value: text } });

      expect(getRate(), text).not.toHaveAttribute('aria-describedby');
    }
  });

  it('takes the note away when the rate comes back under the cap', () => {
    renderSimulator();

    fireEvent.change(getRate(), { target: { value: '6000' } });
    fireEvent.change(getRate(), { target: { value: '4000' } });

    expect(getAmounts(RATE_CAP_NOTE)).toHaveLength(0);
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
