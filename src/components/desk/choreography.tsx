'use client';

import { useRef } from 'react';
import { useGsapChoreography } from '@/components/motion/useGsap';

/* ───────────────────────────────────────────────────────────────────────────
   The desk's GSAP layer

   CSS does the steady state: hover, the meters, the drizzle, the chrome. GSAP
   does the things CSS cannot, which is anything needing a shared clock across
   several elements, or a value tweened rather than a property transitioned.

   It is loaded through the house `useGsapChoreography`, so it is lazy, scoped
   to the element it decorates, reverted on unmount, and never loaded at all
   under `prefers-reduced-motion`.
   ─────────────────────────────────────────────────────────────────────────── */

/**
 * The opening of a desk.
 *
 * One timeline, so the masthead, the figures and the first rows arrive as a
 * single considered movement rather than as a dozen independent animations
 * that happen to start together. Anything below the fold is handed to
 * ScrollTrigger instead and plays when it is reached.
 *
 * `[data-lift]` marks the pieces that take part. Everything is set to its
 * final state first, so a failure to load GSAP leaves a correct page rather
 * than an invisible one.
 */
export function DeskChoreography({ children }: { children: React.ReactNode }) {
  const scope = useRef<HTMLDivElement>(null);

  useGsapChoreography(
    scope,
    ({ gsap, ScrollTrigger }) => {
      const root = scope.current;
      if (!root) return;

      const above = gsap.utils.toArray<HTMLElement>('[data-lift="hero"]');
      const figures = gsap.utils.toArray<HTMLElement>('[data-lift="figure"]');

      gsap
        .timeline({ defaults: { ease: 'power3.out' } })
        .from(above, { y: 18, opacity: 0, duration: 0.7, stagger: 0.06 })
        .from(figures, { y: 14, opacity: 0, duration: 0.55, stagger: 0.045 }, '-=0.42');

      // Sections below the fold arrive as they are reached. `once` matters: a
      // desk is scrolled up and down all day and re-animating on every pass
      // would be exhausting.
      gsap.utils.toArray<HTMLElement>('[data-lift="section"]').forEach((section) => {
        gsap.from(section, {
          y: 20,
          opacity: 0,
          duration: 0.6,
          ease: 'power3.out',
          scrollTrigger: { trigger: section, start: 'top 88%', once: true },
        });
      });

      // Rows inside a list cascade, so a long list reads as filling rather than
      // as appearing.
      gsap.utils.toArray<HTMLElement>('[data-lift="list"]').forEach((list) => {
        gsap.from(list.querySelectorAll(':scope > *'), {
          opacity: 0,
          x: -10,
          duration: 0.45,
          ease: 'power2.out',
          stagger: 0.035,
          scrollTrigger: { trigger: list, start: 'top 90%', once: true },
        });
      });

      ScrollTrigger.refresh();
    },
    [],
  );

  return <div ref={scope}>{children}</div>;
}

/**
 * A card that tracks the pointer.
 *
 * Writes `--mx`/`--my` for the `.glow` gradient and applies a small magnetic
 * tilt with GSAP's quickTo, which keeps the tween on one interpolator instead
 * of creating a new one per event. Both are pointer-only: a touch device pays
 * for neither.
 */
export function Reactive({
  children,
  className,
  tilt = true,
}: {
  children: React.ReactNode;
  className?: string;
  tilt?: boolean;
}) {
  const scope = useRef<HTMLDivElement>(null);

  useGsapChoreography(
    scope,
    ({ gsap }) => {
      const node = scope.current;
      if (!node) return;
      if (!window.matchMedia('(pointer: fine)').matches) return;

      const toX = gsap.quickTo(node, 'rotationY', { duration: 0.6, ease: 'power3' });
      const toY = gsap.quickTo(node, 'rotationX', { duration: 0.6, ease: 'power3' });

      const onMove = (event: PointerEvent) => {
        const rect = node.getBoundingClientRect();
        const px = (event.clientX - rect.left) / rect.width;
        const py = (event.clientY - rect.top) / rect.height;
        node.style.setProperty('--mx', `${px * 100}%`);
        node.style.setProperty('--my', `${py * 100}%`);
        if (tilt) {
          // Capped at a degree and a half. Past that a dashboard starts to
          // feel like a toy and text starts to shimmer.
          toX((px - 0.5) * 3);
          toY((0.5 - py) * 3);
        }
      };

      const onLeave = () => {
        if (!tilt) return;
        toX(0);
        toY(0);
      };

      node.addEventListener('pointermove', onMove, { passive: true });
      node.addEventListener('pointerleave', onLeave);
      return () => {
        node.removeEventListener('pointermove', onMove);
        node.removeEventListener('pointerleave', onLeave);
      };
    },
    [tilt],
  );

  return (
    // `transformPerspective` is a GSAP property rather than a CSS one, so the
    // perspective is set the CSS way and GSAP tilts within it.
    <div ref={scope} className={className} style={{ perspective: '900px' }}>
      {children}
    </div>
  );
}
