import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { useCallback, type ComponentPropsWithRef, type PointerEvent, type Ref } from 'react';
import { useMagnetic } from '../../hooks/useMagnetic';
import { cn } from '../../lib/utils';

/**
 * Pill button. Colors swap instantly on hover (only transform properties animate), the press
 * is a short `scale`, and the label may wrap onto two lines on narrow screens.
 * `tone` is the tone of the surface the button sits on: `dark` for black sections.
 */
export const buttonVariants = cva(
  [
    'inline-flex items-center justify-center gap-2 rounded-full text-center font-medium leading-tight',
    'cursor-pointer select-none',
    'focus-visible:outline-2 focus-visible:outline-offset-2',
    'transition-[scale] duration-150 ease-out active:scale-[0.97]',
    'disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50',
  ],
  {
    variants: {
      intent: {
        primary: '',
        secondary: 'border border-vn-gray-light bg-transparent',
      },
      tone: {
        light: '',
        dark: '',
      },
      size: {
        md: 'min-h-11 px-5 py-2.5 text-sm',
        lg: 'min-h-14 px-7 py-3.5 text-base',
      },
    },
    compoundVariants: [
      {
        intent: 'primary',
        tone: 'light',
        class: 'bg-vn-ink text-vn-white hover:bg-vn-black focus-visible:outline-vn-ink',
      },
      {
        intent: 'primary',
        tone: 'dark',
        class: 'bg-vn-white text-vn-black hover:bg-vn-cream focus-visible:outline-vn-white',
      },
      {
        intent: 'secondary',
        tone: 'light',
        class: 'text-vn-ink hover:border-vn-ink focus-visible:outline-vn-ink',
      },
      {
        intent: 'secondary',
        tone: 'dark',
        class: 'text-vn-white hover:border-vn-white focus-visible:outline-vn-white',
      },
    ],
    defaultVariants: {
      intent: 'primary',
      tone: 'light',
      size: 'md',
    },
  },
);

export type ButtonProps = ComponentPropsWithRef<'button'> &
  VariantProps<typeof buttonVariants> & {
    /** Render the single child (a react-router Link or an anchor) with the button styles. */
    asChild?: boolean;
    /** Pull the button toward a fine pointer. Needs AccessibilityProvider above it. */
    isMagnetic?: boolean;
  };

type ButtonBaseProps = Omit<ButtonProps, 'isMagnetic'>;

function assignRef<T>(ref: Ref<T> | undefined, node: T | null): void {
  if (typeof ref === 'function') {
    ref(node);
  } else if (ref) {
    ref.current = node;
  }
}

function ButtonBase({ intent, tone, size, asChild = false, className, ...rest }: ButtonBaseProps) {
  const Comp = asChild ? Slot : 'button';

  return <Comp className={cn(buttonVariants({ intent, tone, size }), className)} {...rest} />;
}

/**
 * Kept apart from the plain button so that useMagnetic, which reads AccessibilityProvider,
 * only runs when `isMagnetic` is set and a plain Button works without any provider.
 */
function MagneticButton({ ref, onPointerMove, onPointerLeave, ...rest }: ButtonBaseProps) {
  const magnetic = useMagnetic<HTMLButtonElement>();
  const magneticRef = magnetic.ref;

  const setRef = useCallback(
    (node: HTMLButtonElement | null) => {
      magneticRef.current = node;
      assignRef(ref, node);
    },
    [magneticRef, ref],
  );

  const handlePointerMove = (event: PointerEvent<HTMLButtonElement>) => {
    onPointerMove?.(event);
    magnetic.onPointerMove(event);
  };

  const handlePointerLeave = (event: PointerEvent<HTMLButtonElement>) => {
    onPointerLeave?.(event);
    magnetic.onPointerLeave();
  };

  return (
    <ButtonBase
      {...rest}
      ref={setRef}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
    />
  );
}

export function Button({ isMagnetic = false, ...rest }: ButtonProps) {
  return isMagnetic ? <MagneticButton {...rest} /> : <ButtonBase {...rest} />;
}

export default Button;
