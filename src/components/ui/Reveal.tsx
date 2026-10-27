import { motion, useInView, type Variants } from 'motion/react';
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type JSX,
  type ReactNode,
} from 'react';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { useMotionAllowed } from '../../hooks/useMotionAllowed';

/** `rise-blur` is a shorter rise that also sharpens from a blur, meant for the words of a headline. */
export type RevealVariant = 'up' | 'left' | 'right' | 'zoom' | 'fade' | 'rise-blur';

const REVEAL_DURATION_S = 0.7;
// The design system easing, as the cubic bezier points motion expects.
const REVEAL_EASE = [0.22, 1, 0.36, 1] as const;
const INSTANT = { duration: 0 } as const;
const IN_VIEW_OPTIONS = { once: true, margin: '0px 0px -8% 0px' } as const;
// Below md a sideways offset could widen the page and scroll it horizontally, so left and right become up.
const WIDE_QUERY = '(min-width: 768px)';

// The group and its items mark themselves in the DOM, so an item can find its position among its siblings.
const GROUP_SELECTOR = '[data-reveal-group]';
const ITEM_SELECTOR = '[data-reveal-item]';

const HIDDEN = {
  up: { opacity: 0, y: 32 },
  left: { opacity: 0, x: -40 },
  right: { opacity: 0, x: 40 },
  zoom: { opacity: 0, y: 16, scale: 0.94 },
  fade: { opacity: 0 },
  'rise-blur': { opacity: 0, y: 24, filter: 'blur(8px)' },
} as const;

const SHOWN = {
  up: { opacity: 1, y: 0 },
  left: { opacity: 1, x: 0 },
  right: { opacity: 1, x: 0 },
  zoom: { opacity: 1, y: 0, scale: 1 },
  fade: { opacity: 1 },
  'rise-blur': { opacity: 1, y: 0, filter: 'blur(0px)' },
} as const;

// `custom` is a function that returns the item's delay. It runs when the item starts to animate (the group
// just came into view), so the item's position in the group is read from the DOM after everything mounted.
function createVariants(variant: RevealVariant): Variants {
  return {
    hidden: HIDDEN[variant],
    show: (getDelay: () => number) => ({
      ...SHOWN[variant],
      transition: { duration: REVEAL_DURATION_S, ease: REVEAL_EASE, delay: getDelay() },
    }),
  };
}

const VARIANTS: Record<RevealVariant, Variants> = {
  up: createVariants('up'),
  left: createVariants('left'),
  right: createVariants('right'),
  zoom: createVariants('zoom'),
  fade: createVariants('fade'),
  'rise-blur': createVariants('rise-blur'),
};

interface RevealGroupContextValue {
  isInView: boolean;
  /** Seconds an item waits before it animates: the group delay plus its position in the group times the stagger. */
  getDelay: (item: Element) => number;
}

const RevealGroupContext = createContext<RevealGroupContextValue | null>(null);

/** The items that belong to this group, in document order. Items of a nested group are not counted. */
function itemsOf(group: Element): Element[] {
  return Array.from(group.querySelectorAll(ITEM_SELECTOR)).filter((item) => item.closest(GROUP_SELECTOR) === group);
}

interface RevealGroupProps {
  /** The tag to render. Intrinsic tags only: a component might not forward the ref or the data attribute the group needs. */
  as?: keyof JSX.IntrinsicElements;
  /** Seconds between one item and the next. */
  stagger?: number;
  /** Seconds before the first item. */
  delay?: number;
  className?: string;
  children?: ReactNode;
}

/**
 * Observes itself once (a single IntersectionObserver for the whole group, however many items it holds)
 * and tells its RevealItems when to animate in. Items may sit at any depth inside it.
 * Needs AccessibilityProvider above it.
 */
export function RevealGroup({ as = 'div', stagger = 0.08, delay = 0, className, children }: RevealGroupProps) {
  // Typed as div only to keep TypeScript from building a union of every tag: all of them accept these props.
  const Tag = as as 'div';
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, IN_VIEW_OPTIONS);

  const getDelay = useCallback(
    (item: Element) => {
      const group = ref.current;
      const position = group ? itemsOf(group).indexOf(item) : 0;
      return delay + Math.max(position, 0) * stagger;
    },
    [delay, stagger],
  );
  const value = useMemo(() => ({ isInView, getDelay }), [isInView, getDelay]);

  return (
    <Tag ref={ref} data-reveal-group="" className={className}>
      <RevealGroupContext.Provider value={value}>{children}</RevealGroupContext.Provider>
    </Tag>
  );
}

interface RevealItemProps {
  variant?: RevealVariant;
  className?: string;
  children?: ReactNode;
}

/**
 * Fades and slides its children in when the surrounding RevealGroup enters the view.
 * Without motion (system preference or the accessibility toggle), or outside a group, it renders its
 * children in their final state at once, with no hidden style at all. It always renders the same element
 * (a motion.div), so switching motion on or off while the page is open keeps its children mounted: their
 * state and focus survive. If motion goes off while the item is still hidden, it jumps to its final state.
 * An item that mounts after its group was already revealed (or after motion was switched back on) also
 * appears in its final state, so content is never hidden again. Needs AccessibilityProvider above it.
 */
export function RevealItem({ variant = 'up', className, children }: RevealItemProps) {
  const group = useContext(RevealGroupContext);
  const isMotionAllowed = useMotionAllowed();
  const isWide = useMediaQuery(WIDE_QUERY);
  const ref = useRef<HTMLDivElement>(null);
  const isActive = group !== null && isMotionAllowed;

  // True once motion has driven this item. Only then does turning motion off need to push it to its final state.
  const [wasActive, setWasActive] = useState(isActive);
  if (isActive && !wasActive) setWasActive(true);

  const getDelay = useCallback(() => (group && ref.current ? group.getDelay(ref.current) : 0), [group]);

  const isSideways = variant === 'left' || variant === 'right';
  const effectiveVariant = isSideways && !isWide ? 'up' : variant;

  let motionProps: ComponentProps<typeof motion.div> = {};
  if (group && isActive) {
    motionProps = {
      variants: VARIANTS[effectiveVariant],
      initial: group.isInView ? false : 'hidden',
      animate: group.isInView ? 'show' : 'hidden',
      custom: getDelay,
    };
  } else if (wasActive) {
    motionProps = { animate: SHOWN[effectiveVariant], transition: INSTANT };
  }

  return (
    <motion.div ref={ref} data-reveal-item="" className={className} {...motionProps}>
      {children}
    </motion.div>
  );
}
