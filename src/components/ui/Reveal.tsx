import { motion, useInView, type Variants } from 'motion/react';
import {
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type JSX,
  type ReactNode,
} from 'react';
import { useMotionAllowed } from '../../hooks/useMotionAllowed';
import { RevealGroupContext } from './revealGroupContext';

/** `rise-blur` is a shorter rise that also sharpens from a blur, meant for the words of a headline. */
export type RevealVariant = 'up' | 'fade' | 'rise-blur';

const REVEAL_DURATION_S = 0.7;
// The design system easing, as the cubic bezier points motion expects.
const REVEAL_EASE = [0.22, 1, 0.36, 1] as const;
const INSTANT = { duration: 0 } as const;
const IN_VIEW_OPTIONS = { once: true, margin: '0px 0px -8% 0px' } as const;

// The group and its items mark themselves in the DOM, so an item can find its position among its siblings.
const GROUP_SELECTOR = '[data-reveal-group]';
const ITEM_SELECTOR = '[data-reveal-item]';

const HIDDEN = {
  up: { opacity: 0, y: 32 },
  fade: { opacity: 0 },
  'rise-blur': { opacity: 0, y: 24, filter: 'blur(8px)' },
} as const;

const SHOWN = {
  up: { opacity: 1, y: 0 },
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
  fade: createVariants('fade'),
  'rise-blur': createVariants('rise-blur'),
};

/** The items that belong to this group, in document order. Items of a nested group are not counted. */
function itemsOf(group: Element): Element[] {
  return Array.from(group.querySelectorAll(ITEM_SELECTOR)).filter((item) => item.closest(GROUP_SELECTOR) === group);
}

/** The position of each item of the group, read from the DOM in one pass. */
function positionsOf(group: Element): Map<Element, number> {
  return new Map(itemsOf(group).map((item, position) => [item, position]));
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

  // The positions are read once, when the first item starts to animate (everything has mounted by then), and shared by
  // every item after it. An item that mounts later is not in the map: that one miss reads the group again.
  const positions = useRef<Map<Element, number> | null>(null);
  const getDelay = useCallback(
    (item: Element) => {
      const group = ref.current;
      if (!group) return delay;
      if (!positions.current?.has(item)) positions.current = positionsOf(group);
      return delay + (positions.current.get(item) ?? 0) * stagger;
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
  /** The tag to render: a div by default, a span where a div is not allowed (inside a heading or a paragraph). */
  as?: 'div' | 'span';
  className?: string;
  children?: ReactNode;
}

/**
 * Fades and slides its children in when the surrounding RevealGroup enters the view.
 * Without motion (system preference or the accessibility toggle), or outside a group, it renders its
 * children in their final state at once, with no hidden style at all. It always renders the same element
 * (a motion.div, or a motion.span with `as="span"`), so switching motion on or off while the page is open keeps
 * its children mounted: their state and focus survive. If motion goes off while the item is still hidden, it jumps to its final state.
 * An item that mounts after its group was already revealed (or after motion was switched back on) also
 * appears in its final state, so content is never hidden again. Needs AccessibilityProvider above it.
 */
export function RevealItem({ variant = 'up', as = 'div', className, children }: RevealItemProps) {
  const group = useContext(RevealGroupContext);
  const isMotionAllowed = useMotionAllowed();
  // Typed as the div variant only to keep TypeScript from building a union of both tags: they take the same props here.
  const Tag = (as === 'span' ? motion.span : motion.div) as typeof motion.div;
  const ref = useRef<HTMLDivElement>(null);
  const isActive = group !== null && isMotionAllowed;

  // True once motion has driven this item. Only then does turning motion off need to push it to its final state.
  const [wasActive, setWasActive] = useState(isActive);
  if (isActive && !wasActive) setWasActive(true);

  const getDelay = useCallback(() => (group && ref.current ? group.getDelay(ref.current) : 0), [group]);

  let motionProps: ComponentProps<typeof motion.div> = {};
  if (group && isActive) {
    motionProps = {
      variants: VARIANTS[variant],
      initial: group.isInView ? false : 'hidden',
      animate: group.isInView ? 'show' : 'hidden',
      custom: getDelay,
    };
  } else if (wasActive) {
    motionProps = { animate: SHOWN[variant], transition: INSTANT };
  }

  return (
    <Tag ref={ref} data-reveal-item="" className={className} {...motionProps}>
      {children}
    </Tag>
  );
}
