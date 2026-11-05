import { screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { founderVoice } from './founderVoice';
import { stubMatchMedia } from '../../test/matchMedia';
import { renderWithProviders } from '../../test/render';
import { NEW_TAB_HINT } from '../../components/ui/NewTabHint';
import { FounderIntro } from './FounderIntro';

describe('FounderIntro', () => {
  beforeEach(() => {
    stubMatchMedia();
  });

  it('opens the page with the h1 "Sobre mim" and the place in the kicker', () => {
    renderWithProviders(<FounderIntro />);

    expect(screen.getByRole('heading', { level: 1, name: 'Sobre mim' })).toBeInTheDocument();
    expect(screen.getByText('Recife e remoto')).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/Remoto Global/);
  });

  it('says the two paragraphs of the founder, joining the highlighted phrases', () => {
    renderWithProviders(<FounderIntro />);

    expect(
      screen.getByText(
        (_, element) =>
          element?.tagName === 'P' &&
          element.textContent ===
            'Especialista em montar fluxos automatizados e inteligentes, sem precisar de equipes grandes.',
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        (_, element) =>
          element?.tagName === 'P' &&
          element.textContent ===
            'Foco em Inteligência Artificial e Desenvolvimento Web, para a operação gastar menos tempo com tarefa manual.',
      ),
    ).toBeInTheDocument();
  });

  it('highlights the two phrases in ink and medium weight, and keeps the paragraphs on the dark gray (7.5 to 1 on cream)', () => {
    renderWithProviders(<FounderIntro />);

    for (const phrase of ['automatizados e inteligentes', 'Inteligência Artificial e Desenvolvimento Web']) {
      expect(screen.getByText(phrase)).toHaveClass('font-medium', 'text-vn-ink');
    }
    const paragraph = screen.getByText(/Especialista em montar fluxos/);
    expect(paragraph.className).not.toMatch(/zinc|gray-mid/);
    expect(paragraph).toHaveClass('text-vn-gray-dark');
  });

  it('puts the text before the photo in the DOM, so a phone reads the founder first', () => {
    renderWithProviders(<FounderIntro />);

    const heading = screen.getByRole('heading', { level: 1 });
    const figure = screen.getByRole('figure');

    expect(heading.compareDocumentPosition(figure) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('downloads the CV from the site itself, in a new tab, and says so to a screen reader without renaming the link', () => {
    renderWithProviders(<FounderIntro />);

    const link = screen.getByRole('link', { name: founderVoice.cvLabel });

    expect(link.getAttribute('href')).toMatch(/\/cv\/cv-joao-victor-nogueira\.pdf$/);
    expect(link).toHaveAttribute('download', 'CV-Joao-Victor-Nogueira.pdf');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    expect(link).toHaveAccessibleDescription(NEW_TAB_HINT);
    expect(within(link).getByText(founderVoice.cvLabel)).toBeInTheDocument();
  });

  it('has no zinc, no italic, no dark: variant and no accent', () => {
    const { container } = renderWithProviders(<FounderIntro />);

    expect(container.innerHTML).not.toMatch(/zinc|italic|dark:|vn-accent/);
  });
});
