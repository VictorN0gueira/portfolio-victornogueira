import { describe, expect, it } from 'vitest';
import { blockBody, declarations } from '../test/css';
import { motionCss, ruleBodyFor } from '../test/styles';
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

  it.each(KEYFRAMES)('runs %s a few times (not forever) and rests hidden behind the chrome base', (name) => {
    const rule = declarations(ruleBodyFor(motionCss, `.${name}`).split('@variant')[0]);

    expect(rule).toContain('clip-path: inset(0 0 100% 0)');
    const animation = rule.find((line) => line.startsWith('animation:')) ?? '';
    expect(animation).toMatch(new RegExp(`${name} [\\d.]+s steps\\(1, end\\) [1-5]$`));
  });

  it.each(KEYFRAMES)('stops %s when motion is off (the system preference or "Pausar animações")', (name) => {
    const stopped = blockBody(ruleBodyFor(motionCss, `.${name}`), '@variant vn-still');

    expect(declarations(stopped)).toContain('animation: none');
  });
});
