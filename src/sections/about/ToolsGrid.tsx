import { useId, type CSSProperties } from 'react';
import { Container } from '../../components/ui/Container';
import { Heading } from '../../components/ui/Heading';
import { Kicker } from '../../components/ui/Kicker';
import { RevealGroup, RevealItem } from '../../components/ui/Reveal';
import { Section } from '../../components/ui/Section';
import { aboutCopy } from '../../data/aboutCopy';
import { toolCategories, type ToolId } from '../../data/tools';
import { cn } from '../../lib/utils';
import { toolMarks } from './toolMarks';

const { tools: copy } = aboutCopy;
const TILE_STAGGER_S = 0.04;

// The categories stack on a phone and a tablet and sit side by side from lg. Inside each one the tiles make two
// columns; with an odd number the last tile takes the whole row, so no cell is ever empty. From lg each category spans
// the same three rows (title, line, tiles) through a subgrid, so the tiles of the three columns start at the same height
// whatever the line above them wraps to. The grid draws the lines of its top and left edges and each tile closes itself
// with the line of its right and bottom edges.
const CATEGORIES_CLASSES =
  'mt-12 grid grid-cols-1 gap-12 md:mt-14 lg:grid-cols-3 lg:grid-rows-[auto_auto_1fr] lg:gap-x-8 lg:gap-y-0';
const CATEGORY_CLASSES = 'min-w-0 lg:row-span-3 lg:grid lg:grid-rows-subgrid';
const LIST_CLASSES = 'mt-6 grid grid-cols-2 border-t border-l border-vn-gray-light lg:self-start';
// The tile is not a control: it takes no focus and sits out of the tab order. The brand color of its logo is decoration
// (the name beside it carries the meaning), so it only shows where a pointer can hover.
const TILE_CLASSES =
  'group flex min-h-28 min-w-0 flex-col items-center justify-center border-r border-b border-vn-gray-light bg-vn-white p-4 text-center';
// At rest the mark is the text gray of the palette. The brand color arrives with hover, with no transition: only
// transform and opacity animate on this site, and a color swap needs no motion. The hover: variant of Tailwind only
// applies where the device can hover, so a tap on a phone leaves no color stuck on the logo.
const MARK_CLASSES = 'size-10 shrink-0 text-vn-gray-dark group-hover:text-(color:--vn-tool-brand)';

/** The official mark of a tool, filled with the current text color. Decorative: the name beside it names the tool. */
function ToolMark({ id }: { id: ToolId }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" focusable="false" aria-hidden="true" className={MARK_CLASSES}>
      <path d={toolMarks[id].path} />
    </svg>
  );
}

interface ToolTileProps {
  id: ToolId;
  name: string;
  /** With an odd number of tools the last tile takes the whole row. */
  isWide: boolean;
}

/** One tool: its mark and its name, in a white tile. The brand color is handed to the mark as a CSS variable. */
function ToolTile({ id, name, isWide }: ToolTileProps) {
  return (
    <li
      style={{ '--vn-tool-brand': toolMarks[id].brand } as CSSProperties}
      className={cn(TILE_CLASSES, isWide && 'col-span-2')}
    >
      <RevealItem variant="fade" className="flex min-w-0 flex-col items-center gap-3">
        <ToolMark id={id} />
        <span className="break-words font-mono text-sm text-vn-ink">{name}</span>
      </RevealItem>
    </li>
  );
}

interface ToolCategoryProps {
  category: (typeof toolCategories)[number];
  titleId: string;
}

/** One category: the h3, its line and the list of tiles, in one RevealGroup (one observer for the whole block). */
function ToolCategory({ category, titleId }: ToolCategoryProps) {
  const { tools } = category;

  return (
    <RevealGroup stagger={TILE_STAGGER_S} className={CATEGORY_CLASSES}>
      <Heading as="h3" size="m" id={titleId}>
        {category.title}
      </Heading>
      <p className="mt-2 text-pretty text-base text-vn-gray-dark">{category.description}</p>
      {/* role="list": Tailwind preflight removes the markers, and Safari then drops the list semantics. */}
      <ul role="list" aria-labelledby={titleId} className={LIST_CLASSES}>
        {tools.map((tool, position) => (
          <ToolTile
            key={tool.id}
            id={tool.id}
            name={tool.name}
            isWide={tools.length % 2 === 1 && position === tools.length - 1}
          />
        ))}
      </ul>
    </RevealGroup>
  );
}

/**
 * The tools VN One works with, on a cream section: the kicker, the h2 and the lead, then one block per category (an h3
 * and its line) with a grid of white tiles, each with the official mark of the tool and its name, and one small line that
 * says the logos belong to their owners. The marks are the gray of the palette at rest and take the brand color of the
 * tool on hover. No marquee: fourteen items fit in a grid and need no pause control (WCAG 2.2.2).
 */
export function ToolsGrid() {
  const headingId = useId();
  const baseId = useId();

  return (
    <Section tone="cream" labelledBy={headingId}>
      <Container>
        <RevealGroup>
          <RevealItem>
            <Kicker>{copy.kicker}</Kicker>
          </RevealItem>
          <RevealItem className="mt-6 max-w-4xl">
            <Heading id={headingId} size="l">
              {copy.heading}
            </Heading>
          </RevealItem>
          <RevealItem className="mt-6 max-w-2xl">
            <p className="text-pretty text-base text-vn-gray-dark md:text-lg">{copy.lead}</p>
          </RevealItem>
        </RevealGroup>
        <div className={CATEGORIES_CLASSES}>
          {toolCategories.map((category, position) => (
            <ToolCategory key={category.title} category={category} titleId={`${baseId}-${position}`} />
          ))}
        </div>
        <p className="mt-8 max-w-2xl text-pretty text-sm text-vn-gray-dark">{copy.trademarkNote}</p>
      </Container>
    </Section>
  );
}
