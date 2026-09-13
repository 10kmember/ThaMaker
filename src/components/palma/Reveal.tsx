'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

type RevealProps = React.ComponentProps<'div'> & {
  /** Stagger in milliseconds, applied as an animation delay. */
  delay?: number;
  variant?: 'rise' | 'reveal';
};

/**
 * Editorial reveal on scroll. One IntersectionObserver per element, no library,
 * and nothing happens at all under `prefers-reduced-motion` — the content is
 * simply present.
 */
export function Reveal({ className, delay = 0, variant = 'rise', children, ...props }: RevealProps) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [shown, setShown] = React.useState(false);

  React.useEffect(() => {
    const node = ref.current;
    if (!node) return;

    if (
      typeof window === 'undefined' ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      setShown(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setShown(true);
            observer.disconnect();
          }
        }
      },
      { rootMargin: '0px 0px -12% 0px', threshold: 0.08 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      data-shown={shown}
      style={shown && delay ? { animationDelay: `${delay}ms` } : undefined}
      className={cn(
        'motion-safe:data-[shown=false]:opacity-0',
        shown &&
          (variant === 'reveal'
            ? 'motion-safe:animate-(--animate-reveal)'
            : 'motion-safe:animate-(--animate-rise)'),
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
