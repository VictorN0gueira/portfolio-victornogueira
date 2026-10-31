import { getDefaultNormalizer, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { formatBRL } from '../lib/format';
import { annualManualCost, annualSavings, type RoiInput } from '../lib/roi';
import { REDUCED_MOTION_QUERY, stubMatchMedia } from './matchMedia';
import { renderWithProviders } from './render';
import { RoiSimulator } from '../sections/home/RoiSimulator';

export const NBSP = String.fromCharCode(0x00a0);
export const SLIDER_NAME = 'Horas por semana em tarefas repetitivas';
const TEAM_NAME = 'Quantas pessoas fazem isso';
const RATE_NAME = 'Valor da hora (R$)';
export const CTA_NAME = 'Quero automatizar esse processo';
export const STATUS_DEBOUNCE_MS = 600;
export const DEFAULT_COST = `R$${NBSP}78.000`;
export const DEFAULT_SAVINGS = `R$${NBSP}62.400`;
/** The note that says the rate was capped, as the simulator writes it for the ceiling of R$ 5.000. */
export const RATE_CAP_NOTE = `A conta usa no máximo R$${NBSP}5.000 por hora.`;

/** The input the simulator starts with: 12 hours, 2 to 3 people (2.5) and R$ 50 per hour. */
export const DEFAULT_INPUT: RoiInput = { hoursPerWeek: 12, teamMultiplier: 2.5, hourlyRate: 50 };

// The default text matcher turns a non breaking space into a plain one, so it could never match a formatted amount.
const KEEP_SPACES = getDefaultNormalizer({ trim: false, collapseWhitespace: false });

interface RenderOptions {
  /** True (the default) stubs prefers-reduced-motion, so the numbers show their final value at once. */
  isMotionReduced?: boolean;
  /** Wraps the tree in StrictMode, so the effects run twice like in development. */
  strict?: boolean;
  onQuoteRequest?: (message: string) => void;
}

export function renderSimulator({ isMotionReduced = true, onQuoteRequest = vi.fn(), strict = false }: RenderOptions = {}) {
  stubMatchMedia({ [REDUCED_MOTION_QUERY]: isMotionReduced });
  const user = userEvent.setup();
  const view = renderWithProviders(<RoiSimulator onQuoteRequest={onQuoteRequest} />, { strict });
  return { user, onQuoteRequest, ...view };
}

/** Every element whose own text is exactly this one, spaces kept: a figure or a note, never the status sentence. */
export function getAmounts(text: string): HTMLElement[] {
  return screen.queryAllByText(text, { normalizer: KEEP_SPACES });
}

/** The amount in reais as the simulator formats it for a whole input: the yearly cost and the yearly savings. */
export function figuresOf(input: RoiInput): { cost: string; savings: string } {
  return { cost: formatBRL(annualManualCost(input)), savings: formatBRL(annualSavings(input)) };
}

export const getSlider = (): HTMLInputElement => screen.getByRole('slider', { name: SLIDER_NAME });
export const getTeamGroup = (): HTMLElement => screen.getByRole('radiogroup', { name: TEAM_NAME });
export const getRadio = (name: string): HTMLInputElement => screen.getByRole('radio', { name });
export const getRate = (): HTMLInputElement => screen.getByRole('spinbutton', { name: RATE_NAME });
export const getCta = (): HTMLElement => screen.getByRole('button', { name: CTA_NAME });
export const getStatus = (): HTMLElement => screen.getByRole('status');
