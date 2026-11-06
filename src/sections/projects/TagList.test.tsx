import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderWithProviders } from '../../test/render';
import { TagList } from './TagList';

const TAGS = ['WhatsApp', 'SMTP', 'Google Maps'];

describe('TagList', () => {
  it('lists every tag, in order, in a list that keeps role="list"', () => {
    const { container } = renderWithProviders(<TagList tags={TAGS} />);

    const list = screen.getByRole('list');

    expect(list).toBe(container.querySelector('ul[role="list"]'));
    expect(
      within(list)
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toEqual(TAGS);
  });

  it('draws the chips in gray on a light surface and in light gray on a dark one', () => {
    const light = renderWithProviders(<TagList tags={TAGS} />);
    expect(screen.getAllByRole('listitem')[0].className).toContain('text-vn-gray-dark');
    light.unmount();

    renderWithProviders(<TagList tags={TAGS} tone="dark" />);
    expect(screen.getAllByRole('listitem')[0].className).toContain('text-vn-gray-light');
  });

  it('passes the class of the list through', () => {
    renderWithProviders(<TagList tags={TAGS} className="mt-6" />);

    expect(screen.getByRole('list').className).toContain('mt-6');
  });
});
