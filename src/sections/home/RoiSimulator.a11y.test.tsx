import { act, fireEvent, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TEAM_OPTIONS } from '../../lib/roi';
import { findAccentElements } from '../../test/accent';
import {
  A11Y_STORAGE_KEY,
  DEFAULT_COST,
  DEFAULT_INPUT,
  DEFAULT_SAVINGS,
  NBSP,
  RATE_CAP_NOTE,
  SLIDER_NAME,
  STATUS_DEBOUNCE_MS,
  figuresOf,
  getAmounts,
  getRadio,
  getRate,
  getSlider,
  getStatus,
  getTeamGroup,
  renderSimulator,
} from '../../test/roiSimulatorKit';

const HEADING = 'Quanto o trabalho manual custa por ano';
const DEFAULT_STATUS = `Custo anual hoje ${DEFAULT_COST}. Economia estimada por ano ${DEFAULT_SAVINGS}.`;
const ONE_PERSON_STATUS = `Custo anual hoje R$${NBSP}31.200. Economia estimada por ano R$${NBSP}24.960.`;
const EM_DASH = String.fromCharCode(0x2014);
const EN_DASH = String.fromCharCode(0x2013);

describe('RoiSimulator structure', () => {
  it('has exactly one h2, the heading, and the section is a region named by it', () => {
    renderSimulator();

    const headings = screen.getAllByRole('heading');

    expect(headings).toHaveLength(1);
    expect(headings[0].tagName).toBe('H2');
    expect(headings[0]).toHaveTextContent(HEADING);
    expect(screen.getByRole('region', { name: HEADING })).toBeInTheDocument();
  });

  it('shows the kicker and the sub line of the brief', () => {
    renderSimulator();

    expect(screen.getByText('simulador')).toBeInTheDocument();
    expect(screen.getByText('Mexe nos valores e veja quanto dá pra recuperar automatizando.')).toBeInTheDocument();
  });

  it('writes no dash and no slash separator in anything it shows', () => {
    const { container } = renderSimulator();
    const text = container.textContent ?? '';

    expect(text).not.toContain(EM_DASH);
    expect(text).not.toContain(EN_DASH);
    expect(text).not.toMatch(/\s\/\s/);
  });
});

describe('RoiSimulator controls', () => {
  it('gives every control an accessible name: the slider, the team group and its radios, the rate and the button', () => {
    renderSimulator();

    expect(getSlider()).toBeInTheDocument();
    expect(getTeamGroup()).toBeInTheDocument();
    for (const { label } of TEAM_OPTIONS) expect(getRadio(label)).toBeInTheDocument();
    expect(getRate()).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Quero automatizar esse processo' })).toBeInTheDocument();
  });

  it('ties the slider to a real label through htmlFor', () => {
    renderSimulator();

    const label = screen.getByText(SLIDER_NAME);

    expect(label.tagName).toBe('LABEL');
    expect(label).toHaveAttribute('for', getSlider().id);
    expect(getSlider().id).not.toBe('');
  });

  it('ties the hourly rate to a real label through htmlFor', () => {
    renderSimulator();

    const label = screen.getByText('Valor da hora (R$)');

    expect(label.tagName).toBe('LABEL');
    expect(label).toHaveAttribute('for', getRate().id);
  });

  it('is a native range from 1 to 80 hours in steps of 1, at 12 by default', () => {
    renderSimulator();
    const slider = getSlider();

    expect(slider).toHaveAttribute('type', 'range');
    expect(slider).toHaveAttribute('min', '1');
    expect(slider).toHaveAttribute('max', '80');
    expect(slider).toHaveAttribute('step', '1');
    expect(slider).toHaveValue('12');
  });

  it('reads the value in pt-BR to a screen reader, with the singular for one hour', () => {
    renderSimulator();

    expect(getSlider()).toHaveAttribute('aria-valuetext', '12 horas por semana');
    fireEvent.change(getSlider(), { target: { value: '40' } });
    expect(getSlider()).toHaveAttribute('aria-valuetext', '40 horas por semana');
    fireEvent.change(getSlider(), { target: { value: '1' } });
    expect(getSlider()).toHaveAttribute('aria-valuetext', '1 hora por semana');
  });

  it('shows the current value next to the label, hidden from assistive tech because the slider already says it', () => {
    renderSimulator();

    const shown = screen.getByText('12 h');
    expect(shown).toHaveAttribute('aria-hidden', 'true');
    fireEvent.change(getSlider(), { target: { value: '33' } });
    expect(screen.getByText('33 h')).toBeInTheDocument();
    expect(screen.queryByText('12 h')).toBeNull();
  });

  it('is not an output or a status element, so the slider never makes a screen reader speak on every tick', () => {
    const { container } = renderSimulator();

    expect(container.querySelector('output')).toBeNull();
    expect(screen.getAllByRole('status')).toHaveLength(1);
  });

  it('draws the filled part of the track from a percentage on the input', () => {
    renderSimulator();

    expect(getSlider().style.getPropertyValue('--vn-range-fill')).toBe(`${((12 - 1) / 79) * 100}%`);
    fireEvent.change(getSlider(), { target: { value: '1' } });
    expect(getSlider().style.getPropertyValue('--vn-range-fill')).toBe('0%');
    fireEvent.change(getSlider(), { target: { value: '80' } });
    expect(getSlider().style.getPropertyValue('--vn-range-fill')).toBe('100%');
  });

  it('is a number field for decimals, from 0, with any step, and starts at 50', () => {
    renderSimulator();
    const rate = getRate();

    expect(rate).toHaveAttribute('type', 'number');
    expect(rate).toHaveAttribute('inputmode', 'decimal');
    expect(rate).toHaveAttribute('min', '0');
    expect(rate).toHaveAttribute('step', 'any');
    expect(rate).toHaveValue(50);
  });
});

describe('RoiSimulator team radios', () => {
  it('lists the four options of the shared formula as native radios of one group, the second chosen', () => {
    renderSimulator();
    const radios = within(getTeamGroup()).getAllByRole('radio');

    expect(radios.map((radio) => radio.getAttribute('type'))).toEqual(['radio', 'radio', 'radio', 'radio']);
    expect(radios.map((radio) => (radio as HTMLInputElement).value)).toEqual(TEAM_OPTIONS.map((option) => option.label));
    expect(new Set(radios.map((radio) => (radio as HTMLInputElement).name)).size).toBe(1);
    expect(getRadio('2 a 3 pessoas')).toBeChecked();
    expect(getRadio('1 pessoa')).not.toBeChecked();
  });

  it('chooses an option on click and unchecks the one before', () => {
    renderSimulator();

    fireEvent.click(getRadio('4 a 10 pessoas'));

    expect(getRadio('4 a 10 pessoas')).toBeChecked();
    expect(getRadio('2 a 3 pessoas')).not.toBeChecked();
  });

  it('moves the focus and the choice together with the arrow keys, wrapping at the ends', async () => {
    const { user } = renderSimulator();
    act(() => getRadio('2 a 3 pessoas').focus());

    await user.keyboard('{ArrowRight}');
    expect(getRadio('4 a 10 pessoas')).toBeChecked();
    expect(getRadio('4 a 10 pessoas')).toHaveFocus();

    await user.keyboard('{ArrowDown}');
    expect(getRadio('mais de 10 pessoas')).toBeChecked();

    await user.keyboard('{ArrowRight}');
    expect(getRadio('1 pessoa')).toBeChecked();
    expect(getRadio('1 pessoa')).toHaveFocus();

    await user.keyboard('{ArrowLeft}');
    expect(getRadio('mais de 10 pessoas')).toBeChecked();

    await user.keyboard('{ArrowUp}');
    expect(getRadio('4 a 10 pessoas')).toBeChecked();
  });

  it('jumps to the first option with Home and to the last with End, choosing it', async () => {
    const { user } = renderSimulator();
    act(() => getRadio('2 a 3 pessoas').focus());

    await user.keyboard('{End}');
    expect(getRadio('mais de 10 pessoas')).toBeChecked();
    expect(getRadio('mais de 10 pessoas')).toHaveFocus();

    await user.keyboard('{Home}');
    expect(getRadio('1 pessoa')).toBeChecked();
    expect(getRadio('1 pessoa')).toHaveFocus();
  });

  it('is a single tab stop between the slider and the rate: Tab goes slider, chosen radio, rate, button', async () => {
    const { user } = renderSimulator();
    act(() => getSlider().focus());

    await user.tab();
    expect(getRadio('2 a 3 pessoas')).toHaveFocus();
    await user.tab();
    expect(getRate()).toHaveFocus();
    await user.tab();
    expect(screen.getByRole('button', { name: 'Quero automatizar esse processo' })).toHaveFocus();
  });

  it('updates the result when an arrow key changes the team', async () => {
    const { user } = renderSimulator();
    act(() => getRadio('2 a 3 pessoas').focus());

    await user.keyboard('{ArrowLeft}');

    expect(getAmounts(`R$${NBSP}31.200`)).toHaveLength(1);
  });
});

describe('RoiSimulator accent', () => {
  it('has exactly one accent element, and it is the savings number', () => {
    const { container } = renderSimulator();

    const accents = findAccentElements(container);

    expect(accents).toHaveLength(1);
    expect(accents[0]).toBe(getAmounts(DEFAULT_SAVINGS)[0]);
    expect(accents[0]).toHaveClass('text-vn-accent');
  });

  it('keeps the same single accent while the numbers count', () => {
    const { container } = renderSimulator({ isMotionReduced: false });

    expect(findAccentElements(container)).toHaveLength(1);
    expect(findAccentElements(container)[0]).toBe(getAmounts(DEFAULT_SAVINGS)[0]);
  });
});

describe('RoiSimulator numbers for assistive tech', () => {
  it('hides every visible figure, with its label, from assistive tech', () => {
    renderSimulator();

    for (const figure of [getAmounts(DEFAULT_COST)[0], getAmounts(DEFAULT_SAVINGS)[0]]) {
      expect(figure.closest('[aria-hidden="true"]')).not.toBeNull();
    }
    expect(screen.getByText('Custo anual hoje').closest('[aria-hidden="true"]')).not.toBeNull();
    expect(screen.getByText('Economia estimada por ano').closest('[aria-hidden="true"]')).not.toBeNull();
  });

  it('exposes the final values in one polite, atomic, visually hidden status region', () => {
    renderSimulator();
    const status = getStatus();

    expect(status).toHaveAttribute('aria-live', 'polite');
    expect(status).toHaveAttribute('aria-atomic', 'true');
    expect(status).toHaveClass('sr-only');
    expect(status.textContent).toBe(DEFAULT_STATUS);
  });
});

describe('RoiSimulator status debounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const advance = (ms: number) => act(() => void vi.advanceTimersByTime(ms));

  it('waits until the visitor stops before it announces the new values', () => {
    renderSimulator();

    fireEvent.click(getRadio('1 pessoa'));
    advance(STATUS_DEBOUNCE_MS - 1);
    expect(getStatus().textContent).toBe(DEFAULT_STATUS);

    advance(1);
    expect(getStatus().textContent).toBe(ONE_PERSON_STATUS);
  });

  it('announces only the final values after a run of changes, in one update', () => {
    renderSimulator();
    const status = getStatus();
    const observer = new MutationObserver(() => undefined);
    observer.observe(status, { childList: true, characterData: true, subtree: true });

    for (const hours of ['15', '22', '31', '47']) {
      fireEvent.change(getSlider(), { target: { value: hours } });
      advance(STATUS_DEBOUNCE_MS - 100);
    }
    expect(observer.takeRecords()).toHaveLength(0);

    advance(STATUS_DEBOUNCE_MS);

    const { cost, savings } = figuresOf({ ...DEFAULT_INPUT, hoursPerWeek: 47 });
    expect(status.textContent).toBe(`Custo anual hoje ${cost}. Economia estimada por ano ${savings}.`);
    expect(observer.takeRecords().length).toBeGreaterThan(0);
    observer.disconnect();
  });

  it('shows the figures at their final value at once under reduced motion, while the status still waits', () => {
    renderSimulator({ isMotionReduced: true });

    fireEvent.click(getRadio('1 pessoa'));

    expect(getAmounts(`R$${NBSP}31.200`)).toHaveLength(1);
    expect(getStatus().textContent).toBe(DEFAULT_STATUS);
  });

  it('shows the figures at their final value at once when the site toggle turned animations off', () => {
    localStorage.setItem(A11Y_STORAGE_KEY, JSON.stringify({ noAnimations: true }));
    renderSimulator({ isMotionReduced: false });

    fireEvent.click(getRadio('1 pessoa'));

    expect(getAmounts(`R$${NBSP}31.200`)).toHaveLength(1);
    expect(getStatus().textContent).toBe(DEFAULT_STATUS);
    advance(STATUS_DEBOUNCE_MS);
    expect(getStatus().textContent).toBe(ONE_PERSON_STATUS);
    localStorage.clear();
  });

  it('adds the note about the rate cap to the same status region, once the values settle', () => {
    renderSimulator();

    fireEvent.change(getRate(), { target: { value: '6000' } });
    expect(getStatus().textContent).toBe(DEFAULT_STATUS);
    advance(STATUS_DEBOUNCE_MS);

    const { cost, savings } = figuresOf({ ...DEFAULT_INPUT, hourlyRate: 5000 });
    expect(getStatus().textContent).toBe(
      `Custo anual hoje ${cost}. Economia estimada por ano ${savings}. ${RATE_CAP_NOTE}`,
    );
    expect(screen.getAllByRole('status')).toHaveLength(1);
  });

  it('drops the note from the status again when the rate is back under the cap', () => {
    renderSimulator();

    fireEvent.change(getRate(), { target: { value: '6000' } });
    advance(STATUS_DEBOUNCE_MS);
    fireEvent.change(getRate(), { target: { value: '50' } });
    advance(STATUS_DEBOUNCE_MS);

    expect(getStatus().textContent).toBe(DEFAULT_STATUS);
  });

  it('reads R$ 0 and never NaN once an emptied rate settles', () => {
    renderSimulator();

    fireEvent.change(getRate(), { target: { value: '' } });
    advance(STATUS_DEBOUNCE_MS);

    expect(getStatus().textContent).toBe(
      `Custo anual hoje R$${NBSP}0. Economia estimada por ano R$${NBSP}0.`,
    );
  });
});
