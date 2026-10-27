import { motion, useScroll, useTransform } from 'motion/react';
import { useRef, useState, type ReactNode } from 'react';
import { WindowFrame } from '../../components/ui/WindowFrame';
import { flowPanel, flowSteps, heroFlows, type HeroTaskId } from '../../data/heroFlows';
import { homeCopy } from '../../data/homeCopy';
import { useCycle } from '../../hooks/useCycle';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { useMotionAllowed } from '../../hooks/useMotionAllowed';
import { MD_QUERY } from '../../lib/breakpoints';
import { FlowBody, PauseButton, type PanelMode } from './AutomationParts';

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
 * Tilts its children with the scroll.
 * The scroll target is the plain wrapper, not the tilted layer, because the tilt changes the box that is measured.
 * Only transform properties are written: rotateX, scale and the perspective.
 * Both angles are built up front, so the hooks never change with the screen size.
 */
function ScrollTilt({ children }: ScrollTiltProps) {
  const targetRef = useRef<HTMLDivElement>(null);
  const isWide = useMediaQuery(MD_QUERY);
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
  /** The visitor's own pause, kept by the parent so a new task does not undo it. */
  isUserPaused: boolean;
  onTogglePause: () => void;
}

/**
 * The window itself, with the cycle.
 * Row k is done when the beat is past it: beat 0 has none done, beat 4 has all four, and the fifth beat starts over.
 * The running step is the beat modulo 4.
 * The cycle holds while the visitor paused it, the pointer is over the body or the focus is inside the body.
 * These are separate holds, so it resumes only when all of them are off.
 * The title bar is not part of the body, so pressing the pause control never holds the cycle by itself.
 * The hook also holds it while the tab is hidden.
 * The window carries data-paused while any hold is on, and CSS stops the cable with it.
 * Without motion nothing runs: every row is done, there is no pause control and no timer.
 * The parent gives it key={task}, so a new task starts a new cycle.
 */
function FlowWindow({ task, isUserPaused, onTogglePause }: FlowWindowProps) {
  const isMotionAllowed = useMotionAllowed();
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const rows = heroFlows[task];
  const isPaused = isMotionAllowed && (isUserPaused || isHovered || isFocused);
  const { index } = useCycle(rows.length + 1, CYCLE_STEP_MS, { enabled: isMotionAllowed && !isPaused });

  let mode: PanelMode = 'running';
  if (!isMotionAllowed) mode = 'static';
  else if (isPaused) mode = 'paused';

  return (
    <div
      role="group"
      aria-label={homeCopy.hero.panel.label}
      data-flow-window=""
      data-paused={isPaused ? 'true' : undefined}
    >
      <WindowFrame
        title={flowPanel.title}
        status={flowPanel.status}
        actions={isMotionAllowed ? <PauseButton isPaused={isUserPaused} onToggle={onTogglePause} /> : null}
        className="shadow-[0_40px_80px_-40px_rgba(10,10,10,0.45)]"
      >
        <div
          data-flow-body=""
          onPointerEnter={() => setIsHovered(true)}
          onPointerLeave={() => setIsHovered(false)}
          onFocus={() => setIsFocused(true)}
          onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget)) setIsFocused(false);
          }}
        >
          <FlowBody
            rows={rows}
            doneCount={isMotionAllowed ? index : rows.length}
            activeStep={isMotionAllowed ? index % flowSteps.length : -1}
            mode={mode}
          />
        </div>
      </WindowFrame>
    </div>
  );
}

interface AutomationPanelProps {
  task: HeroTaskId;
}

/**
 * The live automation panel: a window that shows the flow of the chosen task, row by row.
 * It starts leaning back and straightens as it scrolls up the screen.
 * It is an illustration (the footnote says so), so it is plain content, not a live region.
 * The changing rows are never announced, and there is no accent color in it.
 * The pause of the visitor lives here, so it survives a change of task.
 */
export function AutomationPanel({ task }: AutomationPanelProps) {
  const isMotionAllowed = useMotionAllowed();
  const [isUserPaused, setIsUserPaused] = useState(false);
  const flow = (
    <FlowWindow
      key={task}
      task={task}
      isUserPaused={isUserPaused}
      onTogglePause={() => setIsUserPaused((current) => !current)}
    />
  );

  return isMotionAllowed ? <ScrollTilt>{flow}</ScrollTilt> : <div>{flow}</div>;
}

export default AutomationPanel;
