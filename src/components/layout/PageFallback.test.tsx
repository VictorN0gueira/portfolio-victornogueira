import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { shellCopy } from '../../data/shellCopy';
import { PageFallback } from './PageFallback';

describe('PageFallback', () => {
  it('is a status region with text inside, so a screen reader has something to announce', () => {
    render(<PageFallback />);

    const status = screen.getByRole('status', { name: shellCopy.pageLoading });
    expect(status).toHaveTextContent(shellCopy.pageLoading);
  });

  it('shows the text only to assistive tech, the spinner is the picture', () => {
    render(<PageFallback />);

    expect(screen.getByText(shellCopy.pageLoading)).toHaveClass('sr-only');
  });

  it('keeps the full height of a page, so the swap of pages does not shift the footer', () => {
    render(<PageFallback />);

    expect(screen.getByRole('status')).toHaveClass('min-h-dvh');
  });
});
