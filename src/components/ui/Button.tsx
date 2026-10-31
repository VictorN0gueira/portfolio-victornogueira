import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { type ComponentPropsWithRef } from 'react';
import { cn } from '../../lib/utils';

/**
 * Pill button. Colors swap instantly on hover (only transform properties animate), the press
 * is a short `scale`, and the label may wrap onto two lines on narrow screens.
 * `tone` is the tone of the surface the button sits on: `dark` for black sections.
 * The border of the secondary intent is gray mid (3.1:1 on the cream), so the shape of the button is visible to low vision.
 */
const buttonVariants = cva(
  [
    'inline-flex items-center justify-center gap-2 rounded-full text-center font-medium',
    'cursor-pointer select-none',
    'focus-visible:outline-2 focus-visible:outline-offset-2',
    'transition-[scale] duration-150 ease-out active:scale-[0.97]',
    'disabled:pointer-events-none disabled:opacity-50',
  ],
  {
    variants: {
      intent: {
        primary: '',
        secondary: 'border border-vn-gray-mid bg-transparent',
      },
      tone: {
        light: '',
        dark: '',
      },
      // leading-tight comes after the font size: tailwind-merge drops a leading-* that precedes text-*.
      size: {
        md: 'min-h-11 px-5 py-2.5 text-sm leading-tight',
        lg: 'min-h-14 px-7 py-3.5 text-base leading-tight',
      },
    },
    compoundVariants: [
      {
        intent: 'primary',
        tone: 'light',
        class: 'bg-vn-ink text-vn-white hover:bg-vn-gray-dark focus-visible:outline-vn-ink',
      },
      {
        intent: 'primary',
        tone: 'dark',
        class: 'bg-vn-white text-vn-black hover:bg-vn-gray-light focus-visible:outline-vn-white',
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

type ButtonProps = ComponentPropsWithRef<'button'> &
  VariantProps<typeof buttonVariants> & {
    /** Render the single child (a react-router Link or an anchor) with the button styles. */
    asChild?: boolean;
  };

// A plain button defaults to type="button" so it never submits a form by accident, and a consumer
// `type` (spread after it) overrides the default. With asChild no type is added to the child.
// Use the native `disabled` attribute; aria-disabled is not enforced here.
export function Button({ intent, tone, size, asChild = false, className, ...rest }: ButtonProps) {
  const Comp = asChild ? Slot : 'button';

  return (
    <Comp
      type={asChild ? undefined : 'button'}
      className={cn(buttonVariants({ intent, tone, size }), className)}
      {...rest}
    />
  );
}

export default Button;
