import { Check, Server } from 'lucide-react';
import type { CSSProperties } from 'react';
import { BrandIcon } from '../../components/ui/BrandIcon';
import type { BrandIconId } from '../../data/brandIcons';
import { flowPanel, flowSources, flowSteps, type FlowRow, type FlowSource } from '../../data/heroFlows';
import { useMediaQuery } from '../../hooks/useMediaQuery';

export type RowState = 'done' | 'active' | 'pending';

function rowState(index: number, doneCount: number): RowState {
  if (index < doneCount) return 'done';
  return index === doneCount ? 'active' : 'pending';
}

// From md up the steps fit in one line and the sources become a column beside the rows.
export const WIDE_QUERY = '(min-width: 768px)';

const FOCUS_RING = 'focus-visible:outline-2 focus-visible:outline-vn-ink';

interface StepPillsProps {
  /** Index of the step that is running, or -1 when none is (nothing runs without motion). */
  activeIndex: number;
}

/**
 * The four steps as pills. Below md they may not fit, so the row scrolls sideways inside the panel (never the
 * page), with the scrollbar hidden; it is a tab stop there so a keyboard can scroll it. The running step is the
 * ink pill.
 */
export function StepPills({ activeIndex }: StepPillsProps) {
  const isWide = useMediaQuery(WIDE_QUERY);

  return (
    <ol
      aria-label={flowPanel.aria.steps}
      tabIndex={isWide ? undefined : 0}
      className={`scrollbar-hide flex gap-2 overflow-x-auto rounded-lg py-1 -outline-offset-2 ${FOCUS_RING}`}
    >
      {flowSteps.map((step, index) => (
        <li
          key={step}
          aria-current={index === activeIndex ? 'step' : undefined}
          data-active={index === activeIndex ? 'true' : undefined}
          className="shrink-0 rounded-full border border-vn-gray-light px-3 py-1 font-mono text-xs text-vn-gray-dark data-[active=true]:border-vn-ink data-[active=true]:bg-vn-ink data-[active=true]:text-vn-white"
        >
          {step}
        </li>
      ))}
    </ol>
  );
}

const SOURCE_BRANDS: Record<FlowSource, BrandIconId | null> = {
  WhatsApp: 'whatsapp',
  'E-mail': 'gmail',
  Planilhas: 'googlesheets',
  'Seu sistema': null,
};

// From md the chips are 44px tall with 8px between them: the cable beside the column is drawn for exactly that.
const CHIP_HEIGHT_PX = 44;
const CHIP_GAP_PX = 8;

/** The sources the work comes from: a row of chips above the rows below md, a column beside them from md. */
export function FlowSources() {
  return (
    <ul
      aria-label={flowPanel.aria.sources}
      className="flex flex-wrap justify-center gap-2 md:flex-col md:flex-nowrap md:justify-start"
    >
      {flowSources.map((source) => {
        const brand = SOURCE_BRANDS[source];
        return (
          <li
            key={source}
            className="inline-flex min-h-9 items-center gap-2 rounded-full border border-vn-gray-light bg-vn-cream px-3 text-xs font-medium text-vn-ink md:h-[44px]"
          >
            {brand ? (
              <BrandIcon id={brand} className="size-4 shrink-0" />
            ) : (
              <Server aria-hidden="true" className="size-4 shrink-0" />
            )}
            <span>{source}</span>
          </li>
        );
      })}
    </ul>
  );
}

const COLUMN_HEIGHT = flowSources.length * CHIP_HEIGHT_PX + (flowSources.length - 1) * CHIP_GAP_PX;
const CABLE_WIDTH = 72;
const CABLE_MERGE_X = CABLE_WIDTH - 6;
const CABLE_STAGGER_S = 0.5;

interface CablePathProps {
  d: string;
  delay: number;
}

/** A gray rail with a short ink dash running along it. The dash is CSS (.vn-cable-pulse) and rests at the start. */
function CablePath({ d, delay }: CablePathProps) {
  return (
    <>
      <path d={d} className="stroke-vn-gray-light" />
      <path
        d={d}
        pathLength={100}
        className="vn-cable-pulse stroke-vn-ink"
        style={{ '--vn-cable-delay': `${delay}s` } as CSSProperties}
      />
    </>
  );
}

/**
 * The cable between the sources and the rows. From md it is four curves, one from the middle of each chip of the
 * column, that merge into the middle of the rows. Below md the chips are a row above the rows, so the cable is a
 * short vertical line. Both are decoration: aria-hidden, no title.
 */
export function FlowCable() {
  const mergeY = COLUMN_HEIGHT / 2;

  return (
    <>
      <svg
        data-flow-cable=""
        aria-hidden="true"
        focusable="false"
        viewBox={`0 0 ${CABLE_WIDTH} ${COLUMN_HEIGHT}`}
        width={CABLE_WIDTH}
        height={COLUMN_HEIGHT}
        fill="none"
        strokeWidth="2"
        strokeLinecap="round"
        className="hidden shrink-0 md:block"
      >
        {flowSources.map((source, index) => {
          const y = CHIP_HEIGHT_PX / 2 + index * (CHIP_HEIGHT_PX + CHIP_GAP_PX);
          const d = `M2 ${y} C${CABLE_WIDTH / 2} ${y} ${CABLE_WIDTH / 2} ${mergeY} ${CABLE_MERGE_X} ${mergeY}`;
          return <CablePath key={source} d={d} delay={index * CABLE_STAGGER_S} />;
        })}
        <circle cx={CABLE_MERGE_X} cy={mergeY} r="3" className="fill-vn-ink stroke-none" />
      </svg>
      <svg
        data-flow-cable=""
        aria-hidden="true"
        focusable="false"
        viewBox="0 0 24 36"
        width={24}
        height={36}
        fill="none"
        strokeWidth="2"
        strokeLinecap="round"
        className="mx-auto shrink-0 md:hidden"
      >
        <CablePath d="M12 2 V28" delay={0} />
        <circle cx="12" cy="31" r="3" className="fill-vn-ink stroke-none" />
      </svg>
    </>
  );
}

interface FlowRowItemProps {
  row: FlowRow;
  state: RowState;
}

/** The disc at the start of a row: an empty ring, a ring with a dot while it runs, an ink disc with a check when done. */
function RowMarker() {
  return (
    <span
      aria-hidden="true"
      className="relative mt-0.5 grid size-6 place-items-center rounded-full border border-vn-gray-light group-data-[state=active]:border-vn-ink"
    >
      <span className="absolute inset-0 scale-0 rounded-full bg-vn-ink transition-transform duration-300 ease-out group-data-[state=done]:scale-100" />
      <Check className="relative size-3.5 text-vn-white opacity-0 transition-opacity duration-300 ease-out group-data-[state=done]:opacity-100" />
      <span className="absolute inset-0 m-auto size-1.5 rounded-full bg-vn-ink opacity-0 group-data-[state=active]:opacity-100" />
    </span>
  );
}

/**
 * One row of the flow. The detail and the done text sit under the title in a narrow column and the done text
 * moves to the right edge once the column is wide enough (container query, so it follows the column and not the
 * screen). The done text is always in the layout, so the row does not jump when it appears; it is hidden from
 * assistive tech until the row is done.
 */
export function FlowRowItem({ row, state }: FlowRowItemProps) {
  const isDone = state === 'done';

  return (
    <li
      data-state={state}
      className="group grid grid-cols-[auto_minmax(0,1fr)] items-start gap-x-3 gap-y-1 rounded-xl border border-vn-gray-light p-3 data-[state=active]:border-vn-ink @md:grid-cols-[auto_minmax(0,1fr)_auto]"
    >
      <RowMarker />
      <div className="min-w-0">
        <p className="break-words text-sm font-medium leading-snug text-vn-ink @md:text-base">{row.title}</p>
        <p className="break-words text-xs text-vn-gray-dark @md:text-sm">{row.detail}</p>
      </div>
      <span
        data-flow-done=""
        aria-hidden={isDone ? undefined : true}
        className="col-start-2 font-mono text-xs text-vn-ink opacity-0 transition-opacity duration-300 ease-out group-data-[state=done]:opacity-100 @md:col-start-3 @md:row-start-1"
      >
        {row.done}
      </span>
    </li>
  );
}

interface FlowBodyProps {
  rows: readonly FlowRow[];
  /** How many rows are done: the row at this index is the one that runs. */
  doneCount: number;
  /** Index of the running step, or -1 when none runs. */
  activeStep: number;
}

/** The white body of the window: the steps, the sources with the cable, the rows and the footnote. Left aligned. */
export function FlowBody({ rows, doneCount, activeStep }: FlowBodyProps) {
  return (
    <div className="bg-vn-white p-3 text-left text-vn-ink min-[360px]:p-4 md:p-6">
      <StepPills activeIndex={activeStep} />
      <div className="mt-3 flex flex-col gap-1 md:mt-5 md:grid md:grid-cols-[10rem_72px_minmax(0,1fr)] md:items-center md:gap-0">
        <FlowSources />
        <FlowCable />
        <div className="@container min-w-0">
          <ol aria-label={flowPanel.aria.rows} className="flex flex-col gap-2">
            {rows.map((row, rowIndex) => (
              <FlowRowItem key={row.title} row={row} state={rowState(rowIndex, doneCount)} />
            ))}
          </ol>
        </div>
      </div>
      <p className="mt-4 text-xs text-vn-gray-dark">{flowPanel.footnote}</p>
    </div>
  );
}
