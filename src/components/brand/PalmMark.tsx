import { cn } from '@/lib/utils';

type PalmMarkProps = {
  className?: string;
  /** `line` for engraved outlines, `solid` for a compact app/badge mark. */
  variant?: 'line' | 'solid';
  title?: string;
};

/**
 * The PALMA mark: an abstract palm reduced to an engraved stem and paired
 * fronds. It reads as a branching geometry or a laurel at small sizes, and
 * never as a tropical illustration.
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
        strokeWidth={variant === 'solid' ? 2.6 : 1.4}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* Stem */}
        <path d="M24 54V18" />
        {/* Paired fronds, tightening towards the crown */}
        <path d="M24 20c-6.4-1.2-11-5.2-13.2-11.2C17.1 8.4 21.8 12 24 17.6" />
        <path d="M24 20c6.4-1.2 11-5.2 13.2-11.2C30.9 8.4 26.2 12 24 17.6" />
        <path d="M24 30c-5.4-1-9.3-4.4-11.2-9.5C18.2 20.9 22.1 24 24 28.2" />
        <path d="M24 30c5.4-1 9.3-4.4 11.2-9.5C29.8 20.9 25.9 24 24 28.2" />
        <path d="M24 40c-4.3-.8-7.5-3.5-9-7.6C19.5 33 22.6 35.5 24 38.9" />
        <path d="M24 40c4.3-.8 7.5-3.5 9-7.6C28.5 33 25.4 35.5 24 38.9" />
        {/* Crown */}
        <path d="M24 17.6V6" />
        <circle cx="24" cy="3.4" r="2.2" />
      </g>
    </svg>
  );
}
