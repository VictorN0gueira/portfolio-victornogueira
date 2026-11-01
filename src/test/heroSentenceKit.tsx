import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { animate } from 'motion/react';
import { vi } from 'vitest';
import { heroTasks, type HeroTaskId } from '../data/heroFlows';
import { homeCopy } from '../data/homeCopy';
import { DEFAULT_HOURLY_RATE, monthlySavings } from '../lib/roi';
import { HeroSentence } from '../sections/home/HeroSentence';
import { REDUCED_MOTION_QUERY, stubMatchMedia } from './matchMedia';
import { renderWithProviders } from './render';

// What the HeroSentence suites share. The suites declare the two vi.mock calls themselves (they are hoisted per test
// file): `animate` and `RevealGroup` wrapped in spies, which spyOnLastCount reads.

export const NBSP = String.fromCharCode(0x00a0);
export const INITIAL_RESULT = `R$${NBSP}1.733`;
export const TWENTY_HOURS_RESULT = `R$${NBSP}3.467`;
export const FORTY_HOURS_RESULT = `R$${NBSP}6.933`;
// The last two words of a run of text are joined by a no break space: the reading is the same, the character is not.
export const plain = (text: string | null): string => (text ?? '').replaceAll(NBSP, ' ');
/** The exact text as a pattern that takes a no break space for a plain one. */
export const looseText = (text: string): RegExp => {
  const escaped = text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`^${escaped.replaceAll(' ', '[ \\u00A0]')}$`);
};
export const HOURS_TRIGGER = homeCopy.hero.aria.hoursPill('10 horas');
export const FIRST_TASK = heroTasks[0].label;
export const TASK_TRIGGER = homeCopy.hero.aria.taskPill(FIRST_TASK);
export const TWEEN_WAIT_MS = 3000;
export const QUIET_WINDOW_MS = 800;
// A whole count takes 0.55s: waiting this long after it started is waiting past the end of any count.
export const PAST_A_COUNT_MS = 800;
export const FIVE_HOURS_RESULT = `R$${NBSP}867`;
export const TWENTY_HOURS_ESTIMATE = homeCopy.hero.aria.estimate(TWENTY_HOURS_RESULT);
export const FORTY_HOURS_ESTIMATE = homeCopy.hero.aria.estimate(FORTY_HOURS_RESULT);
export const FIVE_HOURS_ESTIMATE = homeCopy.hero.aria.estimate(FIVE_HOURS_RESULT);

/**
 * The sentence of the hero with its three slots filled, from the copy module. A piece of text that starts with
 * punctuation glues to the one before it, like on the page. `spaceBeforePunctuation` keeps the space that the
 * accessible name has between the task pill and the period.
 */
export function sentenceWith(values: { hours: string; task: string; result: string }, spaceBeforePunctuation = false): string {
  return homeCopy.hero.sentence
    .map((part) => (typeof part === 'string' ? part : values[part.slot]))
    .reduce((text, piece) => {
      const glues = !spaceBeforePunctuation && /^[.,;:!?]/.test(piece);
      return text ? `${text}${glues ? '' : ' '}${piece}` : piece;
    }, '');
}

// toHaveTextContent compares against text whose spaces are normalized, so the non breaking space of the amount is one too.
export const FULL_SENTENCE = sentenceWith({ hours: '10 horas', task: FIRST_TASK, result: INITIAL_RESULT.replace(NBSP, ' ') });
// Lets a mutation observer deliver its last records before a test reads them.
export const SETTLE_MS = 50;
// The arrow waits for the sentence to finish (1.2s) and then draws for 0.8s.
export const ARROW_WAIT_MS = 5000;

interface RenderOptions {
  task?: HeroTaskId;
  onTaskChange?: (task: HeroTaskId) => void;
  isMotionReduced?: boolean;
}

export function renderHero({ task = 'planilha-whatsapp', onTaskChange = vi.fn(), isMotionReduced = false }: RenderOptions = {}) {
  if (isMotionReduced) stubMatchMedia({ [REDUCED_MOTION_QUERY]: true });
  const user = userEvent.setup();
  const view = renderWithProviders(<HeroSentence task={task} onTaskChange={onTaskChange} />);
  return { user, onTaskChange, ...view };
}

/** The monthly savings the hero shows for a number of weekly hours. */
export function monthlyOf(hoursPerWeek: number): number {
  return monthlySavings({ hoursPerWeek, teamMultiplier: 1, hourlyRate: DEFAULT_HOURLY_RATE });
}

/** The result pill inside the heading: a plain span, and the only accent element of the hero. */
export function getResult(): HTMLElement {
  return screen.getByRole('heading', { level: 1 }).querySelector('.bg-vn-accent') as HTMLElement;
}

/** The visually hidden status region that announces the estimate, outside the heading. */
export function getLiveRegion(): HTMLElement {
  return screen.getByRole('status');
}

export function getVisualNumber(): HTMLElement {
  return getResult().querySelector('[data-value]') as HTMLElement;
}

interface CountControls {
  stop: () => void;
}

/** The count that started last: its first number and a spy on the stop of its controls. */
export function spyOnLastCount() {
  const { calls, results } = vi.mocked(animate).mock;
  const controls = results.at(-1)?.value as CountControls;
  return { stop: vi.spyOn(controls, 'stop'), from: calls.at(-1)?.[0] as number };
}

export async function choose(user: ReturnType<typeof userEvent.setup>, triggerName: string, optionName: string) {
  await user.click(screen.getByRole('button', { name: triggerName }));
  const list = await screen.findByRole('listbox');
  await user.click(within(list).getByRole('option', { name: optionName }));
}

/** Records changes inside `target`'s subtree that happen after this call, which is what a live region announces. */
export function watchTextChanges(selector: string) {
  const records: MutationRecord[] = [];
  const observer = new MutationObserver((list) => records.push(...list));
  observer.observe(document.body, { childList: true, characterData: true, subtree: true });

  return {
    insideTarget: () =>
      records.filter((record) => {
        const target = document.body.querySelector(selector);
        return target !== null && target.contains(record.target);
      }),
    stop: () => observer.disconnect(),
  };
}
