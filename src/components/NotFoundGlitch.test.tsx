import { describe, expect, it } from 'vitest';
import { blockBody, declarations } from '../test/css';
import { componentsCss, motionCss, ruleBodyFor } from '../test/styles';
import { renderWithProviders } from '../test/render';
import { NotFoundGlitch } from './NotFoundGlitch';

function renderGlitch(): HTMLElement {
  const { container } = renderWithProviders(<NotFoundGlitch />);
  return container.firstElementChild as HTMLElement;
}

describe('NotFoundGlitch', () => {
  it('is decoration: hidden from assistive tech, so the 404 is never read twice', () => {
    expect(renderGlitch()).toHaveAttribute('aria-hidden', 'true');
  });

  it('draws the number three times: the chrome base and the two shifted layers', () => {
    const glitch = renderGlitch();
    const layers = Array.from(glitch.children);

    expect(layers).toHaveLength(3);
    layers.forEach((layer) => expect(layer.textContent).toBe('404'));
    expect(layers[0]).toHaveClass('vn-chrome-text');
    expect(layers[1]).toHaveClass('vn-glitch-a', 'text-vn-white', 'absolute', 'inset-0');
    expect(layers[2]).toHaveClass('vn-glitch-b', 'text-vn-gray-mid', 'absolute', 'inset-0');
  });

  it('uses only the palette: no color family outside it, no gradient besides the chrome text, no blur', () => {
    const glitch = renderGlitch();

    expect(glitch.outerHTML).not.toMatch(
      /emerald|purple|violet|cyan|zinc|slate|neutral|blue|green|red-|amber|gradient|blur/,
    );
  });
});

describe('the glitch in motion.css', () => {
  const KEYFRAMES = ['vn-glitch-a', 'vn-glitch-b'];

  it.each(KEYFRAMES)('has the %s keyframes, and they move only transform and clip-path', (name) => {
    const frames = blockBody(motionCss, `@keyframes ${name}`);

    expect(frames).not.toBe('');
    const properties = [...frames.matchAll(/([a-z-]+)\s*:/g)].map((match) => match[1]);
    expect(new Set(properties)).toEqual(new Set(['transform', 'clip-path']));
  });

  it.each(KEYFRAMES)('rests %s fully clipped, hidden behind the chrome base', (name) => {
    expect(declarations(ruleBodyFor(motionCss, `.${name}`).split('@variant')[0])).toContain(
      'clip-path: inset(0 0 100% 0)',
    );
  });

  it.each(KEYFRAMES)('stops %s when motion is off (the system preference or "Pausar animações")', (name) => {
    const stopped = blockBody(ruleBodyFor(motionCss, `.${name}`), '@variant vn-still');

    expect(declarations(stopped)).toContain('animation: none');
  });
});

// `animation: <name> <seconds>s <timing function: one word or "steps(1, end)"> <count>`.
// The count is a number, never "infinite".
const ANIMATION_TIMING = /animation: [\w-]+ ([\d.]+)s \S+(?: \S+)? (\d+)$/;

describe('what moves by itself stops by itself within 5 seconds (WCAG 2.2.2)', () => {
  // Anything that would go on longer is stopped by "Pausar animações" in the accessibility widget, which hides or
  // freezes every animation of the site. That is also what covers the scan line of the ScanGrid (two 8 s sweeps,
  // decorative, in every dark section): it is display none under the widget and under reduced motion.
  const MAX_MOVEMENT_MS = 5000;
  const animationOf = (css: string, selector: string, name: string) => {
    const line = declarations(ruleBodyFor(css, selector).split('@variant')[0]).find((item) =>
      item.startsWith(`animation: ${name} `),
    );
    const match = ANIMATION_TIMING.exec(line ?? '');
    if (!match) throw new Error(`no finite animation ${name} on ${selector}`);
    return { seconds: Number(match[1]), count: Number(match[2]) };
  };

  it.each([
    ['the cursor', componentsCss, '.vn-cursor', 'vn-blink'],
    ['the glitch layer a', motionCss, '.vn-glitch-a', 'vn-glitch-a'],
    ['the glitch layer b', motionCss, '.vn-glitch-b', 'vn-glitch-b'],
  ])('%s runs a counted number of times and ends within 5 seconds', (_label, css, selector, name) => {
    const { seconds, count } = animationOf(css, selector, name);

    expect(count).toBeGreaterThan(0);
    expect(seconds * count * 1000).toBeLessThanOrEqual(MAX_MOVEMENT_MS);
  });
});

describe('the glitch does not flash (WCAG 2.3.1)', () => {
  // The area argument: each band shows a sliver of the number, at most 30% of its box, and the number is a part of
  // the screen, so what changes at a time is far under the 25% of a 10 degree field that the general flash threshold
  // counts. The rate argument, tested below: no window of one second holds more than 6 changes of the picture, and a
  // change is one half of a flash, so at most 3 flashes in any second.
  const MAX_CHANGES_PER_SECOND = 6;
  const MAX_BAND_SHARE = 0.3;
  const WINDOW_MS = 1000;
  const LAYERS = [
    { name: 'vn-glitch-a', selector: '.vn-glitch-a' },
    { name: 'vn-glitch-b', selector: '.vn-glitch-b' },
  ];

  const stopsOf = (name: string) =>
    [...blockBody(motionCss, `@keyframes ${name}`).matchAll(/([\d.%,\s]+)\{([^}]*)\}/g)].flatMap(([, stops, body]) =>
      stops.split(',').map((stop) => ({ percent: Number.parseFloat(stop), body: body.trim() })),
    );

  /** The moments (ms from the start) at which the picture of one layer changes, over every iteration. */
  function changeTimes(name: string, selector: string): number[] {
    const rule =
      declarations(ruleBodyFor(motionCss, selector).split('@variant')[0]).find((item) =>
        item.startsWith('animation:'),
      ) ?? '';
    const [, seconds, count] = ANIMATION_TIMING.exec(rule) ?? [];
    const stops = stopsOf(name);
    const rest = stops[stops.length - 1].body;
    const times: number[] = [];
    let previous = rest;
    for (let iteration = 0; iteration < Number(count); iteration += 1) {
      for (const stop of stops) {
        if (stop.body !== previous) times.push((iteration + stop.percent / 100) * Number(seconds) * 1000);
        previous = stop.body;
      }
    }
    return times;
  }

  it('changes at most 6 times in any window of one second, the two layers together, over every iteration', () => {
    const times = LAYERS.flatMap(({ name, selector }) => changeTimes(name, selector)).sort((a, b) => a - b);

    expect(times.length).toBeGreaterThan(0);
    for (const start of times) {
      const inWindow = times.filter((time) => time >= start && time < start + WINDOW_MS).length;
      expect(inWindow, `window at ${Math.round(start)} ms`).toBeLessThanOrEqual(MAX_CHANGES_PER_SECOND);
    }
  });

  it.each(LAYERS)('shows %s only through bands of at most 30% of the height of the number', ({ name }) => {
    for (const { body } of stopsOf(name)) {
      const inset = /clip-path:\s*inset\(([\d.]+)% 0 ([\d.]+)% 0\)/.exec(body);
      if (!inset) continue;
      const share = (100 - Number(inset[1]) - Number(inset[2])) / 100;
      expect(share).toBeLessThanOrEqual(MAX_BAND_SHARE);
    }
  });
});
