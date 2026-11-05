import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { aboutCopy } from '../../data/aboutCopy';
import { toolCategories } from '../../data/tools';
import { stubMatchMedia } from '../../test/matchMedia';
import { renderWithProviders } from '../../test/render';
import { ToolsGrid } from './ToolsGrid';
import { TOOL_BRAND_COLORS, toolMarks } from './toolMarks';

const ACCENT = '#00e5a0';
const ALL_TOOLS = toolCategories.flatMap((category) => category.tools);
const HEX = /#[0-9A-Fa-f]{6}\b/g;

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
    expect(Object.values(TOOL_BRAND_COLORS).filter((color) => color.toLowerCase() === ACCENT)).toEqual([]);
  });

  it('gives every tool a different drawing', () => {
    const paths = Object.values(toolMarks).map((mark) => mark.path);

    expect(new Set(paths).size).toBe(paths.length);
  });

  it('keeps every brand hex of toolMarks.ts in one named map that a hygiene guard can read: the map is the only place the file writes a hex', () => {
    const source = readFileSync(resolve(__dirname, 'toolMarks.ts'), 'utf8');
    const literals = new Set(source.match(HEX));
    const mapped = new Set(Object.values(TOOL_BRAND_COLORS));

    expect(literals).toEqual(mapped);
    expect(Object.keys(TOOL_BRAND_COLORS).sort()).toEqual(ALL_TOOLS.map((tool) => tool.id).sort());
    for (const tool of ALL_TOOLS) {
      expect(toolMarks[tool.id].brand, tool.name).toBe(TOOL_BRAND_COLORS[tool.id]);
    }
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

  it('writes the heading in sentence case ("Stack tecnológica", the lowercase comes from CSS) and has no "Soluções completas"', () => {
    renderWithProviders(<ToolsGrid />);

    expect(aboutCopy.tools.heading).toBe('Stack tecnológica');
    expect(screen.getByRole('heading', { level: 2, name: 'Stack tecnológica' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /Stack Tecnológica/ })).toBeNull();
    expect(document.body.textContent).not.toMatch(/Soluções completas/);
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
      expect(tileOf(tool.name).querySelector('svg path')).toHaveAttribute('d', toolMarks[tool.id].path);
    }
  });

  it('shows the logos in the palette at rest and in the brand color on hover, only where a pointer can hover', () => {
    renderWithProviders(<ToolsGrid />);

    for (const tool of ALL_TOOLS) {
      const item = tileOf(tool.name);
      const mark = item.querySelector('svg') as SVGElement;

      expect(item, tool.name).toHaveClass('group');
      expect(item.style.getPropertyValue('--vn-tool-brand').toLowerCase(), tool.name).toBe(
        TOOL_BRAND_COLORS[tool.id].toLowerCase(),
      );
      expect(mark, tool.name).toHaveClass('text-vn-gray-dark', 'group-hover:text-(color:--vn-tool-brand)');
      // The hover variant of Tailwind only applies where the device can hover, so a tap leaves no stuck color on touch.
      expect(mark.getAttribute('class'), tool.name).not.toMatch(/focus/);
    }
  });

  it('keeps the tiles out of the tab order: they are not controls, and the brand color is only decoration', () => {
    const { container } = renderWithProviders(<ToolsGrid />);

    expect(container.querySelectorAll('[tabindex]')).toHaveLength(0);
    expect(container.querySelectorAll('a, button, input, select, textarea')).toHaveLength(0);
    expect(container.innerHTML).not.toMatch(/focus-visible|vn-focus-ring|group-focus/);
  });

  it('says in one small line that the logos belong to their owners', () => {
    renderWithProviders(<ToolsGrid />);

    const note = screen.getByText(aboutCopy.tools.trademarkNote);

    expect(note).toHaveClass('text-vn-gray-dark');
    expect(note.tagName).toBe('P');
  });

  it('has no inline color on the drawings, no accent, no dark: variant, no zinc and no italic', () => {
    const { container } = renderWithProviders(<ToolsGrid />);

    expect(container.querySelectorAll('svg [fill], svg [style], svg [stroke]')).toHaveLength(0);
    expect(container.innerHTML).not.toMatch(/vn-accent|dark:|zinc|italic|00e5a0/i);
  });

  it('has no marquee: no pause control, no duplicated copy of the tools, no animation that runs on its own', () => {
    const { container } = renderWithProviders(<ToolsGrid />);

    expect(screen.queryByRole('button')).toBeNull();
    // Every tool name once: a looping marquee repeats its items to close the loop.
    for (const tool of ALL_TOOLS) {
      expect(screen.getAllByText(tool.name), tool.name).toHaveLength(1);
    }
    expect(container.querySelectorAll('[aria-hidden="true"] li, [data-marquee], .animate-marquee')).toHaveLength(0);
    expect(container.innerHTML).not.toMatch(/marquee|animate-|@keyframes|infinite/i);
  });
});
