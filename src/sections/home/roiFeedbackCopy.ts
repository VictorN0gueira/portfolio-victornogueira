/** What the simulator says under the hourly rate field when it cannot use what was typed. */
export const roiFeedbackCopy = {
  negativeRate: 'O valor da hora não pode ser negativo. Até você corrigir, a conta usa R$ 0.',
  unreadableRate: 'Não deu para ler esse valor. Até você corrigir, a conta usa R$ 0.',
} as const;

export type RateIssue = 'negative' | 'unreadable';

const NOTE_OF_ISSUE: Record<RateIssue, string> = {
  negative: roiFeedbackCopy.negativeRate,
  unreadable: roiFeedbackCopy.unreadableRate,
};

/** The sentence that goes with an issue of the hourly rate. */
export function rateIssueNote(issue: RateIssue): string {
  return NOTE_OF_ISSUE[issue];
}
