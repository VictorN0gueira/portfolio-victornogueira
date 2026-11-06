import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { legalCopy } from '../../data/legalCopy';
import { TocNav } from './TocNav';

const noop = vi.fn();

describe('TocNav before and after the titles were read', () => {
  it('draws the folded list as a closed row while the titles are not read yet, so the text below does not move later', () => {
    const { container } = render(<TocNav entries={null} activeId={null} onGo={noop} isWide={false} />);

    expect(screen.getByRole('navigation', { name: legalCopy.tocLabel })).toBeInTheDocument();
    expect(screen.getByText(legalCopy.tocLabel)).toBeInTheDocument();
    expect(container.querySelector('details')?.open).toBe(false);
    expect(screen.queryAllByRole('link', { hidden: true })).toHaveLength(0);
  });

  it('draws nothing for the sticky column until the titles are read (it sits beside the text and moves nothing)', () => {
    const { container } = render(<TocNav entries={null} activeId={null} onGo={noop} isWide />);

    expect(container).toBeEmptyDOMElement();
  });

  it('draws nothing when the titles were read and there are none', () => {
    const { container } = render(<TocNav entries={[]} activeId={null} onGo={noop} isWide={false} />);

    expect(container).toBeEmptyDOMElement();
  });
});
