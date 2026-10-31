import type { ReactNode } from 'react';
import { screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { m, motion } from 'motion/react';
import { renderWithProviders } from '../../test/render';
import MotionProvider from './MotionProvider';
import { A11Y_STORAGE_KEY } from '../../contexts/AccessibilityContext';

interface CapturedConfigProps {
  reducedMotion?: 'user' | 'always' | 'never';
  children?: ReactNode;
}

const captured = vi.hoisted(() => ({ props: undefined as CapturedConfigProps | undefined }));

// The real library, with only MotionConfig wrapped so a test can read the reduced motion policy it is given.
vi.mock('motion/react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('motion/react')>();
  return {
    ...actual,
    MotionConfig: (props: CapturedConfigProps & { children?: ReactNode }) => {
      captured.props = props;
      return <actual.MotionConfig {...props} />;
    },
  };
});

describe('MotionProvider', () => {
  beforeEach(() => {
    captured.props = undefined;
    localStorage.clear();
  });

  it('follows the system preference by default', () => {
    renderWithProviders(<MotionProvider>conteudo</MotionProvider>);

    expect(captured.props?.reducedMotion).toBe('user');
  });

  it('always reduces motion when the accessibility toggle turned animations off', () => {
    localStorage.setItem(A11Y_STORAGE_KEY, JSON.stringify({ noAnimations: true }));

    renderWithProviders(<MotionProvider>conteudo</MotionProvider>);

    expect(captured.props?.reducedMotion).toBe('always');
  });

  it('renders its children', () => {
    renderWithProviders(
      <MotionProvider>
        <p>dentro do provider</p>
      </MotionProvider>,
    );

    expect(screen.getByText('dentro do provider')).toBeInTheDocument();
  });

  it('gives the m components the animation features: an animate prop reaches its target', async () => {
    renderWithProviders(
      <MotionProvider>
        <m.div data-testid="box" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0 }} />
      </MotionProvider>,
    );

    await waitFor(() => expect(screen.getByTestId('box').style.opacity).toBe('1'));
  });

  it('is strict: the full motion component throws, so it cannot tree shake back in unnoticed', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    expect(() =>
      renderWithProviders(
        <MotionProvider>
          <motion.div />
        </MotionProvider>,
      ),
    ).toThrow(/LazyMotion/);

    consoleError.mockRestore();
  });
});
