import { useCallback, useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react';
import { useTabDrag, type TabDrag } from '../hooks/useTabDrag';
import {
  panelMaxHeight,
  placePanel,
  releasePosition,
  scrollBand,
  stepPosition,
  topFromRatio,
  TAB_SIZE_PX,
  type Box,
  type StepDirection,
  type TabPosition,
  type TabSide,
} from '../lib/floatingLayout';
import { readFloatingView, type FloatingView } from '../lib/floatingView';
import { clearTabPosition, readTabPosition, writeTabPosition } from '../lib/tabPositionStorage';

const SLIDE_MS = 220;
const SLIDE_EASE = 'cubic-bezier(0.16, 1, 0.3, 1)';
const BAND_ATTRIBUTE = 'data-vn-tab-band';
const BAND_PAD_PROPERTY = '--vn-tab-pad';

interface TabPlacementOptions {
  wrapperRef: RefObject<HTMLElement | null>;
  triggerRef: RefObject<HTMLElement | null>;
  /** The box that holds the panel, shifted so the panel stays inside the window. */
  placerRef: RefObject<HTMLElement | null>;
  isOpen: boolean;
  activeCount: number;
  isMotionAllowed: boolean;
}

export interface TabPlacement {
  /** The place the visitor chose, or null for the default place (the responsive CSS of the widget). */
  position: TabPosition | null;
  /** The side the panel opens from: the stored side, or the nearest one while the tab is being dragged. */
  shownSide: TabSide;
  /** In px, for the wrapper, when the tab has a chosen place. */
  topPx: number | null;
  panelMaxHeightPx: number | null;
  drag: TabDrag;
  actions: { toSide: (side: TabSide) => void; step: (direction: StepDirection) => void; reset: () => void };
}

const toBox = ({ left, top, width, height }: DOMRect): Box => ({ left, top, width, height });

/** The window the buttons live in, kept current on resize and rotation. */
function useFloatingView(): FloatingView {
  const [view, setView] = useState(readFloatingView);
  useEffect(() => {
    const update = () => setView(readFloatingView());
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);
  return view;
}

/** Tells the stylesheet which edge a focused control has to stay clear of, so the tab never covers what the keyboard reaches. */
function useScrollBand(top: number | null, viewportHeight: number): void {
  useEffect(() => {
    const root = document.documentElement;
    if (top === null) return;
    const { edge, pad } = scrollBand(top, viewportHeight);
    root.setAttribute(BAND_ATTRIBUTE, edge);
    root.style.setProperty(BAND_PAD_PROPERTY, `${pad}px`);
    return () => {
      root.removeAttribute(BAND_ATTRIBUTE);
      root.style.removeProperty(BAND_PAD_PROPERTY);
    };
  }, [top, viewportHeight]);
}

/**
 * Where the accessibility tab is: the stored choice, the drag in progress (the tab and the open panel follow the pointer,
 * with transforms only), the slide to the new place on release (instant when animation is off), and the keyboard moves.
 * With no chosen place nothing here changes the widget: the default is still the responsive CSS.
 */
export function useTabPlacement(options: TabPlacementOptions): TabPlacement {
  const { wrapperRef, triggerRef, placerRef, isOpen, activeCount, isMotionAllowed } = options;
  const view = useFloatingView();
  const [position, setPosition] = useState<TabPosition | null>(readTabPosition);
  const [liveSide, setLiveSide] = useState<TabSide | null>(null);
  const slideFrom = useRef<Box | null>(null);
  const liveRect = useRef<Box | null>(null);
  const beforeDrag = useRef<TabPosition | null>(null);
  const motionAllowedRef = useRef(isMotionAllowed);
  useEffect(() => {
    motionAllowedRef.current = isMotionAllowed;
  });

  const shownSide = liveSide ?? position?.side ?? 'right';
  const topPx = position ? topFromRatio(position.ratio, position.side, view.viewport.height, view.insets) : null;

  useScrollBand(topPx, view.viewport.height);

  const commit = (next: TabPosition | null, from: Box | null = null) => {
    slideFrom.current = from ?? (triggerRef.current ? toBox(triggerRef.current.getBoundingClientRect()) : null);
    setPosition(next);
    if (next) writeTabPosition(next);
    else clearTabPosition();
  };

  const applyPanel = useCallback(
    (rect: Box, side: TabSide) => {
      const placer = placerRef.current;
      if (!placer) return;
      const { viewport, insets } = readFloatingView();
      const panel = { width: placer.offsetWidth, height: placer.offsetHeight };
      const { dx, dy } = placePanel({ side, trigger: rect, panel, viewport, insets });
      placer.style.transform = `translate(${dx}px, ${dy}px)`;
    },
    [placerRef],
  );

  // At rest the panel is placed from the layout box of the tab, so a slide in progress does not disturb it.
  useLayoutEffect(() => {
    if (position === null || topPx === null || !isOpen || liveRect.current) return;
    const left = position.side === 'right' ? view.viewport.width - TAB_SIZE_PX : 0;
    applyPanel({ left, top: topPx, width: TAB_SIZE_PX, height: TAB_SIZE_PX }, position.side);
  }, [position, topPx, isOpen, activeCount, view, applyPanel]);

  // The side flipped while dragging: the panel moved to the other side of the tab, so it is placed again.
  useLayoutEffect(() => {
    if (liveRect.current) applyPanel(liveRect.current, shownSide);
  }, [shownSide, applyPanel]);

  // The slide: the new place is already laid out, so the tab starts from where it was drawn and eases into it.
  useLayoutEffect(() => {
    const wrapper = wrapperRef.current;
    const trigger = triggerRef.current;
    const from = slideFrom.current;
    slideFrom.current = null;
    // While the pointer drags, the transform belongs to the drag (the layout was only pinned under it).
    if (!wrapper || !trigger || trigger.dataset.dragging === 'true') return;
    wrapper.style.transition = 'none';
    wrapper.style.transform = '';
    if (!from || !motionAllowedRef.current) return;
    const to = trigger.getBoundingClientRect();
    const dx = from.left - to.left;
    const dy = from.top - to.top;
    if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
    wrapper.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
    void wrapper.offsetWidth;
    wrapper.style.transition = `transform ${SLIDE_MS}ms ${SLIDE_EASE}`;
    wrapper.style.transform = '';
  }, [position, wrapperRef, triggerRef]);

  const drag = useTabDrag({
    triggerRef,
    wrapperRef,
    readView: readFloatingView,
    onStart: (rect) => {
      // From the default place, the layout is pinned where the tab is, so the open panel can follow it.
      beforeDrag.current = position;
      if (position === null) setPosition(releasePosition(rect, view.viewport));
    },
    onLive: (rect, side) => {
      liveRect.current = rect;
      setLiveSide(side);
      applyPanel(rect, side);
    },
    onRelease: (next, from) => {
      liveRect.current = null;
      setLiveSide(null);
      commit(next, from);
    },
    onCancel: () => {
      setLiveSide(null);
      liveRect.current = null;
      setPosition(beforeDrag.current);
    },
  });

  const fromHere = (): TabPosition => {
    if (position) return position;
    const rect = triggerRef.current?.getBoundingClientRect();
    return rect ? releasePosition(toBox(rect), view.viewport) : { side: 'right', ratio: 0.5 };
  };

  const actions = {
    toSide: (side: TabSide) => commit({ ...fromHere(), side }),
    step: (direction: StepDirection) => commit(stepPosition(fromHere(), direction, { viewportHeight: view.viewport.height, insets: view.insets })),
    reset: () => commit(null),
  };

  return {
    position,
    shownSide,
    topPx,
    panelMaxHeightPx: position ? panelMaxHeight(shownSide, view.viewport, view.insets) : null,
    drag,
    actions,
  };
}
