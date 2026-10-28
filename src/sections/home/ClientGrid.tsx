import { useId } from 'react';
import { Kicker } from '../../components/ui/Kicker';
import { RevealGroup, RevealItem } from '../../components/ui/Reveal';
import { homeCopy } from '../../data/homeCopy';
import { partners } from '../../data/partners';
import { cn } from '../../lib/utils';
import { LogoImage } from './LogoImage';

// The grid has 2 columns, 3 from md and 5 from lg. Every cell closes itself with a line on its right and bottom and the
// grid draws the line of the top and left edges, so a row of any length ends with a line.
const LIST_CLASSES =
  'mt-6 grid grid-cols-2 border-t border-l border-vn-gray-light md:grid-cols-3 lg:grid-cols-5';
const CELL_CLASSES = 'border-r border-b border-vn-gray-light';
const LOGO_CELL_CLASSES = `vn-logo-host flex min-h-24 min-w-0 items-center justify-center bg-vn-white p-4 ${CELL_CLASSES}`;
// The logo box is fixed (48px high, the width of the cell), so a logo that fails to load changes nothing around it.
const LOGO_CLASSES = 'h-12 w-full vn-logo-tone';
const LOGO_WIDTH = 160;
const LOGO_HEIGHT = 48;
// The time between one logo and the next, in seconds.
const LOGO_STAGGER_S = 0.05;

type Breakpoint = 'base' | 'md' | 'lg';

const COLUMNS: Record<Breakpoint, number> = { base: 2, md: 3, lg: 5 };
const BREAKPOINTS = Object.keys(COLUMNS) as Breakpoint[];
// Whole class names, written out so Tailwind finds them in the source.
const DISPLAY: Record<Breakpoint, { shown: string; hidden: string }> = {
  base: { shown: 'block', hidden: 'hidden' },
  md: { shown: 'md:block', hidden: 'md:hidden' },
  lg: { shown: 'lg:block', hidden: 'lg:hidden' },
};

/** How many empty cells the last row of `count` items still needs to be whole in `columns` columns. */
function missingCells(count: number, columns: number): number {
  return (columns - (count % columns)) % columns;
}

/**
 * The display classes of the filler cells that complete the last row at every breakpoint. The k-th filler shows at a
 * breakpoint only when the last row there is still k cells short, so each breakpoint shows exactly as many as it
 * needs and a row is never made of fillers alone. With 9 logos: 1 filler at 2 columns, none at 3, 1 at 5.
 */
export function fillerClasses(count: number): string[] {
  const missing = BREAKPOINTS.map((breakpoint) => missingCells(count, COLUMNS[breakpoint]));
  const total = Math.max(...missing);

  return Array.from({ length: total }, (_, index) =>
    BREAKPOINTS.map((breakpoint, position) =>
      index < missing[position] ? DISPLAY[breakpoint].shown : DISPLAY[breakpoint].hidden,
    ).join(' '),
  );
}

/**
 * The clients of VN One as a wall of logos: a list named by its kicker ("quem confia") with one cell per partner,
 * logos gray until the cell is hovered or focused (and colored from the start on touch, see .vn-logo-tone). The cells
 * are drawn with their own lines, and empty aria-hidden filler cells complete the last row at 2 and 5 columns so the
 * grid looks finished at every width. One RevealGroup observes the whole grid. It can sit inside any section.
 */
export function ClientGrid() {
  const labelId = useId();
  const fillers = fillerClasses(partners.length);

  return (
    <RevealGroup stagger={LOGO_STAGGER_S}>
      <RevealItem>
        <Kicker>
          <span id={labelId}>{homeCopy.clients.kicker}</span>
        </Kicker>
      </RevealItem>
      {/* role="list": Tailwind preflight removes the markers, and Safari then drops the list semantics. */}
      <ul role="list" aria-labelledby={labelId} className={LIST_CLASSES}>
        {partners.map(({ name, logo }) => (
          <li key={name} className={LOGO_CELL_CLASSES}>
            <RevealItem variant="fade" className="w-full">
              <LogoImage src={logo} name={name} width={LOGO_WIDTH} height={LOGO_HEIGHT} className={LOGO_CLASSES} />
            </RevealItem>
          </li>
        ))}
        {fillers.map((display, position) => (
          <li key={`filler-${position}`} aria-hidden="true" className={cn(CELL_CLASSES, display)} />
        ))}
      </ul>
    </RevealGroup>
  );
}

export default ClientGrid;
