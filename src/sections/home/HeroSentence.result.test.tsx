import { act, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { homeCopy } from '../../data/homeCopy';
import { INITIAL_RESULT, TWENTY_HOURS_RESULT, FORTY_HOURS_RESULT, HOURS_TRIGGER, TASK_TRIGGER, TWEEN_WAIT_MS, QUIET_WINDOW_MS, PAST_A_COUNT_MS, FIVE_HOURS_RESULT, TWENTY_HOURS_ESTIMATE, FORTY_HOURS_ESTIMATE, FIVE_HOURS_ESTIMATE, SETTLE_MS, renderHero, monthlyOf, getResult, getLiveRegion, getVisualNumber, spyOnLastCount, choose, watchTextChanges } from '../../test/heroSentenceKit';
import { HeroSentence } from './HeroSentence';

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
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(`${homeCopy.hero.sentence[0]} 20 horas ${homeCopy.hero.sentence[2]}`);
    expect(screen.getByRole('button', { name: homeCopy.hero.aria.hoursPill('20 horas') })).toHaveTextContent('20 horas');
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

    await choose(user, homeCopy.hero.aria.hoursPill('40 horas'), '5 horas');
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
    await choose(user, homeCopy.hero.aria.hoursPill('40 horas'), '5 horas');

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

    await choose(user, homeCopy.hero.aria.hoursPill('20 horas'), '20 horas');
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

    await user.click(screen.getByRole('button', { name: homeCopy.hero.aria.taskPill('emissão de notas') }));

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
    expect(screen.getByRole('button', { name: homeCopy.hero.aria.taskPill('follow-up de vendas') })).toBeInTheDocument();
  });

  it('does not change the result when the task changes, only the hours do', async () => {
    const { user } = renderHero({ isMotionReduced: true });

    await choose(user, TASK_TRIGGER, 'follow-up de vendas');

    expect(getResult().textContent).toBe(INITIAL_RESULT);
  });

  it('gives the focus back to the pill after a choice', async () => {
    const { user } = renderHero({ isMotionReduced: true });

    await choose(user, HOURS_TRIGGER, '20 horas');

    await waitFor(() => expect(screen.getByRole('button', { name: homeCopy.hero.aria.hoursPill('20 horas') })).toHaveFocus());
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
