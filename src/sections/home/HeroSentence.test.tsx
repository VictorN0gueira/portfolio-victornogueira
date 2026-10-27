import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { animate } from 'motion/react';
import { describe, expect, it, vi } from 'vitest';
import { RevealGroup } from '../../components/ui/Reveal';
import { homeCopy } from '../../data/homeCopy';
import type { HeroTaskId } from '../../data/heroFlows';
import { DEFAULT_HOURLY_RATE, SAVINGS_RATE, monthlySavings } from '../../lib/roi';
import { triggerIntersection } from '../../test/intersection';
import { REDUCED_MOTION_QUERY, stubMatchMedia } from '../../test/matchMedia';
import { renderWithProviders } from '../../test/render';
import { HeroAnnotation, HeroFinePrint, HeroSentence } from './HeroSentence';

// The real animate, wrapped so a test can see each count that starts and the controls it returned.
vi.mock('motion/react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('motion/react')>();
  return { ...actual, animate: vi.fn(actual.animate) };
});

// The real RevealGroup, wrapped so a test can read the props the sentence gives it.
vi.mock('../../components/ui/Reveal', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../components/ui/Reveal')>();
  return { ...actual, RevealGroup: vi.fn(actual.RevealGroup) };
});

const NBSP = String.fromCharCode(0x00a0);
const INITIAL_RESULT = `R$${NBSP}1.733`;
const TWENTY_HOURS_RESULT = `R$${NBSP}3.467`;
const FORTY_HOURS_RESULT = `R$${NBSP}6.933`;
const HOURS_TRIGGER = 'Horas por semana: 10 horas. Alterar';
const TASK_TRIGGER = 'Tarefa: planilha e WhatsApp. Alterar';
const FULL_SENTENCE =
  'Sua equipe perde 10 horas por semana com planilha e WhatsApp. Automatizando, a gente devolve R$ 1.733 por mês.';
const TWEEN_WAIT_MS = 3000;
const QUIET_WINDOW_MS = 800;
// A whole count takes 0.55s: waiting this long after it started is waiting past the end of any count.
const PAST_A_COUNT_MS = 800;
const FIVE_HOURS_RESULT = `R$${NBSP}867`;
const TWENTY_HOURS_ESTIMATE = `Estimativa: ${TWENTY_HOURS_RESULT} por mês`;
const FORTY_HOURS_ESTIMATE = `Estimativa: ${FORTY_HOURS_RESULT} por mês`;
const FIVE_HOURS_ESTIMATE = `Estimativa: ${FIVE_HOURS_RESULT} por mês`;
// Lets a mutation observer deliver its last records before a test reads them.
const SETTLE_MS = 50;
// The arrow waits for the sentence to finish (1.2s) and then draws for 0.8s.
const ARROW_WAIT_MS = 5000;

interface RenderOptions {
  task?: HeroTaskId;
  onTaskChange?: (task: HeroTaskId) => void;
  isMotionReduced?: boolean;
}

function renderHero({ task = 'planilha-whatsapp', onTaskChange = vi.fn(), isMotionReduced = false }: RenderOptions = {}) {
  if (isMotionReduced) stubMatchMedia({ [REDUCED_MOTION_QUERY]: true });
  const user = userEvent.setup();
  const view = renderWithProviders(<HeroSentence task={task} onTaskChange={onTaskChange} />);
  return { user, onTaskChange, ...view };
}

/** The monthly savings the hero shows for a number of weekly hours. */
function monthlyOf(hoursPerWeek: number): number {
  return monthlySavings({ hoursPerWeek, teamMultiplier: 1, hourlyRate: DEFAULT_HOURLY_RATE });
}

/** The result pill inside the heading: a plain span, and the only accent element of the hero. */
function getResult(): HTMLElement {
  return screen.getByRole('heading', { level: 1 }).querySelector('.bg-vn-accent') as HTMLElement;
}

/** The visually hidden status region that announces the estimate, outside the heading. */
function getLiveRegion(): HTMLElement {
  return screen.getByRole('status');
}

function getVisualNumber(): HTMLElement {
  return getResult().querySelector('[data-value]') as HTMLElement;
}

interface CountControls {
  stop: () => void;
}

/** The count that started last: its first number and a spy on the stop of its controls. */
function spyOnLastCount() {
  const { calls, results } = vi.mocked(animate).mock;
  const controls = results.at(-1)?.value as CountControls;
  return { stop: vi.spyOn(controls, 'stop'), from: calls.at(-1)?.[0] as number };
}

async function choose(user: ReturnType<typeof userEvent.setup>, triggerName: string, optionName: string) {
  await user.click(screen.getByRole('button', { name: triggerName }));
  const list = await screen.findByRole('listbox');
  await user.click(within(list).getByRole('option', { name: optionName }));
}

/** Records changes inside `target`'s subtree that happen after this call, which is what a live region announces. */
function watchTextChanges(selector: string) {
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

describe('HeroSentence sentence', () => {
  it('reads as one sentence inside a single h1, without an aria-label override', () => {
    renderHero();

    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toHaveTextContent(FULL_SENTENCE);
    expect(heading).not.toHaveAttribute('aria-label');
    expect(heading).not.toHaveAttribute('aria-labelledby');
    expect(screen.getAllByRole('heading')).toHaveLength(1);
  });

  it('keeps the pills inside the h1, each with its own accessible name', () => {
    renderHero();

    const heading = screen.getByRole('heading', { level: 1 });
    expect(within(heading).getByRole('button', { name: HOURS_TRIGGER })).toHaveAttribute('aria-haspopup', 'listbox');
    expect(within(heading).getByRole('button', { name: TASK_TRIGGER })).toHaveAttribute('aria-haspopup', 'listbox');
    expect(heading.contains(getResult())).toBe(true);
    expect(within(heading).queryByRole('status')).toBeNull();
  });

  it('has no div inside the h1, because a heading only holds phrasing content', () => {
    renderHero();

    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading.querySelectorAll('div')).toHaveLength(0);
    heading.querySelectorAll('[data-reveal-item]').forEach((item) => expect(item.tagName).toBe('SPAN'));
  });

  // The amount is part of the heading name in jsdom and in Chromium (checked in its accessibility tree), because
  // the result is a plain span: Chromium skips status and output nodes when it builds a name from content.
  // The pills differ: dom-accessibility-api, behind toHaveAccessibleName, reads their content ("10 horas"),
  // where Chromium reads their aria-label ("Horas por semana: 10 horas. Alterar").
  it('has an accessible name that carries the pill values and the result, in sentence order', () => {
    renderHero();

    expect(screen.getByRole('heading', { level: 1 })).toHaveAccessibleName(
      `Sua equipe perde 10 horas por semana com planilha e WhatsApp . Automatizando, a gente devolve ${INITIAL_RESULT} por mês.`,
    );
  });

  it('keeps the new amount in its accessible name after the hours change', async () => {
    const { user } = renderHero({ isMotionReduced: true });

    await choose(user, HOURS_TRIGGER, '20 horas');

    expect(screen.getByRole('heading', { level: 1 })).toHaveAccessibleName(
      `Sua equipe perde 20 horas por semana com planilha e WhatsApp . Automatizando, a gente devolve ${TWENTY_HOURS_RESULT} por mês.`,
    );
  });

  it('has no output element and no live region inside the sentence', () => {
    const { container } = renderHero();

    expect(container.querySelector('output')).toBeNull();
    expect(screen.getByRole('heading', { level: 1 }).querySelector('[aria-live], [role="status"]')).toBeNull();
  });

  it('follows the copy file, word by word, with the pills where the slots are', () => {
    renderHero();

    const slotCount = homeCopy.hero.sentence.filter((part) => typeof part !== 'string').length;
    const pillAndResultCount = 3;
    expect(slotCount).toBe(pillAndResultCount);
    const items = screen.getByRole('heading', { level: 1 }).querySelectorAll('[data-reveal-item]');
    const words = homeCopy.hero.sentence
      .filter((part): part is string => typeof part === 'string')
      .flatMap((part) => part.split(/\s+/).filter(Boolean));
    // The period after the task pill is not an item of its own: it joins the pill.
    const standalonePunctuation = words.filter((word) => /^[.,;:!?)]+$/.test(word)).length;
    expect(items).toHaveLength(words.length - standalonePunctuation + slotCount);
  });

  it('wraps by itself: real spaces between inline items and no nowrap anywhere on the heading', () => {
    renderHero();

    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading.className).not.toMatch(/nowrap/);
    expect(heading.innerHTML).not.toMatch(/nowrap/);
    expect(heading.textContent).toContain('Sua equipe perde ');
    heading.querySelectorAll('[data-reveal-item]').forEach((item) => expect(item.className).toMatch(/inline-(block|flex)/));
    expect(screen.getByRole('button', { name: HOURS_TRIGGER })).toHaveClass('inline-flex');
    expect(screen.getByRole('button', { name: TASK_TRIGGER })).toHaveClass('inline-flex');
    expect(getResult()).toHaveClass('inline-flex');
  });

  it('puts the period right after the task pill, in the same item, so a line break cannot split them', () => {
    renderHero();

    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading.textContent).toContain('planilha e WhatsApp. Automatizando');
    const taskItem = screen.getByRole('button', { name: TASK_TRIGGER }).closest('[data-reveal-item]');
    expect(taskItem?.textContent).toBe('planilha e WhatsApp.');
  });

  it('ends with an ink cursor that screen readers skip', () => {
    renderHero();

    const heading = screen.getByRole('heading', { level: 1 });
    const cursor = heading.querySelector('.vn-cursor');
    expect(cursor).not.toBeNull();
    expect(cursor).toHaveAttribute('aria-hidden', 'true');
    expect(cursor).toHaveClass('bg-vn-ink');
    expect(heading.lastElementChild?.contains(cursor)).toBe(true);
  });

  it('uses the accent on one element only, the result pill, with black text', () => {
    const { container } = renderHero();

    const accents = container.querySelectorAll('.bg-vn-accent');
    expect(accents).toHaveLength(1);
    expect(accents[0]).toBe(getResult());
    expect(getResult()).toHaveClass('text-vn-black', 'rounded-full', 'font-bold', 'tabular-nums');
  });

  it('is lowercased by CSS and keeps the original case in the DOM', () => {
    renderHero();

    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toHaveClass('lowercase', 'font-display');
    expect(heading.textContent).toContain('Sua equipe perde');
  });
});

describe('HeroSentence result', () => {
  it('starts as the monthly savings of 10 hours, in reais with a non breaking space', () => {
    renderHero();

    expect(getResult().textContent).toBe(INITIAL_RESULT);
    expect(getVisualNumber()).toHaveAttribute('data-value', INITIAL_RESULT);
  });

  it('hides the counting digits from screen readers and leaves them only the final value', () => {
    renderHero();

    expect(getVisualNumber()).toHaveAttribute('aria-hidden', 'true');
    expect(getVisualNumber().textContent).toBe('');
    expect(getResult().querySelector('.sr-only')?.textContent).toBe(INITIAL_RESULT);
  });

  it('is a plain span, not a live region, so the heading name can include it', () => {
    renderHero();

    expect(getResult().tagName).toBe('SPAN');
    expect(getResult()).not.toHaveAttribute('role');
    expect(getResult()).not.toHaveAttribute('aria-live');
  });

  it('shows the new value at once when motion is off', async () => {
    const { user } = renderHero({ isMotionReduced: true });

    await choose(user, HOURS_TRIGGER, '20 horas');

    expect(getResult().textContent).toBe(TWENTY_HOURS_RESULT);
    expect(getVisualNumber()).toHaveAttribute('data-value', TWENTY_HOURS_RESULT);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('perde 20 horas por semana');
    expect(screen.getByRole('button', { name: 'Horas por semana: 20 horas. Alterar' })).toHaveTextContent('20 horas');
  });

  it('counts up to the new value through the numbers in between when motion is on', async () => {
    const { user } = renderHero();
    const shown: string[] = [];
    const observer = new MutationObserver(() => shown.push(getVisualNumber().dataset.value ?? ''));
    observer.observe(getVisualNumber(), { attributes: true, attributeFilter: ['data-value'] });

    await choose(user, HOURS_TRIGGER, '40 horas');
    // The text screen readers get is final right away; only the visual number takes the 0.55s.
    expect(getResult().textContent).toBe(FORTY_HOURS_RESULT);
    await waitFor(() => expect(getVisualNumber()).toHaveAttribute('data-value', FORTY_HOURS_RESULT), {
      timeout: TWEEN_WAIT_MS,
    });
    observer.disconnect();

    const between = shown.filter((value) => value !== FORTY_HOURS_RESULT && value !== INITIAL_RESULT);
    expect(between.length).toBeGreaterThan(0);
    expect(shown.at(-1)).toBe(FORTY_HOURS_RESULT);
  });

  it('writes no text while it counts: the frames only touch data-value and the text changes once, to the final value', async () => {
    const { user } = renderHero();
    const pill = getResult();
    const number = getVisualNumber();
    const textRecords: MutationRecord[] = [];
    const textSeen: string[] = [];
    const textObserver = new MutationObserver((records) => {
      textRecords.push(...records);
      textSeen.push(pill.textContent ?? '');
    });
    textObserver.observe(pill, { childList: true, characterData: true, subtree: true });
    const frames: string[] = [];
    const frameObserver = new MutationObserver(() => frames.push(number.dataset.value ?? ''));
    frameObserver.observe(number, { attributes: true, attributeFilter: ['data-value'] });

    await choose(user, HOURS_TRIGGER, '40 horas');
    await waitFor(() => expect(number).toHaveAttribute('data-value', FORTY_HOURS_RESULT), { timeout: TWEEN_WAIT_MS });
    await new Promise((resolve) => setTimeout(resolve, SETTLE_MS));
    textObserver.disconnect();
    frameObserver.disconnect();

    // The count really ran (frames in between) while the text of the region never showed a number in between.
    expect(frames.length).toBeGreaterThan(1);
    expect(textRecords.length).toBeGreaterThan(0);
    expect([...new Set(textSeen)]).toEqual([FORTY_HOURS_RESULT]);
    expect(textRecords.some((record) => number.contains(record.target))).toBe(false);
  });

  it('lands on the exact value when a second choice interrupts the count', async () => {
    const { user } = renderHero();
    await choose(user, HOURS_TRIGGER, '40 horas');
    const firstCount = spyOnLastCount();

    await choose(user, 'Horas por semana: 40 horas. Alterar', '5 horas');
    const secondCount = spyOnLastCount();

    expect(firstCount.stop).toHaveBeenCalled();
    // The second count starts from the number on screen: somewhere between the two values.
    expect(secondCount.from).toBeGreaterThanOrEqual(monthlyOf(5));
    expect(secondCount.from).toBeLessThanOrEqual(monthlyOf(40));
    await waitFor(() => expect(getVisualNumber()).toHaveAttribute('data-value', FIVE_HOURS_RESULT), {
      timeout: TWEEN_WAIT_MS,
    });
    // A late frame of the first count would overwrite the number: stay past the length of a whole count.
    await new Promise((resolve) => setTimeout(resolve, PAST_A_COUNT_MS));
    expect(getVisualNumber()).toHaveAttribute('data-value', FIVE_HOURS_RESULT);
    expect(getResult().textContent).toBe(FIVE_HOURS_RESULT);
  });

  it('draws the number from data-value with a pseudo element, which jsdom cannot compute, so the class is pinned', () => {
    renderHero();

    expect(getVisualNumber()).toHaveClass('before:content-[attr(data-value)]');
    expect(getVisualNumber().textContent).toBe('');
  });

  it('counts back down when the hours go down, and ends on the exact value', async () => {
    const { user } = renderHero();

    await choose(user, HOURS_TRIGGER, '5 horas');

    await waitFor(() => expect(getVisualNumber()).toHaveAttribute('data-value', FIVE_HOURS_RESULT), {
      timeout: TWEEN_WAIT_MS,
    });
    expect(getResult().textContent).toBe(FIVE_HOURS_RESULT);
  });
});

describe('HeroSentence live region', () => {
  it('is a polite, atomic status region outside the heading, hidden from sight', () => {
    renderHero();

    const region = getLiveRegion();
    expect(region).toHaveAttribute('aria-live', 'polite');
    expect(region).toHaveAttribute('aria-atomic', 'true');
    expect(region).toHaveClass('sr-only');
    expect(screen.getByRole('heading', { level: 1 }).contains(region)).toBe(false);
  });

  it('is empty on first render and stays untouched while nothing changes, so nothing is announced on mount', async () => {
    const watcher = watchTextChanges('[role="status"]');
    renderHero();

    expect(getLiveRegion()).toBeEmptyDOMElement();
    await new Promise((resolve) => setTimeout(resolve, QUIET_WINDOW_MS));
    watcher.stop();

    expect(watcher.insideTarget()).toEqual([]);
    expect(getLiveRegion()).toBeEmptyDOMElement();
  });

  it('announces the estimate once, as a whole, when the hours change', async () => {
    const { user } = renderHero({ isMotionReduced: true });
    const watcher = watchTextChanges('[role="status"]');

    await choose(user, HOURS_TRIGGER, '20 horas');
    await new Promise((resolve) => setTimeout(resolve, SETTLE_MS));
    watcher.stop();

    expect(getLiveRegion().textContent).toBe(TWENTY_HOURS_ESTIMATE);
    expect(watcher.insideTarget().length).toBeGreaterThan(0);
  });

  it('announces only the final number while the visible number counts', async () => {
    const { user } = renderHero();
    const region = getLiveRegion();
    const seen: string[] = [];
    const observer = new MutationObserver(() => seen.push(region.textContent ?? ''));
    observer.observe(region, { childList: true, characterData: true, subtree: true });

    await choose(user, HOURS_TRIGGER, '40 horas');
    await waitFor(() => expect(getVisualNumber()).toHaveAttribute('data-value', FORTY_HOURS_RESULT), {
      timeout: TWEEN_WAIT_MS,
    });
    await new Promise((resolve) => setTimeout(resolve, SETTLE_MS));
    observer.disconnect();

    expect(seen.length).toBeGreaterThan(0);
    expect([...new Set(seen)]).toEqual([FORTY_HOURS_ESTIMATE]);
  });

  it('keeps the latest estimate after two quick changes', async () => {
    const { user } = renderHero({ isMotionReduced: true });

    await choose(user, HOURS_TRIGGER, '40 horas');
    await choose(user, 'Horas por semana: 40 horas. Alterar', '5 horas');

    expect(getLiveRegion().textContent).toBe(FIVE_HOURS_ESTIMATE);
  });

  it('does not announce when only the task changes, because the estimate did not change', async () => {
    const { user } = renderHero({ isMotionReduced: true });
    const watcher = watchTextChanges('[role="status"]');

    await choose(user, TASK_TRIGGER, 'follow-up de vendas');
    await new Promise((resolve) => setTimeout(resolve, SETTLE_MS));
    watcher.stop();

    expect(watcher.insideTarget()).toEqual([]);
    expect(getLiveRegion()).toBeEmptyDOMElement();
  });

  it('does not announce again when the hours that are already chosen are chosen once more', async () => {
    const { user } = renderHero({ isMotionReduced: true });
    await choose(user, HOURS_TRIGGER, '20 horas');
    const watcher = watchTextChanges('[role="status"]');

    await choose(user, 'Horas por semana: 20 horas. Alterar', '20 horas');
    await new Promise((resolve) => setTimeout(resolve, SETTLE_MS));
    watcher.stop();

    expect(watcher.insideTarget()).toEqual([]);
    expect(getLiveRegion().textContent).toBe(TWENTY_HOURS_ESTIMATE);
  });

  it('does not announce when the hours that are already chosen are chosen on a fresh mount', async () => {
    const { user } = renderHero({ isMotionReduced: true });
    const watcher = watchTextChanges('[role="status"]');

    await user.click(screen.getByRole('button', { name: HOURS_TRIGGER }));
    await waitFor(() => expect(screen.getByRole('option', { name: '10 horas' })).toHaveFocus());
    // Enter on the focused option, which is the one already chosen: ChoicePill still reports the choice.
    await user.keyboard('{Enter}');
    await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument());
    await new Promise((resolve) => setTimeout(resolve, SETTLE_MS));
    watcher.stop();

    expect(watcher.insideTarget()).toEqual([]);
    expect(getLiveRegion()).toBeEmptyDOMElement();
    expect(getResult().textContent).toBe(INITIAL_RESULT);
  });
});

describe('HeroSentence pills', () => {
  it('lists the four hour options with the approved labels', async () => {
    const { user } = renderHero();

    await user.click(screen.getByRole('button', { name: HOURS_TRIGGER }));

    const list = await screen.findByRole('listbox', { name: homeCopy.hero.aria.hoursList });
    expect(within(list).getAllByRole('option').map((option) => option.textContent)).toEqual([
      '5 horas',
      '10 horas',
      '20 horas',
      '40 horas',
    ]);
  });

  it('lists the four tasks with the approved labels, the current one selected', async () => {
    const { user } = renderHero({ task: 'notas' });

    await user.click(screen.getByRole('button', { name: 'Tarefa: emissão de notas. Alterar' }));

    const list = await screen.findByRole('listbox', { name: homeCopy.hero.aria.taskList });
    expect(within(list).getAllByRole('option').map((option) => option.textContent)).toEqual([
      'planilha e WhatsApp',
      'atendimento no WhatsApp',
      'emissão de notas',
      'follow-up de vendas',
    ]);
    expect(within(list).getByRole('option', { name: 'emissão de notas' })).toHaveAttribute('aria-selected', 'true');
  });

  it('tells the parent which task was chosen', async () => {
    const { user, onTaskChange } = renderHero();

    await choose(user, TASK_TRIGGER, 'emissão de notas');

    expect(onTaskChange).toHaveBeenCalledTimes(1);
    expect(onTaskChange).toHaveBeenCalledWith('notas');
  });

  it('shows the task the parent holds, because the pill is controlled', () => {
    const { rerender, onTaskChange } = renderHero();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('com planilha e WhatsApp.');

    rerender(<HeroSentence task="follow-up" onTaskChange={onTaskChange} />);

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('com follow-up de vendas.');
    expect(screen.getByRole('button', { name: 'Tarefa: follow-up de vendas. Alterar' })).toBeInTheDocument();
  });

  it('does not change the result when the task changes, only the hours do', async () => {
    const { user } = renderHero({ isMotionReduced: true });

    await choose(user, TASK_TRIGGER, 'follow-up de vendas');

    expect(getResult().textContent).toBe(INITIAL_RESULT);
  });

  it('gives the focus back to the pill after a choice', async () => {
    const { user } = renderHero({ isMotionReduced: true });

    await choose(user, HOURS_TRIGGER, '20 horas');

    await waitFor(() => expect(screen.getByRole('button', { name: 'Horas por semana: 20 horas. Alterar' })).toHaveFocus());
  });
});

describe('HeroSentence line layout', () => {
  // jsdom has no layout, so the classes are pinned here and the e2e spec (hero.spec.ts) measures the real lines.
  it('makes the item with the period a flex row, where the pill shrinks and the period keeps its room', () => {
    renderHero();

    const taskPill = screen.getByRole('button', { name: TASK_TRIGGER });
    const item = taskPill.closest('[data-reveal-item]') as HTMLElement;
    expect(item).toHaveClass('inline-flex', 'items-end', 'max-w-full');
    expect(taskPill).toHaveClass('min-w-0');
    // A percentage cap resolved against the item, which is only as wide as the pill and the period, cut the pill short.
    expect(taskPill.className).not.toMatch(/max-w-\[calc/);
  });

  it('gives the period the box of a pill without the ring, so the two share a baseline', () => {
    renderHero();

    const item = screen.getByRole('button', { name: TASK_TRIGGER }).closest('[data-reveal-item]') as HTMLElement;
    const period = item.lastElementChild as HTMLElement;
    expect(period).toHaveTextContent('.');
    expect(period).toHaveClass('min-h-11', 'shrink-0', 'items-center', 'border-transparent');
  });

  it('keeps plain words as inline blocks', () => {
    renderHero();

    const word = screen.getByRole('heading', { level: 1 }).querySelector('[data-reveal-item]') as HTMLElement;
    expect(word).toHaveClass('inline-block');
    expect(word).not.toHaveClass('inline-flex');
  });

  it('gives both choice pills a soft corner instead of a full round one, so a wrapped pill is not an oval', () => {
    renderHero();

    [HOURS_TRIGGER, TASK_TRIGGER].forEach((name) => {
      const pill = screen.getByRole('button', { name });
      expect(pill).toHaveClass('rounded-[0.8em]');
      expect(pill).not.toHaveClass('rounded-full');
    });
  });
});

describe('HeroSentence entrance', () => {
  function getItems(): HTMLElement[] {
    return Array.from(screen.getByRole('heading', { level: 1 }).querySelectorAll<HTMLElement>('[data-reveal-item]'));
  }

  it('hides every word, blurred and lowered, until the sentence comes into view', () => {
    renderHero();

    getItems().forEach((item) => {
      expect(item.style.opacity).toBe('0');
      expect(item.style.transform).toBe('translateY(24px)');
      expect(item.style.filter).toBe('blur(8px)');
    });
  });

  it('gives the words a 0.05s stagger, which no timing check can pin deterministically', () => {
    renderHero();

    const groupProps = vi.mocked(RevealGroup).mock.calls.at(-1)?.[0];
    expect(groupProps?.as).toBe('h1');
    expect(groupProps?.stagger).toBe(0.05);
  });

  it('reveals the words one after another, in reading order, and ends with all of them shown', async () => {
    renderHero();
    const items = getItems();
    // The batch (one frame of mutations) in which each word first left opacity 0. Time never enters the check:
    // a loaded machine may put several words in one batch, but a word can never start before the one before it.
    const startedIn = new Map<HTMLElement, number>();
    let batch = 0;
    const observer = new MutationObserver(() => {
      batch += 1;
      items.forEach((item) => {
        if (!startedIn.has(item) && item.style.opacity !== '0') startedIn.set(item, batch);
      });
    });
    items.forEach((item) => observer.observe(item, { attributes: true, attributeFilter: ['style'] }));

    triggerIntersection(screen.getByRole('heading', { level: 1 }));
    await waitFor(() => expect(startedIn.size).toBe(items.length), { timeout: TWEEN_WAIT_MS });
    await waitFor(() => items.forEach((item) => expect(item.style.opacity).toBe('1')), { timeout: TWEEN_WAIT_MS });
    observer.disconnect();

    const order = items.map((item) => startedIn.get(item) as number);
    expect(order).toEqual([...order].sort((first, second) => first - second));
    items.forEach((item) => expect(item.style.filter).toMatch(/^(none|blur\(0(px)?\))$/));
  });

  it('shows the whole sentence at once, with no hidden style, when motion is reduced', () => {
    renderHero({ isMotionReduced: true });

    getItems().forEach((item) => expect(item).not.toHaveAttribute('style'));
  });
});

describe('HeroFinePrint', () => {
  it('shows the approved fine print, as small text', () => {
    renderWithProviders(<HeroFinePrint />);

    expect(screen.getByText('Estimativa com R$ 50 por hora e 80% do tempo automatizado.')).toHaveClass('text-sm');
  });

  it('states the same rate and share the result is computed with', () => {
    renderWithProviders(<HeroFinePrint />);

    const text = homeCopy.hero.finePrint;
    expect(text).toContain(`R$ ${DEFAULT_HOURLY_RATE} por hora`);
    expect(text).toContain(`${SAVINGS_RATE * 100}% do tempo`);
  });

  it('has no dash and no slash separator, like the rest of the copy', () => {
    const text = homeCopy.hero.finePrint + homeCopy.hero.annotation;

    expect(text).not.toMatch(new RegExp(`[${String.fromCharCode(0x2013)}${String.fromCharCode(0x2014)}]`));
    expect(text).not.toContain(' / ');
  });
});

describe('HeroAnnotation', () => {
  it('shows the approved annotation and hides it below the lg breakpoint', () => {
    renderWithProviders(<HeroAnnotation />);

    const note = screen.getByText('// mexe nos números aí');
    expect(note.closest('[data-hero-annotation]')).toHaveClass('hidden', 'lg:flex');
  });

  it('draws the arrow as an svg path that screen readers skip', () => {
    const { container } = renderWithProviders(<HeroAnnotation />);

    const arrow = container.querySelector('svg');
    expect(arrow).toHaveAttribute('aria-hidden', 'true');
    expect(arrow?.querySelector('path')).not.toBeNull();
  });

  it('draws the arrow with a dashed stroke that grows from nothing to the whole path once it is in view', async () => {
    const { container } = renderWithProviders(<HeroAnnotation />);
    const path = container.querySelector('svg path') as SVGPathElement;
    expect(path).toHaveAttribute('pathLength', '1');
    expect(path).toHaveAttribute('stroke-dasharray', '0 1');

    triggerIntersection(container.querySelector('[data-hero-annotation]') as HTMLElement);

    await waitFor(() => expect(path).toHaveAttribute('stroke-dasharray', '1 1'), { timeout: ARROW_WAIT_MS });
  });

  it('draws the whole arrow at once when motion is reduced', () => {
    stubMatchMedia({ [REDUCED_MOTION_QUERY]: true });
    const { container } = renderWithProviders(<HeroAnnotation />);

    const path = container.querySelector('svg path') as SVGPathElement;
    expect(path).not.toHaveAttribute('pathLength');
    expect(path).not.toHaveAttribute('stroke-dasharray');
  });
});

describe('HeroSentence unmount', () => {
  it('stops counting when it unmounts, and nothing writes to the number afterwards', async () => {
    const { user, unmount } = renderHero();
    await choose(user, HOURS_TRIGGER, '40 horas');
    const number = getVisualNumber();
    const count = spyOnLastCount();

    act(() => unmount());
    // Stopping a count may write one last frame while the component is torn down, so the number is read after that.
    const valueAfterUnmount = number.dataset.value;
    // The node is detached now, but it can still be observed: a frame landing late would show up here.
    const writes: MutationRecord[] = [];
    const observer = new MutationObserver((records) => writes.push(...records));
    observer.observe(number, { attributes: true, attributeFilter: ['data-value'] });
    await new Promise((resolve) => setTimeout(resolve, PAST_A_COUNT_MS));
    observer.disconnect();

    expect(count.stop).toHaveBeenCalled();
    expect(writes).toEqual([]);
    expect(number.dataset.value).toBe(valueAfterUnmount);
  });
});
