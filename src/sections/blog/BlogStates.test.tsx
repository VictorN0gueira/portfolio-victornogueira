import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { blogCopy } from './blogCopy';
import { EmptyState, ErrorState, NoMatchState } from './BlogStates';

describe('the titles of the states of the list', () => {
  it.each([
    ['the error', <ErrorState key="e" />, blogCopy.states.errorTitle],
    ['the empty list', <EmptyState key="m" />, blogCopy.states.emptyTitle],
    ['the filters that match nothing', <NoMatchState key="n" onClear={vi.fn()} />, blogCopy.states.noMatchTitle],
  ])('is lowercased by CSS like every title of the site: %s', (_name, state, title) => {
    render(state);

    const element = screen.getByText(title);
    expect(element).toHaveClass('lowercase', 'font-display', 'font-bold');
  });

  it('keeps the error and the empty titles as h2, one level under the h1', () => {
    const { unmount } = render(<ErrorState />);
    expect(screen.getByRole('heading', { level: 2, name: blogCopy.states.errorTitle })).toBeInTheDocument();
    unmount();
    render(<EmptyState />);
    expect(screen.getByRole('heading', { level: 2, name: blogCopy.states.emptyTitle })).toBeInTheDocument();
  });
});

describe('ErrorState for assistive technology', () => {
  it('is announced when it appears: an alert that carries the reason', () => {
    render(<ErrorState />);

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent(blogCopy.states.errorTitle);
    expect(alert).toHaveTextContent(blogCopy.states.errorFallback);
  });

  it('is the only alert of the states: the empty list and the filters that match nothing are plain text', () => {
    const { unmount } = render(<EmptyState />);
    expect(screen.queryByRole('alert')).toBeNull();
    unmount();
    render(<NoMatchState onClear={vi.fn()} />);
    expect(screen.queryByRole('alert')).toBeNull();
  });
});
