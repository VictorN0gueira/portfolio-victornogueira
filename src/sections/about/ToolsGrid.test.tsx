import { screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { aboutCopy } from '../../data/aboutCopy';
import { toolCategories } from '../../data/tools';
import { stubMatchMedia } from '../../test/matchMedia';
import { renderWithProviders } from '../../test/render';
import { ToolsGrid } from './ToolsGrid';
import { toolMarks } from './toolMarks';

const ACCENT = '#00e5a0';
const ALL_TOOLS = toolCategories.flatMap((category) => category.tools);

/** The cell of a tool, found by the name it shows (a list item takes no name from its content). */
const tileOf = (name: string): HTMLElement => screen.getByText(name).closest('li') as HTMLElement;

describe('toolMarks', () => {
  it('has a mark for every tool: a path from the 24 by 24 box of Simple Icons and the brand color', () => {
    for (const tool of ALL_TOOLS) {
      const mark = toolMarks[tool.id];

      expect(mark, tool.name).toBeDefined();
      expect(mark.path, tool.name).toMatch(/^[Mm][\d.\s-]/);
      expect(mark.brand, tool.name).toMatch(/^#[0-9A-F]{6}$/);
    }
    expect(Object.keys(toolMarks).sort()).toEqual(ALL_TOOLS.map((tool) => tool.id).sort());
  });

  it('never uses the accent color of the site as the color of a brand', () => {
    expect(Object.values(toolMarks).filter((mark) => mark.brand.toLowerCase() === ACCENT)).toEqual([]);
  });

  it('gives every tool a different drawing', () => {
    const paths = Object.values(toolMarks).map((mark) => mark.path);

    expect(new Set(paths).size).toBe(paths.length);
  });
});

describe('ToolsGrid', () => {
  beforeEach(() => {
    stubMatchMedia();
  });

  it('is a cream section named by the h2 "Stack tecnológica", with the kicker and the lead of the copy module', () => {
    renderWithProviders(<ToolsGrid />);

    const section = screen.getByRole('region', { name: aboutCopy.tools.heading });

    expect(section).toHaveAttribute('data-tone', 'cream');
    expect(within(section).getAllByRole('heading', { level: 2 })).toHaveLength(1);
    expect(within(section).getByText(aboutCopy.tools.kicker)).toBeInTheDocument();
    expect(within(section).getByText(aboutCopy.tools.lead)).toBeInTheDocument();
  });

  it('has one h3 per category, with its line, and never a heading of level 4', () => {
    renderWithProviders(<ToolsGrid />);

    expect(screen.getAllByRole('heading', { level: 3 }).map((title) => title.textContent)).toEqual(
      toolCategories.map((category) => category.title),
    );
    for (const category of toolCategories) {
      expect(screen.getByText(category.description)).toBeInTheDocument();
    }
    expect(screen.queryAllByRole('heading', { level: 4 })).toHaveLength(0);
  });

  it('lists the 14 tools by name, in lists named by their category', () => {
    renderWithProviders(<ToolsGrid />);

    expect(screen.getAllByRole('listitem')).toHaveLength(14);
    for (const category of toolCategories) {
      const list = screen.getByRole('list', { name: category.title });

      expect(
        within(list)
          .getAllByRole('listitem')
          .map((item) => item.textContent),
      ).toEqual(category.tools.map((tool) => tool.name));
    }
  });

  it('hides every logo from assistive tech: the name beside it is the accessible name', () => {
    const { container } = renderWithProviders(<ToolsGrid />);

    const marks = container.querySelectorAll('li svg');

    expect(marks).toHaveLength(14);
    for (const mark of marks) {
      expect(mark).toHaveAttribute('aria-hidden', 'true');
      expect(mark).toHaveAttribute('viewBox', '0 0 24 24');
      expect(mark).toHaveAttribute('fill', 'currentColor');
    }
    for (const tool of ALL_TOOLS) {
      expect(tileOf(tool.name)).toBeInTheDocument();
    }
  });

  it('draws each logo with the official path of its tool', () => {
    renderWithProviders(<ToolsGrid />);

    for (const tool of ALL_TOOLS) {
      const item = tileOf(tool.name);

      expect(item.querySelector('svg path')).toHaveAttribute('d', toolMarks[tool.id].path);
    }
  });

  it('shows the logos in the palette at rest and in the brand color on hover and on focus, which a keyboard reaches', () => {
    renderWithProviders(<ToolsGrid />);

    for (const tool of ALL_TOOLS) {
      const item = tileOf(tool.name);
      const mark = item.querySelector('svg') as SVGElement;

      expect(item, tool.name).toHaveAttribute('tabindex', '0');
      expect(item, tool.name).toHaveClass('group', 'vn-focus-ring-ink');
      expect(item.style.getPropertyValue('--vn-tool-brand').toLowerCase(), tool.name).toBe(
        toolMarks[tool.id].brand.toLowerCase(),
      );
      expect(mark, tool.name).toHaveClass(
        'text-vn-gray-dark',
        'group-hover:text-(color:--vn-tool-brand)',
        'group-focus:text-(color:--vn-tool-brand)',
      );
    }
  });

  it('has no inline color on the drawings, no accent, no dark: variant, no zinc and no italic', () => {
    const { container } = renderWithProviders(<ToolsGrid />);

    expect(container.querySelectorAll('svg [fill], svg [style], svg [stroke]')).toHaveLength(0);
    expect(container.innerHTML).not.toMatch(/vn-accent|dark:|zinc|italic|00e5a0/i);
  });

  it('has no marquee: fourteen items fit in a grid and do not need a pause control', () => {
    renderWithProviders(<ToolsGrid />);

    expect(screen.queryByRole('button')).toBeNull();
  });
});
