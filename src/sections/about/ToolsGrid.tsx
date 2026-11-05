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
// columns; with an odd number the last tile takes the whole row, so no cell is ever empty. The grid draws the lines of
// its top and left edges and each tile closes itself with the line of its right and bottom edges.
const CATEGORIES_CLASSES = 'mt-12 grid grid-cols-1 gap-12 md:mt-14 lg:grid-cols-3 lg:gap-8';
const LIST_CLASSES = 'mt-6 grid grid-cols-2 border-t border-l border-vn-gray-light';
// The tile is focusable on purpose: the brand color a logo takes on hover has to be reachable by keyboard and by tap.
// The ring is drawn above the neighbours (z-10, local stacking) so a later tile does not cover it.
const TILE_CLASSES =
  'group relative flex min-h-28 min-w-0 flex-col items-center justify-center gap-3 border-r border-b border-vn-gray-light bg-vn-white p-4 text-center vn-focus-ring-ink focus-visible:z-10';
// At rest the mark is the text gray of the palette. The brand color arrives with hover and focus, with no transition:
// only transform and opacity animate on this site, and a color swap needs no motion.
const MARK_CLASSES =
  'size-10 shrink-0 text-vn-gray-dark group-hover:text-(color:--vn-tool-brand) group-focus:text-(color:--vn-tool-brand)';

/** The official mark of a tool, filled with the current text color. Decorative: the name beside it names the tool. */
function ToolMark({ id }: { id: ToolId }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" focusable="false" aria-hidden="true" className={MARK_CLASSES}>
      <path d={toolMarks[id].path} />
    </svg>
  );
}

/**
 * The tools VN One works with, on a cream section: the kicker, the h2 and the lead, then one block per category (an h3
 * and its line) with a grid of white tiles, each with the official mark of the tool and its name. The marks are the
 * gray of the palette at rest and take the brand color of the tool on hover and on focus (a tile takes the keyboard
 * focus, and a tap focuses it too). No marquee: fourteen items fit in a grid and need no pause control (WCAG 2.2.2).
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
          {toolCategories.map((category, categoryPosition) => {
            const titleId = `${baseId}-${categoryPosition}`;
            return (
              <RevealGroup key={category.title} stagger={TILE_STAGGER_S} className="min-w-0">
                <Heading as="h3" size="m" id={titleId}>
                  {category.title}
                </Heading>
                <p className="mt-2 text-pretty text-base text-vn-gray-dark">{category.description}</p>
                {/* role="list": Tailwind preflight removes the markers, and Safari then drops the list semantics. */}
                <ul role="list" aria-labelledby={titleId} className={LIST_CLASSES}>
                  {category.tools.map((tool, position) => {
                    const isLastOfOddRow = category.tools.length % 2 === 1 && position === category.tools.length - 1;
                    return (
                      <li
                        key={tool.id}
                        // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- the brand color of a logo has to be reachable by keyboard and by tap
                        tabIndex={0}
                        style={{ '--vn-tool-brand': toolMarks[tool.id].brand } as CSSProperties}
                        className={cn(TILE_CLASSES, isLastOfOddRow && 'col-span-2')}
                      >
                        <RevealItem variant="fade" className="flex min-w-0 flex-col items-center gap-3">
                          <ToolMark id={tool.id} />
                          <span className="break-words font-mono text-sm text-vn-ink">{tool.name}</span>
                        </RevealItem>
                      </li>
                    );
                  })}
                </ul>
              </RevealGroup>
            );
          })}
        </div>
      </Container>
    </Section>
  );
}
