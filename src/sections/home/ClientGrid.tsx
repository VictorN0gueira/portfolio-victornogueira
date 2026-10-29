import { useId } from 'react';
import { Kicker } from '../../components/ui/Kicker';
import { RevealGroup, RevealItem } from '../../components/ui/Reveal';
import { homeCopy } from '../../data/homeCopy';
import { partners } from '../../data/partners';
import { cn } from '../../lib/utils';
import { LOGO_HEIGHT, LOGO_WIDTH, LogoImage } from './LogoImage';

// The grid has 2 columns and 3 from md. Nine logos make whole rows at 3 columns (3 by 3), and at 2 columns the last logo
// spans both columns, so no cell is ever empty. Every cell closes itself with a line on its right and bottom and the
// grid draws the line of the top and left edges, so a row of any length ends with a line.
const COLUMNS_BASE = 2;
const LIST_CLASSES = 'mt-6 grid grid-cols-2 border-t border-l border-vn-gray-light md:grid-cols-3';
const CELL_CLASSES =
  'vn-logo-host flex min-h-24 min-w-0 items-center justify-center border-r border-b border-vn-gray-light bg-vn-white p-3 min-[360px]:p-4 md:min-h-32';
// The slot is the 2:1 canvas of the logo files, so every logo takes the same box (the files hold each drawing already
// trimmed and sized to the same weight). It never grows past the 1x size of the files.
const LOGO_CLASSES = 'aspect-[2/1] w-full max-w-56 vn-logo-tone';
// The time between one logo and the next, in seconds.
const LOGO_STAGGER_S = 0.05;

/**
 * True for the last logo when the rows at 2 columns would end on a lone cell: it then spans both columns. From md it
 * stops spanning, because there the columns are 3 and the 9 logos make whole rows.
 */
export function spansLastRow(position: number, count: number): boolean {
  return position === count - 1 && count % COLUMNS_BASE === 1;
}

/**
 * The clients of VN One as a wall of logos: a list named by its kicker ("quem confia") with one cell per partner,
 * logos gray until the cell is hovered or focused (and colored from the start on touch, see .vn-logo-tone). The cells
 * are drawn with their own lines. There are no filler cells: with 9 logos the rows are whole at 3 columns, and at 2
 * columns the last logo spans the row. One RevealGroup observes the whole grid. It can sit inside any section.
 */
export function ClientGrid() {
  const labelId = useId();
  const count = partners.length;

  return (
    <RevealGroup stagger={LOGO_STAGGER_S}>
      <RevealItem>
        <Kicker>
          <span id={labelId}>{homeCopy.clients.kicker}</span>
        </Kicker>
      </RevealItem>
      {/* role="list": Tailwind preflight removes the markers, and Safari then drops the list semantics. */}
      <ul role="list" aria-labelledby={labelId} className={LIST_CLASSES}>
        {partners.map(({ name, logo }, position) => (
          <li key={name} className={cn(CELL_CLASSES, spansLastRow(position, count) && 'col-span-2 md:col-span-1')}>
            <RevealItem variant="fade" className="flex w-full justify-center">
              <LogoImage src={logo} name={name} width={LOGO_WIDTH} height={LOGO_HEIGHT} className={LOGO_CLASSES} />
            </RevealItem>
          </li>
        ))}
      </ul>
    </RevealGroup>
  );
}

export default ClientGrid;
