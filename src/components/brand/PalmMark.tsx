import { cn } from '@/lib/utils';
import { MARK_CROWN, MARK_PATHS, MARK_VIEWBOX } from './geometry';

type PalmMarkProps = {
  className?: string;
  /** `line` for engraved outlines, `solid` for a compact app/badge mark. */
  variant?: 'line' | 'solid';
  title?: string;
};

/**
 * The PALMA mark.
 *
 * A palm reduced to an engraved spine and open fronds that sweep upward: the
 * geometry of victory and honour rather than a picture of a tree. The fronds
 * are single open strokes, never closed leaf shapes, so the mark reads as a
 * ceremonial engraving at any size.
 *
 * The paths live in `geometry.ts` and are shared with the favicon, the seal and
 * every generated image, so the mark cannot be redrawn by hand in one place and
 * quietly stop matching itself in the others.
 */
export function PalmMark({ className, variant = 'line', title }: PalmMarkProps) {
  const decorative = !title;

  return (
    <svg
      viewBox={MARK_VIEWBOX}
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
        {MARK_PATHS.map((d) => (
          <path key={d} d={d} />
        ))}
        <circle cx={MARK_CROWN.cx} cy={MARK_CROWN.cy} r={MARK_CROWN.r} />
      </g>
    </svg>
  );
}
