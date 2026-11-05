import { describe, expect, it } from 'vitest';
import { homeCopy } from '../data/homeCopy';
import * as roi from './roi';
import {
  HERO_HOUR_OPTIONS,
  TEAM_OPTIONS,
  annualManualCost,
  annualSavings,
  buildQuoteMessage,
  monthlySavings,
} from './roi';

const BASE_INPUT = { hoursPerWeek: 12, teamMultiplier: 2.5, hourlyRate: 50 };
const NBSP = String.fromCharCode(0xa0);
const EM_DASH = String.fromCharCode(0x2014);
const EN_DASH = String.fromCharCode(0x2013);
const DASH_OR_SLASH = new RegExp(`[${EM_DASH}${EN_DASH}/]`);

describe('annual figures', () => {
  it('mantém o resultado da fórmula original', () => {
    expect(annualManualCost(BASE_INPUT)).toBe(78000);
    expect(annualSavings(BASE_INPUT)).toBe(62400);
  });
});

describe('monthlySavings', () => {
  it('mensal do hero (equipe 1, R$ 50/h)', () => {
    const m = (h: number) => monthlySavings({ hoursPerWeek: h, teamMultiplier: 1, hourlyRate: 50 });
    expect([5, 10, 20, 40].map(m)).toEqual([867, 1733, 3467, 6933]);
  });

  it('expõe as opções de horas do hero', () => {
    expect([...HERO_HOUR_OPTIONS]).toEqual([5, 10, 20, 40]);
  });
});

describe('invalid input', () => {
  it('entrada inválida vira zero', () => {
    for (const bad of [NaN, -5, Infinity])
      expect(annualSavings({ hoursPerWeek: bad, teamMultiplier: 1, hourlyRate: 50 })).toBe(0);
    expect(monthlySavings({ hoursPerWeek: 10, teamMultiplier: 1, hourlyRate: NaN })).toBe(0);
  });

  it('aplica a regra a qualquer campo e a todas as funções', () => {
    const badTeam = { hoursPerWeek: 10, teamMultiplier: -1, hourlyRate: 50 };
    const badRate = { hoursPerWeek: 10, teamMultiplier: 1, hourlyRate: -Infinity };
    expect(annualManualCost(badTeam)).toBe(0);
    expect(annualSavings(badRate)).toBe(0);
    expect(monthlySavings(badTeam)).toBe(0);
  });
});

describe('buildQuoteMessage', () => {
  it('mensagem de orçamento sem travessão nem barra', () => {
    const msg = buildQuoteMessage(BASE_INPUT);
    expect(msg).toBe(
      `Olá! Usei o simulador do site: a gente perde cerca de R$${NBSP}78.000 por ano com tarefas manuais (12 horas por semana). Quero automatizar esse processo.`,
    );
    expect(msg).not.toMatch(DASH_OR_SLASH);
    expect(msg).not.toMatch(/calculadora|\dh\b/);
  });

  it('invalid hours print 0 horas por semana and a cost of R$ 0', () => {
    const msg = buildQuoteMessage({ hoursPerWeek: NaN, teamMultiplier: 2.5, hourlyRate: 50 });

    expect(msg).toContain('(0 horas por semana)');
    expect(msg).toContain(`cerca de R$${NBSP}0 por ano`);
  });

  it('a negative or non finite rate prints R$ 0 as well', () => {
    const msg = buildQuoteMessage({ hoursPerWeek: 12, teamMultiplier: 2.5, hourlyRate: -Infinity });

    expect(msg).toContain('(12 horas por semana)');
    expect(msg).toContain(`cerca de R$${NBSP}0 por ano`);
  });
});

describe('buildQuoteMessage with one hour', () => {
  it('uses the singular', () => {
    const msg = buildQuoteMessage({ hoursPerWeek: 1, teamMultiplier: 1, hourlyRate: 50 });

    expect(msg).toContain('(1 hora por semana)');
  });
});

describe('public surface', () => {
  it('keeps the week count private', () => {
    expect(roi).not.toHaveProperty('WEEKS_PER_YEAR');
  });

  it('keeps the month count private', () => {
    expect(roi).not.toHaveProperty('MONTHS_PER_YEAR');
  });
});

describe('TEAM_OPTIONS', () => {
  it('labels de equipe sem travessão', () => {
    expect(TEAM_OPTIONS.map((o) => o.label)).toEqual([
      '1 pessoa',
      '2 a 3 pessoas',
      '4 a 10 pessoas',
      'mais de 10 pessoas',
    ]);
  });

  it('mantém os multiplicadores da calculadora atual', () => {
    expect(TEAM_OPTIONS.map((o) => o.value)).toEqual([1, 2.5, 7, 15]);
  });
});

describe('the simulator note', () => {
  const NOTE_NBSP = String.fromCharCode(0xa0);

  it('states the savings share and every team multiplier, as the code uses them', () => {
    const multipliers = TEAM_OPTIONS.map((option) => option.value.toLocaleString('pt-BR'));
    const note = homeCopy.roi.note.split(NOTE_NBSP).join(' ');

    expect(note).toContain(`Considera ${roi.SAVINGS_RATE * 100}% do tempo automatizado`);
    for (const multiplier of multipliers) expect(note).toMatch(new RegExp(`(^|[ ;])${multiplier}[ ;.]`));
  });

  it('reads as the approved sentence, with the list of head counts kept in one piece', () => {
    expect(homeCopy.roi.note).toBe(
      `Considera 80% do tempo automatizado. Cada faixa de equipe conta como 1;${NOTE_NBSP}2,5;${NOTE_NBSP}7${NOTE_NBSP}ou${NOTE_NBSP}15${NOTE_NBSP}pessoas. É${NOTE_NBSP}uma estimativa: o número real sai${NOTE_NBSP}do${NOTE_NBSP}diagnóstico.`,
    );
  });
});
