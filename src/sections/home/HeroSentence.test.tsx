import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { RevealGroup } from '../../components/ui/Reveal';
import { homeCopy } from '../../data/homeCopy';
import { DEFAULT_HOURLY_RATE, SAVINGS_RATE } from '../../lib/roi';
import { INITIAL_RESULT, TWENTY_HOURS_RESULT, plain, looseText, HOURS_TRIGGER, FIRST_TASK, TASK_TRIGGER, TWEEN_WAIT_MS, sentenceWith, FULL_SENTENCE, ARROW_WAIT_MS, renderHero, getResult, choose } from '../../test/heroSentenceKit';
import { triggerIntersection } from '../../test/intersection';
import { REDUCED_MOTION_QUERY, stubMatchMedia } from '../../test/matchMedia';
import { renderWithProviders } from '../../test/render';
import { HeroAnnotation, HeroFinePrint } from './HeroSentence';

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
      looseText(sentenceWith({ hours: '10 horas', task: FIRST_TASK, result: INITIAL_RESULT }, true)),
    );
  });

  it('keeps the new amount in its accessible name after the hours change', async () => {
    const { user } = renderHero({ isMotionReduced: true });

    await choose(user, HOURS_TRIGGER, '20 horas');

    expect(screen.getByRole('heading', { level: 1 })).toHaveAccessibleName(
      looseText(sentenceWith({ hours: '20 horas', task: FIRST_TASK, result: TWENTY_HOURS_RESULT }, true)),
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
    // Runs of text are bound by heroWords (see heroWords.test.ts), and the period after the task pill joins the pill:
    // "Sua", "equipe perde", the hours, "por", "semana com", the task and its period, "Automatizando, dá",
    // "pra recuperar", the result and "por mês." are the ten items.
    const itemCount = 10;
    expect(items).toHaveLength(itemCount);
    const words = homeCopy.hero.sentence
      .filter((part): part is string => typeof part === 'string')
      .flatMap((part) => part.split(/\s+/).filter(Boolean));
    const textItems = Array.from(items).filter((item) => !item.querySelector('button') && !/R\$/.test(item.textContent ?? ''));
    expect(textItems.flatMap((item) => plain(item.textContent).split(' ')).filter((word) => !/^[.,;:!?)]+$/.test(word))).toEqual(
      words.filter((word) => !/^[.,;:!?)]+$/.test(word)),
    );
  });

  it('wraps by itself: real spaces between inline items and no nowrap anywhere on the heading', () => {
    renderHero();

    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading.className).not.toMatch(/nowrap/);
    expect(heading.innerHTML).not.toMatch(/nowrap/);
    expect(plain(heading.textContent)).toContain(`${homeCopy.hero.sentence[0]} `);
    heading.querySelectorAll('[data-reveal-item]').forEach((item) => expect(item.className).toMatch(/inline-(block|flex)/));
    expect(screen.getByRole('button', { name: HOURS_TRIGGER })).toHaveClass('inline-flex');
    expect(screen.getByRole('button', { name: TASK_TRIGGER })).toHaveClass('inline-flex');
    expect(getResult()).toHaveClass('inline-flex');
  });

  it('puts the period right after the task pill, in the same item, so a line break cannot split them', () => {
    renderHero();

    const heading = screen.getByRole('heading', { level: 1 });
    expect(plain(heading.textContent)).toContain('planilha e WhatsApp. Automatizando');
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
    expect(plain(heading.textContent)).toContain(String(homeCopy.hero.sentence[0]));
  });
});

describe('HeroSentence line layout', () => {
  // jsdom has no layout, so the classes are pinned here and the e2e spec (hero.spec.ts) measures the real lines.
  it('makes the item with the period a flex row that lines up the last baseline, where the pill shrinks and the period keeps its room', () => {
    renderHero();

    const taskPill = screen.getByRole('button', { name: TASK_TRIGGER });
    const item = taskPill.closest('[data-reveal-item]') as HTMLElement;
    expect(item).toHaveClass('inline-flex', 'items-baseline-last', 'max-w-full');
    expect(taskPill).toHaveClass('min-w-0');
    // A percentage cap resolved against the item, which is only as wide as the pill and the period, cut the pill short.
    expect(taskPill.className).not.toMatch(/max-w-\[calc/);
  });

  it('puts the period in the item as a plain box that never shrinks, with no height or padding of its own', () => {
    renderHero();

    const item = screen.getByRole('button', { name: TASK_TRIGGER }).closest('[data-reveal-item]') as HTMLElement;
    const period = item.lastElementChild as HTMLElement;
    expect(period).toHaveTextContent('.');
    expect(period).toHaveClass('shrink-0');
    // The period lined up by a fixed minimum height sat 2.8px off the last line of a wrapped pill.
    expect(period.className).not.toMatch(/min-h|items-center|py-|border/);
  });

  it('keeps the last two words of each run together, and a short or comma ended first word with the next, so no plain word is alone on a line (V:D10, R7)', () => {
    renderHero();

    const heading = screen.getByRole('heading', { level: 1 });
    const items = Array.from(heading.querySelectorAll<HTMLElement>('[data-reveal-item]')).map((item) => item.textContent);
    expect(items).toContain('por mês.');
    expect(items).toContain('pra recuperar');
    expect(items).toContain('equipe perde');
    expect(items).toContain('semana com');
    expect(items).toContain('Automatizando, dá');
  });

  it('balances the lines of the heading, so the last line is never a lone word', () => {
    renderHero();

    expect(screen.getByRole('heading', { level: 1 })).toHaveClass('[text-wrap:balance]');
  });

  it('caps the smallest size with the width, so a long word still fits a 280px phone with the larger font (R7)', () => {
    renderHero();

    expect(screen.getByRole('heading', { level: 1 }).className).toContain('clamp(min(1.75rem,9vw),0.95rem+2.9vw,3.75rem)');
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

  it('hides every word, lowered and without a blur filter, until the sentence comes into view (R:M27)', () => {
    renderHero();

    getItems().forEach((item) => {
      expect(item.style.opacity).toBe('0');
      expect(item.style.transform).toBe('translateY(32px)');
      expect(item.style.filter).toBe('');
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
    items.forEach((item) => expect(item.style.filter).toBe(''));
  });

  it('shows the whole sentence at once, with no hidden style, when motion is reduced', () => {
    renderHero({ isMotionReduced: true });

    getItems().forEach((item) => expect(item).not.toHaveAttribute('style'));
  });
});

describe('HeroFinePrint', () => {
  it('shows the approved fine print, as small text', () => {
    renderWithProviders(<HeroFinePrint />);

    expect(screen.getByText(homeCopy.hero.finePrint.replace(/\u00a0/g, ' '))).toHaveClass('text-sm');
  });

  it('states the same rate and share the result is computed with', () => {
    renderWithProviders(<HeroFinePrint />);

    const text = homeCopy.hero.finePrint;
    expect(text).toContain(`R$\u00a0${DEFAULT_HOURLY_RATE} por hora`);
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

    const note = screen.getByText('mexe nos números aí', { exact: false });
    expect(note.closest('[data-hero-annotation]')).toHaveClass('hidden', 'lg:flex');
    expect(note).toHaveTextContent('// mexe nos números aí');
  });

  it('draws the // as a comment glyph that a screen reader skips, and keeps the words readable (U31)', () => {
    renderWithProviders(<HeroAnnotation />);

    const note = screen.getByText('mexe nos números aí', { exact: false });
    const glyph = note.querySelector('[aria-hidden="true"]');
    expect(glyph).toHaveTextContent('//');
    const spoken = Array.from(note.childNodes)
      .filter((node) => node !== glyph)
      .map((node) => node.textContent)
      .join('')
      .trim();
    expect(spoken).toBe('mexe nos números aí');
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
