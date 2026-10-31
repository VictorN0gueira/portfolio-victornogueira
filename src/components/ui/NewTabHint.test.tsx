import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import NewTabHint, { NEW_TAB_HINT } from './NewTabHint';

describe('NewTabHint', () => {
  it('is hidden from the reading flow, with the id the links point at', () => {
    render(<NewTabHint id="hint" />);

    const hint = screen.getByText(NEW_TAB_HINT);
    expect(hint).toHaveAttribute('id', 'hint');
    expect(hint).toHaveAttribute('hidden');
  });

  it('is not a loose sentence for a screen reader in browse mode (it is hidden, not visually hidden)', () => {
    render(<NewTabHint id="hint" />);

    expect(screen.queryByText(NEW_TAB_HINT)).not.toBeVisible();
    expect(screen.queryByText(NEW_TAB_HINT)).not.toHaveClass('sr-only');
  });

  it('becomes the description of a link, and leaves its name alone', () => {
    render(
      <>
        <a href="https://example.com" target="_blank" rel="noopener noreferrer" aria-describedby="hint">
          Falar no WhatsApp
        </a>
        <NewTabHint id="hint" />
      </>,
    );

    const link = screen.getByRole('link', { name: 'Falar no WhatsApp' });
    expect(link).toHaveAccessibleDescription(NEW_TAB_HINT);
  });

  it('has no dash and no slash in the words', () => {
    expect(NEW_TAB_HINT).not.toMatch(/[\u2013\u2014]/);
    expect(NEW_TAB_HINT).not.toMatch(/\//);
  });
});
