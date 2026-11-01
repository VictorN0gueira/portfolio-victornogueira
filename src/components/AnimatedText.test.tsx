import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { REDUCED_MOTION_QUERY, stubMatchMedia } from '../test/matchMedia';
import { renderWithProviders } from '../test/render';
import { AnimatedText } from './AnimatedText';
import { A11Y_STORAGE_KEY } from '../contexts/AccessibilityContext';

const OFFSET = 'translateY(18px)';

function firstLetterStyle(): string {
  return screen.getByText('O').getAttribute('style') ?? '';
}

describe('AnimatedText', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders every letter of the text', () => {
    stubMatchMedia();

    const { container } = renderWithProviders(<AnimatedText text="Olá mundo" />);

    // words are separated by a CSS gap, so the text content has no space between them
    expect(container.textContent).toContain('Olá');
    expect(container.textContent).toContain('mundo');
  });

  it('names its heading with the whole text once, and hides the letters from assistive technology', () => {
    stubMatchMedia();

    renderWithProviders(
      <h2>
        <AnimatedText text="Stack tecnológica" />
      </h2>,
    );

    expect(screen.getByRole('heading', { level: 2, name: 'Stack tecnológica' })).toBeInTheDocument();
    const letters = screen.getByText('S').closest('[aria-hidden="true"]');
    expect(letters).not.toBeNull();
    expect(letters?.textContent).toBe('Stacktecnológica');
  });

  it('starts letters offset below their place when motion is allowed', () => {
    stubMatchMedia();
    renderWithProviders(<AnimatedText text="Olá" />);

    expect(firstLetterStyle()).toContain(OFFSET);
  });

  it('starts letters in place when the system prefers reduced motion', () => {
    stubMatchMedia({ [REDUCED_MOTION_QUERY]: true });
    renderWithProviders(<AnimatedText text="Olá" />);

    expect(firstLetterStyle()).not.toContain(OFFSET);
  });

  it('starts letters in place when the accessibility toggle turns animations off', () => {
    stubMatchMedia();
    localStorage.setItem(A11Y_STORAGE_KEY, JSON.stringify({ noAnimations: true }));
    renderWithProviders(<AnimatedText text="Olá" />);

    expect(firstLetterStyle()).not.toContain(OFFSET);
  });
});
