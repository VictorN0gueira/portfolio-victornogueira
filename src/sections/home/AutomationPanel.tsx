import { motion, useScroll, useTransform } from 'motion/react';
import { useRef, type FocusEvent, type ReactNode } from 'react';
import { WindowFrame } from '../../components/ui/WindowFrame';
import { flowPanel, flowSteps, heroFlows, type HeroTaskId } from '../../data/heroFlows';
import { useCycle } from '../../hooks/useCycle';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { useMotionAllowed } from '../../hooks/useMotionAllowed';
import { FlowBody, WIDE_QUERY } from './AutomationParts';

const CYCLE_STEP_MS = 1400;
// The panel leans back and a little smaller until it scrolls into the reading position, then it lies flat.
const TILT_FROM_DEG = 14;
const TILT_FROM_DEG_NARROW = 8;
const SCALE_FROM = 0.94;
const PERSPECTIVE_PX = 1400;
// Progress 0 is the panel top at the bottom of the screen, progress 1 is the panel top 30% down the screen.
const SCROLL_OFFSET = ['start end', 'start 30%'] as const;

interface ScrollTiltProps {
  children: ReactNode;
}

/**
 * Tilts its children with the scroll. The scroll target is the plain wrapper, not the tilted layer, because the
 * tilt changes the box that is measured. Only transform properties are written (rotateX, scale and the
 * perspective). Both angles are built up front, so the hooks never change with the screen size.
 */
function ScrollTilt({ children }: ScrollTiltProps) {
  const targetRef = useRef<HTMLDivElement>(null);
  const isWide = useMediaQuery(WIDE_QUERY);
  const { scrollYProgress } = useScroll({ target: targetRef, offset: [...SCROLL_OFFSET] });
  const rotateXWide = useTransform(scrollYProgress, [0, 1], [TILT_FROM_DEG, 0]);
  const rotateXNarrow = useTransform(scrollYProgress, [0, 1], [TILT_FROM_DEG_NARROW, 0]);
  const scale = useTransform(scrollYProgress, [0, 1], [SCALE_FROM, 1]);

  return (
    <div ref={targetRef}>
      <motion.div
        data-flow-tilt=""
        style={{
          rotateX: isWide ? rotateXWide : rotateXNarrow,
          scale,
          transformPerspective: PERSPECTIVE_PX,
          transformOrigin: 'top center',
        }}
      >
        {children}
      </motion.div>
    </div>
  );
}

interface FlowWindowProps {
  task: HeroTaskId;
}

/**
 * The window itself, with the cycle. Its text is left aligned, whatever the section around it does. Row k is done when the beat is past it: beat 0 has none done, beat 4 has all
 * four and the fifth beat starts over. The running step is the beat modulo 4. The cycle holds while the pointer
 * is over the window or the focus is inside it (two separate holds: it resumes only when both are off), and the
 * hook also holds it while the tab is hidden. Without motion nothing runs: every row is done and no timer exists.
 * The parent gives it key={task}, so a new task starts a new cycle.
 */
function FlowWindow({ task }: FlowWindowProps) {
  const isMotionAllowed = useMotionAllowed();
  const rows = heroFlows[task];
  const { index, pause, resume } = useCycle(rows.length + 1, CYCLE_STEP_MS, { enabled: isMotionAllowed });
  const holds = useRef({ hover: false, focus: false });

  const setHold = (kind: 'hover' | 'focus', isHeld: boolean) => {
    holds.current[kind] = isHeld;
    if (holds.current.hover || holds.current.focus) pause();
    else resume();
  };
  const handleBlur = (event: FocusEvent<HTMLDivElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget)) setHold('focus', false);
  };

  const doneCount = isMotionAllowed ? index : rows.length;
  const activeStep = isMotionAllowed ? index % flowSteps.length : -1;

  return (
    <div
      data-flow-window=""
      onPointerEnter={() => setHold('hover', true)}
      onPointerLeave={() => setHold('hover', false)}
      onFocus={() => setHold('focus', true)}
      onBlur={handleBlur}
    >
      <WindowFrame
        title={flowPanel.title}
        status={flowPanel.status}
        className="shadow-[0_40px_80px_-40px_rgba(10,10,10,0.45)]"
      >
        <FlowBody rows={rows} doneCount={doneCount} activeStep={activeStep} />
      </WindowFrame>
    </div>
  );
}

interface AutomationPanelProps {
  task: HeroTaskId;
}

/**
 * The live automation panel: a window that shows the flow of the chosen task, row by row. It starts leaning back
 * and straightens as it scrolls up the screen. It is an illustration (the footnote says so), so it is plain
 * content, not a live region: the changing rows are never announced. There is no accent color in it.
 */
export function AutomationPanel({ task }: AutomationPanelProps) {
  const isMotionAllowed = useMotionAllowed();
  const flow = <FlowWindow key={task} task={task} />;

  return isMotionAllowed ? <ScrollTilt>{flow}</ScrollTilt> : <div>{flow}</div>;
}

export default AutomationPanel;
