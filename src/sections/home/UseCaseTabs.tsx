import { useInView } from 'motion/react';
import { useId, useRef, useState } from 'react';
import { Container } from '../../components/ui/Container';
import { Heading } from '../../components/ui/Heading';
import { Kicker } from '../../components/ui/Kicker';
import { RevealGroup, RevealItem } from '../../components/ui/Reveal';
import { Section } from '../../components/ui/Section';
import { homeCopy } from '../../data/homeCopy';
import { useCases } from '../../data/useCases';
import { useCycle } from '../../hooks/useCycle';
import { useMotionAllowed } from '../../hooks/useMotionAllowed';
import { tabIdFor, UseCasePanel, UseCasePauseToggle, UseCaseTabList } from './UseCaseParts';
import { ROTATE_MS, startsOnCoarsePointer, useCycleHold, useTabListControls } from './useTabsBehavior';

/** The share of the tabs and the panel that must be on the screen for the rotation to run. */
const IN_VIEW_AMOUNT = 0.3;

interface UseCaseHeaderProps {
  headingId: string;
}

/** The kicker, the h2 and the sub line, revealed as one group. */
function UseCaseHeader({ headingId }: UseCaseHeaderProps) {
  const { kicker, heading, sub } = homeCopy.useCases;

  return (
    <RevealGroup>
      <RevealItem>
        <Kicker>{kicker}</Kicker>
      </RevealItem>
      <RevealItem className="mt-6 max-w-4xl">
        <Heading id={headingId} size="l">
          {heading}
        </Heading>
      </RevealItem>
      <RevealItem className="mt-6 max-w-2xl">
        <p className="text-pretty text-base text-vn-gray-dark md:text-lg">{sub}</p>
      </RevealItem>
    </RevealGroup>
  );
}

/**
 * The tabs and the panel. The selection rotates every 9 seconds until the visitor picks a tab, with a progress bar
 * inside the selected tab. The rotation never moves the focus and is never announced (there is no live region):
 * only the selection and the panel change.
 * It runs only while this area is on the screen (30% of it, not just once): out of view the timer and the bar stop, and
 * they start again from zero when it comes back. It holds while the pointer is over this area or the focus is inside
 * it, except on the pause toggle. The toggle is the visitor's own pause, kept apart from both: it only exists while
 * motion is allowed and the rotation is still automatic (also while the area is out of view), and the pause survives
 * leaving and coming back. Without motion nothing rotates and there is no toggle. Once the visitor picks a tab the toggle is
 * gone, and an empty box of its size takes its place, so the row of tabs does not slide under the pointer.
 */
function UseCaseWidget() {
  const idBase = useId();
  const isMotionAllowed = useMotionAllowed();
  const widgetRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(widgetRef, { amount: IN_VIEW_AMOUNT });
  const [isUserPaused, setIsUserPaused] = useState(startsOnCoarsePointer);
  const { index, select, pause, resume, isAuto, isRunning } = useCycle(useCases.length, ROTATE_MS, {
    enabled: isMotionAllowed && !isUserPaused && isInView,
  });
  const holdHandlers = useCycleHold(pause, resume);
  const controls = useTabListControls(index, useCases.length, select);
  const useCase = useCases[index];
  const panelId = `${idBase}-panel`;

  return (
    <div ref={widgetRef} data-use-case-widget="" className="mt-10 md:mt-14" {...holdHandlers}>
      <div className="flex items-center gap-3">
        {isMotionAllowed && isAuto ? (
          <UseCasePauseToggle isPaused={isUserPaused} onToggle={() => setIsUserPaused((current) => !current)} />
        ) : null}
        {isMotionAllowed && !isAuto ? <span aria-hidden="true" className="size-11 shrink-0" /> : null}
        <UseCaseTabList
          idBase={idBase}
          panelId={panelId}
          selectedIndex={index}
          isRunning={isRunning}
          isMotionAllowed={isMotionAllowed}
          durationMs={ROTATE_MS}
          onSelect={select}
          controls={controls}
        />
      </div>
      <UseCasePanel useCase={useCase} isAuto={isAuto} panelId={panelId} tabId={tabIdFor(idBase, useCase.id)} />
    </div>
  );
}

/**
 * Four use cases of where automation enters, as tabs in the ARIA tabs pattern (see UseCaseWidget for how they
 * rotate), under a kicker, a heading and a sub line, with a note that these are examples.
 */
export function UseCaseTabs() {
  const headingId = useId();

  return (
    <Section tone="white" labelledBy={headingId}>
      <Container>
        <UseCaseHeader headingId={headingId} />
        <UseCaseWidget />
        <p className="mt-8 max-w-2xl text-sm text-vn-gray-dark">{homeCopy.useCases.note}</p>
      </Container>
    </Section>
  );
}

export default UseCaseTabs;
