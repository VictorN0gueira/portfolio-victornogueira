import type { ReactNode } from 'react';
import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../../test/render';
import MotionProvider from './MotionProvider';

interface CapturedConfigProps {
  reducedMotion?: 'user' | 'always' | 'never';
  children?: ReactNode;
}

const captured = vi.hoisted(() => ({ props: undefined as CapturedConfigProps | undefined }));

vi.mock('motion/react', () => ({
  MotionConfig: (props: CapturedConfigProps) => {
    captured.props = props;
    return <>{props.children}</>;
  },
}));

const STORAGE_KEY = 'a11y-preferences';

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
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ noAnimations: true }));

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
});
