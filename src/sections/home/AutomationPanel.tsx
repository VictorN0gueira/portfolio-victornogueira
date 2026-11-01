import { m, useInView, useScroll, useTransform } from 'motion/react';
import { useRef, useState, type ReactNode, type RefObject } from 'react';
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

interface TiltFrameProps {
  /** The plain wrapper: the scroll is measured on it, and the panel reads its visibility from it. */
  targetRef: RefObject<HTMLDivElement | null>;
  /** False when motion is not welcome: the same two elements stay, but nothing is written to the transform. */
  isTilted: boolean;
  children: ReactNode;
}

/**
 * Tilts its children with the scroll, or holds them flat.
 * The tree is the same either way (a wrapper and a tilted layer), so a change of the motion preference only changes
 * the style and never remounts the window inside: its cycle and the focus on the pause button stay.
 * The scroll target is the plain wrapper, not the tilted layer, because the tilt changes the box that is measured.
 * Only transform properties are written: rotateX, scale and the perspective.
 * Both angles are built up front, so the hooks never change with the screen size.
 */
function TiltFrame({ targetRef, isTilted, children }: TiltFrameProps) {
  const isWide = useMediaQuery(MD_QUERY);
  const { scrollYProgress } = useScroll({ target: targetRef, offset: [...SCROLL_OFFSET] });
  const rotateXWide = useTransform(scrollYProgress, [0, 1], [TILT_FROM_DEG, 0]);
  const rotateXNarrow = useTransform(scrollYProgress, [0, 1], [TILT_FROM_DEG_NARROW, 0]);
  const scale = useTransform(scrollYProgress, [0, 1], [SCALE_FROM, 1]);

  return (
    <div ref={targetRef}>
      <m.div
        data-flow-tilt=""
        // Flat is the same style with the angle at 0, the scale at 1 and no perspective (the transform is then none):
        // a style prop that disappears would leave the last values on the element.
        style={{
          rotateX: isTilted ? (isWide ? rotateXWide : rotateXNarrow) : 0,
          scale: isTilted ? scale : 1,
          transformPerspective: isTilted ? PERSPECTIVE_PX : 0,
          transformOrigin: 'top center',
        }}
      >
        {children}
      </m.div>
    </div>
  );
}

interface FlowWindowProps {
  task: HeroTaskId;
  /** The visitor's own pause, kept by the parent so a new task does not undo it. */
  isUserPaused: boolean;
  /** Whether the panel is on the screen: off screen the timer stops and the CSS loops are held. */
  isVisible: boolean;
  onTogglePause: () => void;
}

/**
 * The window itself, with the cycle.
 * Row k is done when the beat is past it: beat 0 has none done, beat 4 has all four, and the fifth beat starts over.
 * The running step is the beat modulo 4.
 * The cycle holds while the visitor paused it or the focus is inside the body (a keyboard user reading the steps).
 * The pointer does not hold it: the panel keeps running while the mouse is over it, and the pause is the visitor's
 * own toggle. These are separate holds, so it resumes only when both are off.
 * The title bar is not part of the body, so pressing the pause control never holds the cycle by itself.
 * The hook also holds it while the tab is hidden, and the panel holds it while it is off screen.
 * The window carries data-paused while a hold is on (or while it is off screen), and CSS stops the cable with it.
 * Without motion nothing runs: every row is done, there is no pause control and no timer.
 * The status word in the title bar follows the visitor's own pause only: "pausado" after they press the toggle,
 * "rodando" otherwise. A hold by the focus ends by itself when it leaves, so it keeps "rodando".
 * The parent gives it key={task}, so a new task starts a new cycle.
 */
function FlowWindow({ task, isUserPaused, isVisible, onTogglePause }: FlowWindowProps) {
  const isMotionAllowed = useMotionAllowed();
  const [isFocused, setIsFocused] = useState(false);
  const rows = heroFlows[task];
  const isPaused = isMotionAllowed && (isUserPaused || isFocused);
  const { index } = useCycle(rows.length + 1, CYCLE_STEP_MS, { enabled: isMotionAllowed && !isPaused && isVisible });
  // The cable is held off screen too, but the mode stays "running": nothing the visitor reads changes.
  const isHeld = isPaused || (isMotionAllowed && !isVisible);

  const { status } = homeCopy.hero.panel;
  const hasVisitorPaused = isMotionAllowed && isUserPaused;

  let mode: PanelMode = 'running';
  if (!isMotionAllowed) mode = 'static';
  else if (isPaused) mode = 'paused';

  return (
    <div
      role="group"
      aria-label={homeCopy.hero.panel.label}
      data-flow-window=""
      data-paused={isHeld ? 'true' : undefined}
    >
      <WindowFrame
        title={flowPanel.title}
        status={hasVisitorPaused ? status.paused : status.running}
        actions={isMotionAllowed ? <PauseButton isPaused={isUserPaused} onToggle={onTogglePause} /> : null}
        className="shadow-[0_40px_80px_-40px_rgba(10,10,10,0.45)]"
      >
        <div
          data-flow-body=""
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
 * The pause of the visitor lives here, so it survives a change of task. The window runs only while it is on screen.
 */
export function AutomationPanel({ task }: AutomationPanelProps) {
  const isMotionAllowed = useMotionAllowed();
  const [isUserPaused, setIsUserPaused] = useState(false);
  const frameRef = useRef<HTMLDivElement>(null);
  const isVisible = useInView(frameRef);

  return (
    <TiltFrame targetRef={frameRef} isTilted={isMotionAllowed}>
      <FlowWindow
        key={task}
        task={task}
        isUserPaused={isUserPaused}
        isVisible={isVisible}
        onTogglePause={() => setIsUserPaused((current) => !current)}
      />
    </TiltFrame>
  );
}
