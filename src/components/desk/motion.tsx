'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

/* ───────────────────────────────────────────────────────────────────────────
   Desk motion: the half that needs a browser

   Three things and no more: the ambient wash that follows the pointer, the
   magnetic pill, and the figure that counts up when first seen. Everything
   else on a desk is CSS.

   Every prop here is serialisable on purpose. Nothing in this file takes a
   component, because an icon crossing this boundary would break the pages
   that render on the server.
   ─────────────────────────────────────────────────────────────────────────── */

/**
 * The ambient ground.
 *
 * Writes the pointer position onto the desk root as `--px`/`--py`, which the
 * two washes in `desk.css` read. Written straight to the node rather than
 * held in state: a re-render per mousemove would cost a full commit to move a
 * gradient a few pixels.
 *
 * Throttled to one write per frame, listener passive, and skipped entirely on
 * a device with no fine pointer — a phone would pay for a listener that can
 * never fire usefully.
 */
export function Ambient() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = ref.current?.parentElement;
    if (!node) return;
    if (!window.matchMedia('(pointer: fine)').matches) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let frame = 0;
    let x = 0.5;
    let y = 0.3;

    const apply = () => {
      frame = 0;
      node.style.setProperty('--px', x.toFixed(3));
      node.style.setProperty('--py', y.toFixed(3));
    };

    const onMove = (event: PointerEvent) => {
      x = event.clientX / window.innerWidth;
      y = event.clientY / window.innerHeight;
      if (!frame) frame = requestAnimationFrame(apply);
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    return () => {
      window.removeEventListener('pointermove', onMove);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return <div ref={ref} className="desk-ambient" aria-hidden />;
}

/**
 * A magnetic wrapper.
 *
 * The child leans toward the cursor while it is nearby and springs back when
 * it leaves. The pull is normalised to the element's own size and capped in
 * CSS at a few pixels, which is the difference between "alive" and "loose".
 */
export function Magnetic({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);

  const onPointerMove = useCallback((event: React.PointerEvent<HTMLSpanElement>) => {
    const node = event.currentTarget;
    const rect = node.getBoundingClientRect();
    node.style.setProperty('--dx', (((event.clientX - rect.left) / rect.width) * 2 - 1).toFixed(3));
    node.style.setProperty('--dy', (((event.clientY - rect.top) / rect.height) * 2 - 1).toFixed(3));
  }, []);

  const onPointerLeave = useCallback((event: React.PointerEvent<HTMLSpanElement>) => {
    event.currentTarget.style.setProperty('--dx', '0');
    event.currentTarget.style.setProperty('--dy', '0');
  }, []);

  return (
    <span
      ref={ref}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      className={cn('magnetic inline-flex', className)}
    >
      {children}
    </span>
  );
}

/**
 * A figure that counts up the first time it is seen.
 *
 * Observed rather than mounted, so a figure below the fold still animates
 * when it is scrolled to and one the reader never reaches never burns a
 * frame. The final value is what renders on the server and for anyone with
 * reduced motion, so the number is correct even if the script never runs.
 *
 * The easing overshoots and settles — the same physics as the cards, so a
 * counting number and the card under it land together.
 */
export function Counter({
  value,
  className,
  duration = 900,
}: {
  value: number | string;
  className?: string;
  duration?: number;
}) {
  const numeric = typeof value === 'number' ? value : null;
  const ref = useRef<HTMLSpanElement>(null);
  const [shown, setShown] = useState<number | string>(value);

  useEffect(() => {
    if (numeric === null || numeric === 0) return;
    const node = ref.current;
    if (!node) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let frame = 0;
    let done = false;

    const observer = new IntersectionObserver(
      (entries) => {
        if (done || !entries.some((entry) => entry.isIntersecting)) return;
        done = true;
        observer.disconnect();

        const started = performance.now();
        const step = (now: number) => {
          const t = Math.min(1, (now - started) / duration);
          // A damped spring: overshoots a touch past the target around 70%,
          // then settles onto it.
          const eased =
            t === 1 ? 1 : 1 - Math.pow(2, -9 * t) * Math.cos(((t * 10 - 0.75) * Math.PI) / 3);
          setShown(Math.max(0, Math.round(numeric * eased)));
          if (t < 1) frame = requestAnimationFrame(step);
          else setShown(numeric);
        };
        setShown(0);
        frame = requestAnimationFrame(step);
      },
      { threshold: 0.3 },
    );

    observer.observe(node);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [numeric, duration]);

  return (
    <span ref={ref} className={className}>
      {typeof shown === 'number' ? new Intl.NumberFormat('en-GB').format(shown) : shown}
    </span>
  );
}
