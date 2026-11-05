import { screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { founderVoice } from './founderVoice';
import { stubMatchMedia } from '../../test/matchMedia';
import { renderWithProviders } from '../../test/render';
import { Specialties } from './Specialties';

describe('Specialties', () => {
  beforeEach(() => {
    stubMatchMedia();
  });

  it('names the section by the h2 "Minhas Especialidades" and puts each specialty at h3', () => {
    renderWithProviders(<Specialties />);

    const section = screen.getByRole('region', { name: 'Minhas Especialidades' });

    expect(within(section).getByRole('heading', { level: 2, name: 'Minhas Especialidades' })).toBeInTheDocument();
    expect(within(section).getAllByRole('heading', { level: 3 }).map((title) => title.textContent)).toEqual(
      founderVoice.specialties.map((specialty) => specialty.title),
    );
    expect(screen.queryAllByRole('heading', { level: 4 })).toHaveLength(0);
  });

  it('lists the three specialties in order, each with its line, ending in a period', () => {
    renderWithProviders(<Specialties />);

    const items = screen.getAllByRole('listitem');

    expect(items).toHaveLength(3);
    founderVoice.specialties.forEach((specialty, position) => {
      expect(items[position]).toHaveTextContent(specialty.desc);
      expect(specialty.desc.endsWith('.')).toBe(true);
    });
  });

  it('keeps the list a list for screen readers (role="list") and hides the numbers, which the list already says', () => {
    const { container } = renderWithProviders(<Specialties />);

    expect(screen.getByRole('list')).toHaveAttribute('role', 'list');
    expect(container.querySelectorAll('[aria-hidden="true"]').length).toBeGreaterThanOrEqual(6);
    for (const specialty of founderVoice.specialties) {
      const number = screen.getByText(specialty.id);
      expect(number).toHaveAttribute('aria-hidden', 'true');
      expect(number).toHaveClass('font-mono');
    }
  });

  it('paints the icons in ink and gives no specialty its own color', () => {
    const { container } = renderWithProviders(<Specialties />);

    expect(container.querySelectorAll('svg')).toHaveLength(3);
    expect(container.innerHTML).not.toMatch(/zinc|italic|dark:|vn-accent|color:|#[0-9a-f]{6}/i);
  });

  it('keeps the small gray lines readable: dark gray, never the mid gray', () => {
    renderWithProviders(<Specialties />);

    for (const line of founderVoice.specialties.map((specialty) => screen.getByText(specialty.desc))) {
      expect(line).toHaveClass('text-vn-gray-dark');
    }
  });
});
