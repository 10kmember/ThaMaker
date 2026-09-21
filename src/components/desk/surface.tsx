import type { LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

/* ───────────────────────────────────────────────────────────────────────────
   Desk surfaces: the static half of the kit

   No `'use client'` here, and it must not acquire one. A Lucide icon is a
   function component and cannot be serialised across the server/client
   boundary, so anything taking an `icon` prop has to stay a server module or
   every server page passing it one fails to render. The handful of pieces
   that genuinely need a browser live in `motion.tsx`.
   ─────────────────────────────────────────────────────────────────────────── */

type Elevation = 'resting' | 'raised' | 'primary' | 'quiet';

const ELEVATION: Record<Elevation, string> = {
  resting: '',
  raised: 'card-raised',
  primary: 'card-primary',
  quiet: 'card-quiet',
};

export function Card({
  children,
  className,
  elevation = 'resting',
  index,
  reveal,
  ...rest
}: {
  children: React.ReactNode;
  className?: string;
  elevation?: Elevation;
  /** Stagger position for the above-the-fold entrance. */
  index?: number;
  /** Reveal as it scrolls into view instead. */
  reveal?: boolean;
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...rest}
      style={index === undefined ? undefined : ({ ['--i']: index } as React.CSSProperties)}
      className={cn(
        'card',
        ELEVATION[elevation],
        reveal && 'reveal',
        index !== undefined && 'enter',
        className,
      )}
    >
      {children}
    </div>
  );
}

/** The same surface as a link: lifts on hover, settles on press. */
export function CardLink({
  href,
  children,
  className,
  elevation = 'resting',
  index,
  reveal,
  ...rest
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
  elevation?: Elevation;
  index?: number;
  reveal?: boolean;
} & Omit<React.ComponentPropsWithoutRef<'a'>, 'href'>) {
  return (
    <Link
      {...rest}
      href={href}
      style={index === undefined ? undefined : ({ ['--i']: index } as React.CSSProperties)}
      className={cn(
        'card card-interactive group block',
        ELEVATION[elevation],
        reveal && 'reveal',
        index !== undefined && 'enter',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--accent)]',
        className,
      )}
    >
      {children}
    </Link>
  );
}

/**
 * An icon in a tinted well.
 *
 * Small and quiet on purpose. The icon is an aid to scanning a column of
 * rows, not an illustration, so it gets a tint and a corner radius and
 * nothing else.
 */
export function Glyph({
  icon: Icon,
  tone = 'neutral',
  size = 'md',
  className,
}: {
  icon: LucideIcon;
  tone?: 'neutral' | 'accent' | 'positive' | 'alert';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const box = size === 'sm' ? 'size-7' : size === 'lg' ? 'size-11' : 'size-9';
  const glyph = size === 'sm' ? 'size-3.5' : size === 'lg' ? 'size-5' : 'size-4';

  return (
    <span
      className={cn(
        'grid shrink-0 place-items-center rounded-[0.5rem] ring-1 ring-inset',
        box,
        tone === 'accent' &&
          'bg-[color:var(--accent-wash)] text-[color:var(--accent)] ring-[color:var(--accent)]/20',
        tone === 'positive' &&
          'bg-[color:var(--positive-wash)] text-[color:var(--positive)] ring-[color:var(--positive)]/20',
        tone === 'alert' &&
          'bg-[color:var(--alert-wash)] text-[color:var(--alert)] ring-[color:var(--alert)]/20',
        tone === 'neutral' &&
          'bg-[color:var(--surface-0)] text-[color:var(--text-quiet)] ring-[color:var(--line)]',
        className,
      )}
    >
      <Icon className={glyph} strokeWidth={1.75} />
    </span>
  );
}

/** Small caps, for the line above a title. */
export function Label({
  children,
  className,
  icon: Icon,
}: {
  children: React.ReactNode;
  className?: string;
  icon?: LucideIcon;
}) {
  return (
    <span className={cn('label inline-flex items-center gap-1.5', className)}>
      {Icon ? <Icon className="size-3.5" strokeWidth={2} /> : null}
      {children}
    </span>
  );
}

/** A pill. Status, counts, tags. */
export function Tag({
  children,
  tone = 'neutral',
  className,
}: {
  children: React.ReactNode;
  tone?: 'neutral' | 'accent' | 'positive' | 'alert';
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap ring-1 ring-inset',
        tone === 'accent' &&
          'bg-[color:var(--accent-wash)] text-[color:var(--accent)] ring-[color:var(--accent)]/25',
        tone === 'positive' &&
          'bg-[color:var(--positive-wash)] text-[color:var(--positive)] ring-[color:var(--positive)]/25',
        tone === 'alert' &&
          'bg-[color:var(--alert-wash)] text-[color:var(--alert)] ring-[color:var(--alert)]/25',
        tone === 'neutral' && 'text-[color:var(--text-soft)] ring-[color:var(--line)]',
        className,
      )}
    >
      {children}
    </span>
  );
}

/** A section heading. A rule to its right ties the row together. */
export function SectionHead({
  title,
  icon,
  action,
  className,
}: {
  title: string;
  icon?: LucideIcon;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('mb-4 flex flex-wrap items-center gap-3', className)}>
      {icon ? <Glyph icon={icon} size="sm" /> : null}
      <h2 className="font-display text-[1.0625rem] tracking-tight text-[color:var(--text)]">
        {title}
      </h2>
      <span className="hidden h-px min-w-6 flex-1 bg-[color:var(--line)] sm:block" aria-hidden />
      {action}
    </div>
  );
}

/** A linear progress track. */
export function Meter({
  value,
  total,
  className,
}: {
  value: number;
  total: number;
  className?: string;
}) {
  const pct = Math.min(100, Math.round((value / Math.max(1, total)) * 100));
  const complete = total > 0 && value >= total;

  return (
    <div
      className={cn('meter', className)}
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={total}
    >
      <div
        className="meter-fill"
        data-complete={complete || undefined}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

/**
 * A radial dial.
 *
 * For the single proportion a card exists to show. `--pct` drives a conic
 * sweep that is masked into a ring by the inner disc, and is registered as an
 * `<number>` in the stylesheet so the sweep can actually animate.
 */
export function Ring({
  value,
  total,
  size = 64,
  tone = 'accent',
  children,
  className,
}: {
  value: number;
  total: number;
  size?: number;
  tone?: 'accent' | 'positive' | 'alert';
  children?: React.ReactNode;
  className?: string;
}) {
  const pct = Math.min(100, Math.round((value / Math.max(1, total)) * 100));
  const colour =
    tone === 'positive' ? 'var(--positive)' : tone === 'alert' ? 'var(--alert)' : 'var(--accent)';

  return (
    <div
      className={cn('ring', className)}
      style={
        {
          width: size,
          height: size,
          ['--pct']: pct,
          ['--ring-colour']: colour,
        } as React.CSSProperties
      }
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={total}
    >
      {children}
    </div>
  );
}

/** A status dot that breathes. */
export function Dot({ tone = 'positive' }: { tone?: 'positive' | 'accent' | 'alert' }) {
  return <span className="dot" data-tone={tone === 'positive' ? undefined : tone} aria-hidden />;
}

/**
 * A heading whose words rise on a stagger.
 *
 * Split on whitespace and reassembled with the spaces intact, so the rendered
 * text is identical to what was passed in — the animation is decoration over
 * a correct DOM, never a substitute for it.
 */
export function Kinetic({ text, className }: { text: string; className?: string }) {
  const words = text.split(' ');
  return (
    <span className={className}>
      {words.map((word, i) => (
        <span key={`${word}-${i}`} className="kinetic">
          <span style={{ ['--w']: i } as React.CSSProperties}>
            {word}
            {i < words.length - 1 ? ' ' : ''}
          </span>
        </span>
      ))}
    </span>
  );
}

/** An inline notice. Quiet by default; the tone does the talking. */
export function Notice({
  icon,
  tone = 'accent',
  children,
}: {
  icon: LucideIcon;
  tone?: 'accent' | 'positive' | 'alert';
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        'card flex items-center gap-3.5 px-4 py-3',
        tone === 'alert' && 'border-[color:var(--alert)]/25',
        tone === 'accent' && 'border-[color:var(--accent)]/25',
        tone === 'positive' && 'border-[color:var(--positive)]/25',
      )}
    >
      <Glyph icon={icon} size="sm" tone={tone} />
      <div className="text-sm leading-relaxed text-[color:var(--text-soft)]">{children}</div>
    </div>
  );
}

/** An empty state that still looks considered. */
export function Empty({
  icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <div className="card flex flex-col items-center gap-2.5 px-6 py-10 text-center">
      <Glyph icon={icon} size="lg" />
      <h3 className="font-display mt-1 text-base text-[color:var(--text)]">{title}</h3>
      <p className="max-w-[44ch] text-sm leading-relaxed text-[color:var(--text-quiet)]">
        {description}
      </p>
    </div>
  );
}

/** A button-shaped link. */
export function Action({
  href,
  icon: Icon,
  children,
  tone = 'neutral',
  className,
}: {
  href: string;
  icon?: LucideIcon;
  children: React.ReactNode;
  tone?: 'neutral' | 'accent';
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        'group inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium',
        'pointer-coarse:min-h-11 pointer-coarse:px-5',
        'transition-[transform,background-color,box-shadow] duration-500 [transition-timing-function:var(--spring)]',
        'hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--accent)]',
        tone === 'accent'
          ? 'bg-[color:var(--accent)] text-[color:var(--surface-0)] shadow-[var(--lift-1)] hover:shadow-[var(--lift-2)]'
          : 'border border-[color:var(--line)] bg-[color:var(--surface-1)] text-[color:var(--text)] shadow-[var(--lift-1)] hover:shadow-[var(--lift-2)]',
        className,
      )}
    >
      {Icon ? (
        <Icon
          className="size-4 transition-transform duration-500 [transition-timing-function:var(--spring)] group-hover:translate-x-0.5"
          strokeWidth={1.75}
        />
      ) : null}
      {children}
    </Link>
  );
}

/**
 * A list.
 *
 * One card holding rows, with rules between them. Replaces the stack of
 * separate cards each row used to be: twelve cards is twelve shadows, twelve
 * borders and eleven gutters of wasted height for something the eye wants to
 * run straight down.
 */
export function List({
  children,
  className,
  index,
  reveal,
  ...rest
}: {
  children: React.ReactNode;
  className?: string;
  index?: number;
  reveal?: boolean;
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <Card {...rest} index={index} reveal={reveal} className={cn('list', className)}>
      {children}
    </Card>
  );
}

/** A row inside a list. As a link when it goes somewhere, a div when it does not. */
export function Row({
  href,
  children,
  className,
  index,
}: {
  href?: string;
  children: React.ReactNode;
  className?: string;
  index?: number;
}) {
  const style = index === undefined ? undefined : ({ ['--i']: index } as React.CSSProperties);

  if (!href) {
    return (
      <div className={cn('row', className)} style={style}>
        {children}
      </div>
    );
  }

  return (
    <Link
      href={href}
      style={style}
      className={cn(
        'row group',
        'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[color:var(--accent)]',
        className,
      )}
    >
      {children}
    </Link>
  );
}

/** The title and supporting line inside a row. */
export function RowText({
  title,
  note,
  noteFromSm,
}: {
  title: React.ReactNode;
  note?: React.ReactNode;
  /**
   * Hold the note back until there is room for it.
   *
   * On a phone a row that carries a title, a note, a control and a link
   * truncates the one thing worth reading. Where the note is a detail rather
   * than the point, it waits for the small breakpoint.
   */
  noteFromSm?: boolean;
}) {
  return (
    <span className="flex min-w-0 flex-col gap-0.5">
      <span className="row-title line-clamp-2 sm:line-clamp-none sm:truncate">{title}</span>
      {note ? (
        <span className={cn('row-note truncate', noteFromSm && 'hidden sm:block')}>{note}</span>
      ) : null}
    </span>
  );
}

/**
 * A value meant to be copied: a URL, a verification code.
 *
 * Monospace, on the page's own recessed step, and it wraps rather than
 * truncating, because half a URL is worse than a long one. The copy control
 * is passed in, since it owns clipboard state and has to be a client
 * component.
 */
export function Snippet({
  value,
  action,
  className,
}: {
  value: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <p
      className={cn(
        'flex items-center gap-2 rounded-[0.625rem] px-3 py-2.5',
        'bg-[color:var(--surface-0)] ring-1 ring-[color:var(--line)] ring-inset',
        'font-mono text-[0.75rem] break-all text-[color:var(--text-soft)]',
        className,
      )}
    >
      <span className="min-w-0 break-all">{value}</span>
      {action ? <span className="ml-auto shrink-0">{action}</span> : null}
    </p>
  );
}

/**
 * A list of term-and-value pairs, as rows in a card.
 *
 * The pattern that a settings page is almost entirely made of. It renders a
 * real `<dl>`, so a screen reader reads it as the pairs it is, and the value
 * is allowed to wrap where the term never is.
 */
export function Facts({
  items,
  className,
}: {
  items: { term: string; value: React.ReactNode }[];
  className?: string;
}) {
  return (
    <dl className={cn('list', className)}>
      {items.map((entry) => (
        <div key={entry.term} className="row gap-4 py-2.5">
          <dt className="shrink-0 text-[0.8125rem] text-[color:var(--text-quiet)]">{entry.term}</dt>
          <dd className="ml-auto min-w-0 text-right text-[0.8125rem] break-words text-[color:var(--text)]">
            {entry.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
