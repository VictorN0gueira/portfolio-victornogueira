import { memo, useId, useMemo, type ComponentProps, type CSSProperties } from 'react';
import { Heading } from '../../components/ui/Heading';
import { PauseToggle } from '../../components/ui/PauseToggle';
import { RevealGroup, RevealItem } from '../../components/ui/Reveal';
import { homeCopy } from '../../data/homeCopy';
import { useCases, type UseCase } from '../../data/useCases';
import { cn } from '../../lib/utils';
import { HOLD_EXEMPT_ATTRIBUTE, tabIdFor, type TabListControls } from './useTabsBehavior';

interface TabProgressProps {
  /** How long the fill takes to grow, as the rotation interval: one number for the bar and the timer. */
  durationMs: number;
}

/**
 * The progress inside the selected tab: a gray track with a white fill that grows from the left with scaleX.
 * Only the transform animates, never the width. It is decoration, so assistive tech skips it, and the tab keeps
 * the plain name of its label.
 */
function TabProgress({ durationMs }: TabProgressProps) {
  return (
    <span
      aria-hidden="true"
      data-tab-progress=""
      className="pointer-events-none absolute inset-x-5 bottom-1.5 h-0.5 overflow-hidden rounded-full bg-vn-gray-dark"
    >
      <span
        className="vn-tab-progress block size-full bg-vn-white"
        style={{ '--vn-tab-duration': `${durationMs}ms` } as CSSProperties}
      />
    </span>
  );
}

interface UseCaseTabProps {
  label: string;
  id: string;
  panelId: string;
  isSelected: boolean;
  /** True while the rotation runs: only then the selected tab draws its progress. */
  isRunning: boolean;
  durationMs: number;
  onSelect: () => void;
  tabRef: (element: HTMLButtonElement | null) => void;
}

/**
 * One tab of the ARIA tabs pattern: the selected one is an ink pill and the only tab stop (roving tabindex),
 * the others have a light border. At least 44px tall. The colors switch at once, with no transition.
 */
function UseCaseTab({ label, id, panelId, isSelected, isRunning, durationMs, onSelect, tabRef }: UseCaseTabProps) {
  return (
    <button
      ref={tabRef}
      id={id}
      type="button"
      role="tab"
      aria-selected={isSelected}
      aria-controls={panelId}
      tabIndex={isSelected ? 0 : -1}
      onClick={onSelect}
      className={cn(
        'relative inline-flex min-h-11 shrink-0 snap-start cursor-pointer items-center justify-center rounded-full border px-5 text-sm font-medium sm:text-base',
        'vn-focus-ring-ink',
        isSelected
          ? 'border-vn-ink bg-vn-ink text-vn-white'
          : 'border-vn-gray-mid bg-vn-white text-vn-ink hover:border-vn-ink hover:bg-vn-cream',
      )}
    >
      {label}
      {isSelected && isRunning ? <TabProgress durationMs={durationMs} /> : null}
    </button>
  );
}

// Below sm the tabs scroll sideways inside the tablist with scroll snap, never the page; from sm they wrap and the
// tablist takes only the width of its tabs. The pause toggle sits before it, outside the scroller.
// The padding leaves room for the focus ring (the scroll box would clip it) and the negative margin gives it back.
// overscroll-x-contain keeps a swipe at the end of the row from chaining to the page or the back swipe of the browser.
// Below sm the right edge fades out (a mask, so no extra element) as the hint that the row goes on, and the 2.5rem of
// right padding keeps the last tab clear of the fade once the row is scrolled to its end. From sm the mask is gone.
const TABLIST_CLASSES =
  'relative -m-1.5 flex min-w-0 flex-1 snap-x snap-mandatory gap-2 overflow-x-auto overscroll-x-contain scroll-px-1.5 py-1.5 pl-1.5 pr-10 scrollbar-hide [mask-image:linear-gradient(to_right,#000_calc(100%-2.5rem),transparent)] sm:flex-initial sm:snap-none sm:flex-wrap sm:overflow-visible sm:p-1.5 sm:[mask-image:none]';

interface UseCaseTabListProps {
  idBase: string;
  panelId: string;
  selectedIndex: number;
  isRunning: boolean;
  isMotionAllowed: boolean;
  durationMs: number;
  onSelect: (index: number) => void;
  /** The refs and the key handler from useTabListControls. */
  controls: TabListControls;
}

/**
 * The tablist with its tabs. Its name comes from the copy. The scroll is smooth only while motion is allowed
 * (the scroll box is the tablist, so this is what makes the move to the selected tab gentle or instant).
 */
export function UseCaseTabList({
  idBase,
  panelId,
  selectedIndex,
  isRunning,
  isMotionAllowed,
  durationMs,
  onSelect,
  controls,
}: UseCaseTabListProps) {
  // One ref callback per tab for the life of the list: an inline arrow is a new function on every render, and React then
  // calls the old one with null and the new one with the node at each commit.
  const { listRef, onKeyDown, registerTab } = controls;
  const tabRefs = useMemo(
    () => useCases.map((_, position) => (element: HTMLButtonElement | null) => registerTab(position, element)),
    [registerTab],
  );

  return (
    // The focus of a tab list lives on its tabs (a roving tab stop), not on the list itself: the rule is a known false positive here.
    // eslint-disable-next-line jsx-a11y/interactive-supports-focus -- WAI-ARIA tabs pattern: only the tabs take the focus
    <div
      ref={listRef}
      role="tablist"
      aria-label={homeCopy.useCases.tablistLabel}
      onKeyDown={onKeyDown}
      className={cn(TABLIST_CLASSES, isMotionAllowed && 'scroll-smooth')}
    >
      {useCases.map(({ id, tab }, position) => (
        <UseCaseTab
          key={id}
          id={tabIdFor(idBase, id)}
          panelId={panelId}
          label={tab}
          isSelected={position === selectedIndex}
          isRunning={isRunning}
          durationMs={durationMs}
          onSelect={() => onSelect(position)}
          tabRef={tabRefs[position]}
        />
      ))}
    </div>
  );
}

interface UseCasePauseToggleProps {
  /** The visitor's own pause. A hold by the pointer or the focus is not shown here. */
  isPaused: boolean;
  onToggle: () => void;
}

/**
 * Pauses and resumes the automatic change of tab: the shared PauseToggle in its light tone, named "Pausar troca
 * automática" (the name is constant, aria-pressed carries the state). It is exempt from the hold of the pointer and
 * the focus, so pressing it is never swallowed by the hold.
 */
export function UseCasePauseToggle({ isPaused, onToggle }: UseCasePauseToggleProps) {
  const exempt = { [HOLD_EXEMPT_ATTRIBUTE]: '' };

  return <PauseToggle isPaused={isPaused} label={homeCopy.useCases.pause} onToggle={onToggle} tone="light" {...exempt} />;
}

type RevealItemProps = ComponentProps<typeof RevealItem>;

/** The item of a ghost: the same div and classes as a RevealItem, with no motion, no observer and no media query. */
function PlainItem({ className, children }: RevealItemProps) {
  return <div className={className}>{children}</div>;
}

function formatStepNumber(position: number): string {
  return String(position + 1).padStart(2, '0');
}

interface StepsCardProps {
  steps: UseCase['steps'];
  Item: typeof RevealItem;
}

/** The "Como funciona" card: its label and the three steps in an ordered list named by that label. */
function StepsCard({ steps, Item }: StepsCardProps) {
  const labelId = useId();

  return (
    <div className="min-w-0 rounded-card border border-vn-gray-light bg-vn-cream p-5 md:p-6">
      <Item variant="fade">
        <p id={labelId} className="font-mono text-xs uppercase tracking-[.18em]">
          {homeCopy.useCases.stepsTitle}
        </p>
      </Item>
      <ol aria-labelledby={labelId} className="mt-5 flex flex-col gap-4">
        {steps.map((step, position) => (
          <li key={step}>
            <Item className="flex items-start gap-4">
              <span
                aria-hidden="true"
                data-step-number=""
                className="grid size-8 shrink-0 place-items-center rounded-full bg-vn-ink font-mono text-xs font-medium text-vn-white"
              >
                {formatStepNumber(position)}
              </span>
              <span className="min-w-0 pt-1 text-base leading-snug text-vn-ink">{step}</span>
            </Item>
          </li>
        ))}
      </ol>
    </div>
  );
}

const COLUMNS_CLASSES = 'grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:items-start lg:gap-14';

interface UseCaseContentProps {
  useCase: UseCase;
  /** A ghost is only there to take the room of this content: plain divs, no group, no reveal. */
  isGhost?: boolean;
}

/**
 * What one use case says: its title (an h3, under the h2 of the section) and body on the left, and the
 * "como funciona" card on the right with the three steps in an ordered list. Below lg they stack.
 * The whole content is one RevealGroup (one observer), so the parent gives it a key per use case once the visitor
 * chooses and the reveal plays again on every choice (not on the rotation: see UseCasePanel). The items fade or rise with opacity and transform only.
 * A ghost has the same markup and classes, so it measures the same, but its items are plain divs.
 */
function UseCaseContent({ useCase, isGhost = false }: UseCaseContentProps) {
  const Group = isGhost ? 'div' : RevealGroup;
  const Item = isGhost ? PlainItem : RevealItem;

  return (
    <Group className={COLUMNS_CLASSES}>
      <div className="min-w-0">
        <Item variant="fade">
          <Heading as="h3" size="m" className="text-[length:clamp(1.75rem,1.2rem+2vw,2.5rem)] leading-[.98]">
            {useCase.title}
          </Heading>
        </Item>
        <Item variant="fade" className="mt-4 max-w-xl">
          <p className="text-pretty text-base text-vn-gray-dark md:text-lg">{useCase.body}</p>
        </Item>
      </div>
      <StepsCard steps={useCase.steps} Item={Item} />
    </Group>
  );
}

/**
 * Invisible copies of the four contents, in the grid cell of the panel, so the cell is as tall as the tallest one and
 * the page below does not jump when the tab changes. Hidden from assistive tech and the pointer (visibility hidden).
 * It takes no props and is memoised, so it renders once and never again while the tabs rotate.
 */
const UseCaseSizers = memo(function UseCaseSizers() {
  return (
    <>
      {useCases.map((useCase) => (
        <div key={useCase.id} aria-hidden="true" className="invisible col-start-1 row-start-1 min-w-0">
          <UseCaseContent useCase={useCase} isGhost />
        </div>
      ))}
    </>
  );
});

interface UseCasePanelProps {
  useCase: UseCase;
  /** True while the rotation still picks the tab: the content then keeps its reveal and only the words change. */
  isAuto: boolean;
  panelId: string;
  /** Id of the selected tab, which names the panel. */
  tabId: string;
}

// The key of the content while the rotation runs: it does not change, so the reveal is not replayed at every turn.
// It is the use case id once the visitor picks a tab, and that remount is the replay of a choice.
const AUTO_KEY = 'auto';

/**
 * The one tabpanel, kept mounted so every tab can point at it with aria-controls. It has a tab stop because
 * nothing inside it takes the focus. The sizers sit behind it in the same grid cell.
 */
export function UseCasePanel({ useCase, isAuto, panelId, tabId }: UseCasePanelProps) {
  return (
    <div className="mt-8 grid md:mt-10">
      <div
        role="tabpanel"
        id={panelId}
        aria-labelledby={tabId}
        tabIndex={0}
        className={cn('col-start-1 row-start-1 min-w-0 rounded-2xl', 'vn-focus-ring-ink')}
      >
        <UseCaseContent key={isAuto ? AUTO_KEY : useCase.id} useCase={useCase} />
      </div>
      <UseCaseSizers />
    </div>
  );
}
