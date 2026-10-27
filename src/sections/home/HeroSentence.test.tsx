import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { homeCopy } from '../../data/homeCopy';
import type { HeroTaskId } from '../../data/heroFlows';
import { DEFAULT_HOURLY_RATE, SAVINGS_RATE } from '../../lib/roi';
import { triggerIntersection } from '../../test/intersection';
import { REDUCED_MOTION_QUERY, stubMatchMedia } from '../../test/matchMedia';
import { renderWithProviders } from '../../test/render';
import { HeroAnnotation, HeroFinePrint, HeroSentence } from './HeroSentence';

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

function getResult(): HTMLOutputElement {
  return screen.getByRole('status') as HTMLOutputElement;
}

function getVisualNumber(): HTMLElement {
  return getResult().querySelector('[data-value]') as HTMLElement;
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
    expect(within(heading).getByRole('status')).toBe(getResult());
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

  it('is a polite and atomic live region, so a change is read as a whole', () => {
    renderHero();

    expect(getResult().tagName).toBe('OUTPUT');
    expect(getResult()).toHaveAttribute('aria-live', 'polite');
    expect(getResult()).toHaveAttribute('aria-atomic', 'true');
  });

  it('hides the counting digits from screen readers and leaves them only the final value', () => {
    renderHero();

    expect(getVisualNumber()).toHaveAttribute('aria-hidden', 'true');
    expect(getVisualNumber().textContent).toBe('');
    expect(getResult().querySelector('.sr-only')?.textContent).toBe(INITIAL_RESULT);
  });

  it('does not change its text on first render or while it rests, so nothing is announced', async () => {
    const watcher = watchTextChanges('output');
    renderHero();

    await new Promise((resolve) => setTimeout(resolve, QUIET_WINDOW_MS));
    watcher.stop();

    expect(watcher.insideTarget()).toEqual([]);
  });

  it('updates the final text once when the hours change, which is what gets announced', async () => {
    const { user } = renderHero({ isMotionReduced: true });
    const watcher = watchTextChanges('output');

    await choose(user, HOURS_TRIGGER, '20 horas');
    await new Promise((resolve) => setTimeout(resolve, 50));
    watcher.stop();

    expect(getResult().textContent).toBe(TWENTY_HOURS_RESULT);
    expect(watcher.insideTarget().length).toBeGreaterThan(0);
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

  it('counts back down when the hours go down, and ends on the exact value', async () => {
    const { user } = renderHero();

    await choose(user, HOURS_TRIGGER, '5 horas');

    await waitFor(() => expect(getVisualNumber()).toHaveAttribute('data-value', `R$${NBSP}867`), {
      timeout: TWEEN_WAIT_MS,
    });
    expect(getResult().textContent).toBe(`R$${NBSP}867`);
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

  it('reveals the words one after another, about 0.05s apart', async () => {
    renderHero();
    const items = getItems();

    triggerIntersection(screen.getByRole('heading', { level: 1 }));

    await waitFor(() => expect(items[0].style.opacity).not.toBe('0'), { timeout: TWEEN_WAIT_MS });
    // The last word waits 0.05s per word before it, which is more than a second for this sentence.
    expect(items.at(-1)?.style.opacity).toBe('0');
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

describe('HeroSentence act safety', () => {
  it('can be unmounted in the middle of a count without errors', async () => {
    const { user, unmount } = renderHero();
    await choose(user, HOURS_TRIGGER, '40 horas');

    expect(() => act(() => unmount())).not.toThrow();
  });
});
