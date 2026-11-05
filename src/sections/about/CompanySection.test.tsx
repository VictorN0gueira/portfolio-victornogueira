import { screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { aboutCopy } from '../../data/aboutCopy';
import { stubMatchMedia } from '../../test/matchMedia';
import { renderWithProviders } from '../../test/render';
import { CompanySection } from './CompanySection';

describe('CompanySection', () => {
  beforeEach(() => {
    stubMatchMedia();
  });

  it('is a white section named by the h2 "A VN One", with the kicker above it', () => {
    renderWithProviders(<CompanySection />);

    const section = screen.getByRole('region', { name: 'A VN One' });

    expect(section).toHaveAttribute('data-tone', 'white');
    expect(within(section).getByRole('heading', { level: 2, name: 'A VN One' })).toBeInTheDocument();
    expect(within(section).getByText(aboutCopy.company.kicker)).toBeInTheDocument();
  });

  it('says what the company is, paragraph by paragraph, from the copy module', () => {
    renderWithProviders(<CompanySection />);

    for (const paragraph of aboutCopy.company.paragraphs) {
      expect(screen.getByText(paragraph)).toBeInTheDocument();
    }
  });

  it('lists how the team works under an h3, three rows with a title and a line each', () => {
    renderWithProviders(<CompanySection />);

    expect(screen.getByRole('heading', { level: 3, name: aboutCopy.company.howTitle })).toBeInTheDocument();
    const items = screen.getAllByRole('listitem');

    expect(items).toHaveLength(3);
    aboutCopy.company.how.forEach((row, position) => {
      expect(items[position]).toHaveTextContent(row.title);
      expect(items[position]).toHaveTextContent(row.text);
    });
  });

  it('keeps the list a list for screen readers and never skips a level (h2 then h3)', () => {
    renderWithProviders(<CompanySection />);

    expect(screen.getByRole('list')).toHaveAttribute('role', 'list');
    expect(screen.queryAllByRole('heading', { level: 4 })).toHaveLength(0);
  });

  it('uses the dark gray for the text, never the mid gray, and no accent, zinc, italic or dark: variant', () => {
    const { container } = renderWithProviders(<CompanySection />);

    expect(screen.getByText(aboutCopy.company.paragraphs[0])).toHaveClass('text-vn-gray-dark');
    expect(container.innerHTML).not.toMatch(/zinc|italic|dark:|vn-accent|text-vn-gray-mid/);
  });

  it('never says "chatbot"', () => {
    renderWithProviders(<CompanySection />);

    expect(document.body.textContent).not.toMatch(/chat[\s-]?bot/i);
  });
});
