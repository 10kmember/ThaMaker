import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

/**
 * PALMA button behaviour.
 *
 * A button is a physical thing: it lifts a little when approached, a rule
 * travels across its foot, and it takes the press. Nothing bounces, nothing
 * scales, nothing changes colour dramatically — the movement *is* the feedback.
 *
 *   rest   → flat, rule at zero width
 *   hover  → lifts 4px, rule draws from the leading edge
 *   focus  → identical to hover, plus the ring
 *   press  → settles 1px into the page
 *
 * This is deliberately CSS rather than Motion. A hover state that needs
 * JavaScript is a hover state that costs hydration, breaks `:focus-visible`,
 * and needs a wrapper element that distorts layout. Motion earns its place on
 * entrances, exits and gestures — not here.
 */
const buttonVariants = cva(
  [
    'group/button relative inline-flex items-center justify-center gap-2 overflow-hidden whitespace-nowrap font-medium',
    'transition-[transform,background-color,color,border-color] duration-200 ease-(--ease-ceremonial)',
    'motion-safe:hover:-translate-y-1 motion-safe:focus-visible:-translate-y-1 motion-safe:active:translate-y-px motion-safe:active:duration-100',
    'disabled:pointer-events-none disabled:opacity-45 motion-safe:disabled:translate-y-0',
    '[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
    // The rule at the foot, drawn from the leading edge on approach.
    'after:absolute after:inset-x-0 after:bottom-0 after:h-px after:origin-left after:scale-x-0 after:bg-current/40',
    'after:transition-transform after:duration-[380ms] after:ease-(--ease-ceremonial)',
    'hover:after:scale-x-100 focus-visible:after:scale-x-100',
  ],
  {
    variants: {
      variant: {
        primary: 'bg-ink text-ivory hover:bg-ink-soft',
        outline: 'border border-ink/25 text-ink hover:border-ink/60 hover:bg-ink/[0.03]',
        ghost: 'text-ink hover:bg-ink/[0.05] after:hidden',
        ceremonial:
          'border border-champagne-deep/60 bg-champagne/15 text-ink hover:bg-champagne/25',
        ivory: 'bg-ivory text-ink hover:bg-ivory-bright',
        quiet: 'border border-ivory/25 text-ivory hover:border-ivory/60 hover:bg-ivory/10',
        link: 'text-ink underline decoration-stone-deep underline-offset-4 hover:decoration-ink after:hidden',
        danger: 'border border-red-900/30 bg-red-900/5 text-red-900 hover:bg-red-900/10',
      },
      size: {
        sm: 'palma-label h-9 px-4',
        md: 'palma-label h-11 px-6',
        lg: 'palma-label h-13 px-8 text-xs',
        icon: 'size-10 after:hidden',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);

export type ButtonProps = React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean };

export function Button({ className, variant, size, asChild = false, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : 'button';
  return <Comp className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}

export { buttonVariants };
