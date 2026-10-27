import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import SkipLink from './SkipLink';

function renderSkipLink() {
  render(
    <>
      <SkipLink />
      <button type="button">outro controle</button>
      <main id="main-content" tabIndex={-1}>
        conteudo
      </main>
    </>,
  );
  return screen.getByRole('link', { name: 'Pular para o conteúdo' });
}

describe('SkipLink', () => {
  it('points at the main landmark', () => {
    const link = renderSkipLink();

    expect(link).toHaveAttribute('href', '#main-content');
  });

  it('is the first element to take focus', async () => {
    const user = userEvent.setup();
    const link = renderSkipLink();

    await user.tab();

    expect(link).toHaveFocus();
  });

  it('stays out of sight until it has focus, then shows with a focus ring', () => {
    const link = renderSkipLink();

    expect(link).toHaveClass('sr-only', 'focus:not-sr-only', 'focus:fixed', 'focus:z-[200]');
    expect(link).toHaveClass('focus-visible:outline-2', 'focus-visible:outline-vn-ink');
  });

  it('moves the focus to the main landmark without changing the URL hash', async () => {
    const user = userEvent.setup();
    const link = renderSkipLink();

    await user.click(link);

    expect(screen.getByRole('main')).toHaveFocus();
    expect(window.location.hash).toBe('');
  });

  it('keeps the default link behavior when there is no main landmark to focus', async () => {
    const user = userEvent.setup();
    render(<SkipLink />);

    await user.click(screen.getByRole('link', { name: 'Pular para o conteúdo' }));

    expect(window.location.hash).toBe('#main-content');
    window.history.replaceState(null, '', '/');
  });
});
