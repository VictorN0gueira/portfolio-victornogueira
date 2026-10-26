import { describe, expect, it } from 'vitest';
import { renderWithProviders } from '../../test/render';
import Cursor from './Cursor';

function renderCursor(tone?: 'ink' | 'white' | 'accent'): HTMLElement {
  const { container } = renderWithProviders(<Cursor tone={tone} />);
  return container.firstElementChild as HTMLElement;
}

describe('Cursor', () => {
  it('is a decorative span hidden from assistive tech', () => {
    const cursor = renderCursor();

    expect(cursor.tagName).toBe('SPAN');
    expect(cursor).toHaveAttribute('aria-hidden', 'true');
  });

  it('is a half em by one em block that blinks through the vn-cursor class', () => {
    const cursor = renderCursor();

    expect(cursor).toHaveClass('vn-cursor', 'inline-block', 'w-[0.5em]', 'h-[1em]', 'align-[-0.1em]');
  });

  it('defaults to the ink tone', () => {
    expect(renderCursor()).toHaveClass('bg-vn-ink');
  });

  it.each([
    ['white', 'bg-vn-white'],
    ['accent', 'bg-vn-accent'],
    ['ink', 'bg-vn-ink'],
  ] as const)('paints the %s tone with %s', (tone, className) => {
    expect(renderCursor(tone)).toHaveClass(className);
  });

  it('has no text content', () => {
    expect(renderCursor()).toBeEmptyDOMElement();
  });

  it('merges a consumer className', () => {
    const { container } = renderWithProviders(<Cursor className="ml-1" />);

    expect(container.firstElementChild).toHaveClass('ml-1', 'vn-cursor');
  });
});
