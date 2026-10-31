import { fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { FINE_POINTER_QUERY, REDUCED_MOTION_QUERY, stubMatchMedia } from '../../test/matchMedia';
import { renderWithProviders } from '../../test/render';
import { SpotlightCard } from './SpotlightCard';
import { A11Y_STORAGE_KEY } from '../../contexts/AccessibilityContext';
import { stubRect } from '../../test/rect';

describe('SpotlightCard', () => {
  afterEach(() => {
    localStorage.clear();
  });

  describe('markup', () => {
    it('renders an article with the vn-spotlight class by default', () => {
      stubMatchMedia();

      renderWithProviders(<SpotlightCard>conteudo</SpotlightCard>);

      const card = screen.getByRole('article');
      expect(card).toHaveClass('vn-spotlight');
      expect(card).toHaveTextContent('conteudo');
    });

    it('renders the requested tag', () => {
      stubMatchMedia();

      const { container } = renderWithProviders(<SpotlightCard as="li">item</SpotlightCard>);

      expect(container.firstElementChild?.tagName).toBe('LI');
    });

    it('accepts only intrinsic tags for as, because a component might not forward the ref or the pointer handler', () => {
      const NotATag = () => null;

      // @ts-expect-error a component is not an intrinsic tag
      const rejected = <SpotlightCard as={NotATag}>conteudo</SpotlightCard>;

      expect(rejected).toBeDefined();
    });

    it('merges a consumer className', () => {
      stubMatchMedia();

      renderWithProviders(<SpotlightCard className="rounded-3xl p-6">conteudo</SpotlightCard>);

      expect(screen.getByRole('article')).toHaveClass('vn-spotlight', 'rounded-3xl', 'p-6');
    });

    it('is the light tone by default and the dark tone on request', () => {
      stubMatchMedia();

      renderWithProviders(
        <>
          <SpotlightCard>claro</SpotlightCard>
          <SpotlightCard tone="dark">escuro</SpotlightCard>
        </>,
      );
      const [light, dark] = screen.getAllByRole('article');

      expect(light).not.toHaveClass('vn-spotlight--dark');
      expect(dark).toHaveClass('vn-spotlight', 'vn-spotlight--dark');
    });
  });

  describe('pointer variables', () => {
    it('writes --mx and --my relative to the card with a fine pointer', () => {
      stubMatchMedia({ [FINE_POINTER_QUERY]: true });
      renderWithProviders(<SpotlightCard>conteudo</SpotlightCard>);
      const card = screen.getByRole('article');
      stubRect(card);

      fireEvent.pointerMove(card, { clientX: 60, clientY: 70 });

      expect(card.style.getPropertyValue('--mx')).toBe('50px');
      expect(card.style.getPropertyValue('--my')).toBe('50px');
    });

    it.each(['li', 'div', 'section'] as const)('writes --mx and --my on the %s tag too, with a fine pointer', (tag) => {
      stubMatchMedia({ [FINE_POINTER_QUERY]: true });
      const { container } = renderWithProviders(<SpotlightCard as={tag}>conteudo</SpotlightCard>);
      const card = container.firstElementChild as HTMLElement;
      stubRect(card);

      fireEvent.pointerMove(card, { clientX: 60, clientY: 70 });

      expect(card.tagName).toBe(tag.toUpperCase());
      expect(card.style.getPropertyValue('--mx')).toBe('50px');
      expect(card.style.getPropertyValue('--my')).toBe('50px');
    });

    it('writes nothing without a fine pointer (touch)', () => {
      stubMatchMedia();
      renderWithProviders(<SpotlightCard>conteudo</SpotlightCard>);
      const card = screen.getByRole('article');
      stubRect(card);

      fireEvent.pointerMove(card, { clientX: 60, clientY: 70 });

      expect(card.style.getPropertyValue('--mx')).toBe('');
      expect(card.style.getPropertyValue('--my')).toBe('');
    });

    it('writes nothing when the system asks for reduced motion, even with a fine pointer', () => {
      stubMatchMedia({ [FINE_POINTER_QUERY]: true, [REDUCED_MOTION_QUERY]: true });
      renderWithProviders(<SpotlightCard>conteudo</SpotlightCard>);
      const card = screen.getByRole('article');
      stubRect(card);

      fireEvent.pointerMove(card, { clientX: 60, clientY: 70 });

      expect(card.style.getPropertyValue('--mx')).toBe('');
    });

    it('writes nothing when the accessibility toggle paused animations', () => {
      stubMatchMedia({ [FINE_POINTER_QUERY]: true });
      localStorage.setItem(A11Y_STORAGE_KEY, JSON.stringify({ noAnimations: true }));
      renderWithProviders(<SpotlightCard>conteudo</SpotlightCard>);
      const card = screen.getByRole('article');
      stubRect(card);

      fireEvent.pointerMove(card, { clientX: 60, clientY: 70 });

      expect(card.style.getPropertyValue('--my')).toBe('');
    });
  });
});
