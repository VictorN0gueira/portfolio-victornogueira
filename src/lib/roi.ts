import { formatBRL } from './format';

export type RoiInput = {
  hoursPerWeek: number;
  teamMultiplier: number;
  hourlyRate: number;
};

export const TEAM_OPTIONS: readonly { label: string; value: number }[] = [
  { label: '1 pessoa', value: 1 },
  { label: '2 a 3 pessoas', value: 2.5 },
  { label: '4 a 10 pessoas', value: 7 },
  { label: 'mais de 10 pessoas', value: 15 },
];

export const DEFAULT_HOURLY_RATE = 50;
export const SAVINGS_RATE = 0.8;
const WEEKS_PER_YEAR = 52;
const MONTHS_PER_YEAR = 12;

/** Horas por semana oferecidas na frase do hero. */
export const HERO_HOUR_OPTIONS = [5, 10, 20, 40] as const;

function toSafeNumber(value: number): number {
  return Number.isFinite(value) && value >= 0 ? value : 0;
}

/** Entrada não finita ou negativa em qualquer campo vale 0. */
function sanitize(input: RoiInput): RoiInput {
  return {
    hoursPerWeek: toSafeNumber(input.hoursPerWeek),
    teamMultiplier: toSafeNumber(input.teamMultiplier),
    hourlyRate: toSafeNumber(input.hourlyRate),
  };
}

/** Custo anual sem arredondar. Recebe a entrada já saneada, por isso não sanitiza de novo. */
function costOfSafeInput({ hoursPerWeek, teamMultiplier, hourlyRate }: RoiInput): number {
  return hoursPerWeek * teamMultiplier * hourlyRate * WEEKS_PER_YEAR;
}

function rawAnnualCost(input: RoiInput): number {
  return costOfSafeInput(sanitize(input));
}

/** Custo anual das tarefas manuais, em reais inteiros. */
export function annualManualCost(input: RoiInput): number {
  return Math.round(rawAnnualCost(input));
}

/** Economia anual estimada com automação, em reais inteiros. */
export function annualSavings(input: RoiInput): number {
  return Math.round(rawAnnualCost(input) * SAVINGS_RATE);
}

/** Economia mensal estimada com automação, em reais inteiros. */
export function monthlySavings(input: RoiInput): number {
  return Math.round((rawAnnualCost(input) * SAVINGS_RATE) / MONTHS_PER_YEAR);
}

/** Mensagem pré-preenchida do CTA do simulador. Vai para o campo `mensagem` do formulário de contato. */
export function buildQuoteMessage(input: RoiInput): string {
  const safeInput = sanitize(input);
  const annualCost = formatBRL(Math.round(costOfSafeInput(safeInput)));
  const hours = safeInput.hoursPerWeek;
  const hoursText = `${hours} ${hours === 1 ? 'hora' : 'horas'} por semana`;
  return `Olá! Usei o simulador do site: a gente perde cerca de ${annualCost} por ano com tarefas manuais (${hoursText}). Quero automatizar esse processo.`;
}
