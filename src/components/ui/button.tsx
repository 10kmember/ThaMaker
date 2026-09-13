import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-[background-color,color,border-color,transform] duration-200 ease-(--ease-ceremonial) disabled:pointer-events-none disabled:opacity-45 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        primary: 'bg-ink text-ivory hover:bg-ink-soft active:translate-y-px',
        outline: 'border border-ink/25 text-ink hover:border-ink/60 hover:bg-ink/[0.03]',
        ghost: 'text-ink hover:bg-ink/[0.05]',
        ceremonial:
          'border border-champagne-deep/60 bg-champagne/15 text-ink hover:bg-champagne/25',
        ivory: 'bg-ivory text-ink hover:bg-ivory-bright active:translate-y-px',
        quiet: 'border border-ivory/25 text-ivory hover:border-ivory/60 hover:bg-ivory/10',
        link: 'text-ink underline decoration-stone-deep underline-offset-4 hover:decoration-ink',
        danger: 'border border-red-900/30 bg-red-900/5 text-red-900 hover:bg-red-900/10',
      },
      size: {
        sm: 'palma-label h-9 px-4',
        md: 'palma-label h-11 px-6',
        lg: 'palma-label h-13 px-8 text-xs',
        icon: 'size-10',
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
