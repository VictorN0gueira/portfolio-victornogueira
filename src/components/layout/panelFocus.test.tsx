import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { shellCopy } from '../../data/shellCopy';
import { ErrorBoundary } from './ErrorBoundary';
import { SectionError } from './SectionError';

const state = { shouldThrow: false };

function Bomb() {
  if (state.shouldThrow) throw new Error('render failed');
  return <p>conteúdo</p>;
}

const pageTree = () => (
  <main tabIndex={-1} aria-label="página">
    <input aria-label="campo fora" />
    <ErrorBoundary>
      <Bomb />
    </ErrorBoundary>
  </main>
);

const sectionTree = () => (
  <div>
    <input aria-label="campo fora" />
    <ErrorBoundary fallback={(retry) => <SectionError heightClassName="min-h-40" onRetry={retry} />}>
      <Bomb />
    </ErrorBoundary>
  </div>
);

beforeEach(() => {
  state.shouldThrow = false;
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('focus in the recovery panel', () => {
  it('goes to the heading of the page panel when it appears and nothing holds the focus', () => {
    state.shouldThrow = true;
    render(pageTree());

    expect(document.activeElement).toBe(screen.getByRole('heading', { name: shellCopy.errorBoundary.heading }));
  });

  it('goes there too when the focus sits on the main landmark that holds the panel (focus moved there on a route change)', () => {
    const view = render(pageTree());
    screen.getByRole('main').focus();
    state.shouldThrow = true;

    view.rerender(pageTree());

    expect(document.activeElement).toBe(screen.getByRole('heading', { name: shellCopy.errorBoundary.heading }));
  });

  it('moves the focus without scrolling the page', () => {
    const focus = vi.spyOn(HTMLElement.prototype, 'focus');
    state.shouldThrow = true;

    render(pageTree());

    expect(focus).toHaveBeenCalledWith({ preventScroll: true });
  });

  it('is not taken from a field the visitor is in', () => {
    const view = render(pageTree());
    const field = screen.getByLabelText('campo fora');
    field.focus();
    state.shouldThrow = true;

    view.rerender(pageTree());

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(document.activeElement).toBe(field);
  });

  it('stays in the panel after a retry that fails again, and does not fall to the body', async () => {
    const user = userEvent.setup();
    state.shouldThrow = true;
    render(pageTree());

    await user.click(screen.getByRole('button', { name: shellCopy.errorBoundary.retry }));

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(document.activeElement).not.toBe(document.body);
    expect(document.activeElement).toBe(screen.getByRole('heading', { name: shellCopy.errorBoundary.heading }));
  });

  it('does the same in the panel of a section', async () => {
    const user = userEvent.setup();
    state.shouldThrow = true;
    render(sectionTree());
    const heading = screen.getByText(shellCopy.sectionError.heading);
    expect(document.activeElement).toBe(heading);

    await user.click(screen.getByRole('button', { name: shellCopy.sectionError.retry }));

    expect(document.activeElement).toBe(screen.getByText(shellCopy.sectionError.heading));
  });

  it('works under StrictMode, with one panel', () => {
    state.shouldThrow = true;
    render(pageTree(), { reactStrictMode: true });

    expect(screen.getAllByRole('alert')).toHaveLength(1);
    expect(document.activeElement).toBe(screen.getByRole('heading', { name: shellCopy.errorBoundary.heading }));
  });
});
