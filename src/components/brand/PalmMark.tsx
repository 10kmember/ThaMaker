import { cn } from '@/lib/utils';

type PalmMarkProps = {
  className?: string;
  /** `line` for engraved outlines, `solid` for a compact app/badge mark. */
  variant?: 'line' | 'solid';
  title?: string;
};

/**
 * The PALMA mark.
 *
 * A palm reduced to an engraved spine and open fronds that sweep upward — the
 * geometry of victory and honour rather than a picture of a tree. The fronds
 * are single open strokes, never closed leaf shapes, so the mark reads as a
 * ceremonial engraving at any size.
 */
export function PalmMark({ className, variant = 'line', title }: PalmMarkProps) {
  const decorative = !title;

  return (
    <svg
      viewBox="0 0 48 56"
      fill="none"
      className={cn('h-6 w-auto', className)}
      role={decorative ? 'presentation' : 'img'}
      aria-hidden={decorative || undefined}
      aria-label={title}
      focusable="false"
    >
      {title ? <title>{title}</title> : null}
      <g
        stroke="currentColor"
        strokeWidth={variant === 'solid' ? 2.4 : 1.3}
        strokeLinecap="round"
        fill="none"
      >
        {/* Spine */}
        <path d="M24 53V9" />

        {/* Fronds: open sweeps, longest at the crown, tightening downward */}
        <path d="M24 13C18.2 9.8 12.6 9.4 7.2 11.8" />
        <path d="M24 13c5.8-3.2 11.4-3.6 16.8-1.2" />
        <path d="M24 21.5C18.8 17.6 13.5 16.3 8.2 17.6" />
        <path d="M24 21.5c5.2-3.9 10.5-5.2 15.8-3.9" />
        <path d="M24 30.5c-4.6-4.2-9.3-6-14-5.4" />
        <path d="M24 30.5c4.6-4.2 9.3-6 14-5.4" />
        <path d="M24 39.5c-3.9-4.2-7.9-6.3-11.9-6.2" />
        <path d="M24 39.5c3.9-4.2 7.9-6.3 11.9-6.2" />

        {/* Crown */}
        <circle cx="24" cy="5.4" r="2.1" />
      </g>
    </svg>
  );
}
