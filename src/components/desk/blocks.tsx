import type { LucideIcon } from 'lucide-react';
import { ArrowUpRight, ChevronRight } from 'lucide-react';
import { Card, CardLink, Glyph, Label, Tag, Meter, Ring, Kinetic, Row, RowText } from './surface';
import { Counter } from './motion';
import { Reactive } from './choreography';
import { cn } from '@/lib/utils';

/* ───────────────────────────────────────────────────────────────────────────
   Desk blocks

   The composed pieces a desk is assembled from. A desk page should read as an
   arrangement of these and almost nothing else, which is what keeps four
   different rooms feeling like one building.
   ─────────────────────────────────────────────────────────────────────────── */

/**
 * The masthead.
 *
 * Who you are, what the desk is, and the one number that says whether
 * anything needs you, answered before the reader has read a word. It is the
 * single panel on the page that carries the travelling beam, so the ceremony
 * stays rare enough to mean something.
 */
export function Masthead({
  eyebrow,
  eyebrowIcon,
  title,
  statement,
  figure,
  aside,
  children,
}: {
  eyebrow: string;
  eyebrowIcon: LucideIcon;
  title: string;
  statement: React.ReactNode;
  figure?: { value: number; caption: string; tone?: 'accent' | 'neutral' };
  /** A dial or similar, in place of the plain figure. */
  aside?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <Reactive className="beam rounded-[1.125rem]">
      <Card elevation="primary" className="glow sheen p-5 sm:p-7">
        {/* Only when the plain figure is on show. With a dial in its place the
            watermark has nothing to echo and becomes a smudge behind it. */}
        {figure && !aside ? (
          <span className="watermark" aria-hidden>
            {figure.value}
          </span>
        ) : null}

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between lg:gap-10">
          <div className="flex min-w-0 flex-col gap-2.5">
            <span data-lift="hero">
              <Label icon={eyebrowIcon} className="text-[color:var(--accent)]">
                {eyebrow}
              </Label>
            </span>
            <h1
              data-lift="hero"
              className="font-display text-[1.75rem] leading-[1.1] tracking-tight text-balance text-[color:var(--text)] sm:text-[2.25rem]"
            >
              <Kinetic text={title} />
            </h1>
            <p
              data-lift="hero"
              className="max-w-[54ch] text-[0.9375rem] leading-relaxed text-[color:var(--text-soft)]"
            >
              {statement}
            </p>
            {children ? (
              <div data-lift="hero" className="mt-2 flex flex-wrap items-center gap-2">
                {children}
              </div>
            ) : null}
          </div>

          {aside ??
            (figure ? (
              <div
                data-lift="hero"
                className="flex shrink-0 items-baseline gap-3 lg:flex-col lg:items-end lg:gap-1"
              >
                <Counter
                  value={figure.value}
                  className={cn(
                    'figure text-5xl sm:text-6xl',
                    figure.tone !== 'neutral' && 'figure-accent',
                  )}
                />
                <span className="label lg:text-right">{figure.caption}</span>
              </div>
            ) : null)}
        </div>
      </Card>
    </Reactive>
  );
}

/**
 * A figure on a card.
 *
 * The unit the command centre is built from. Linked tiles lift; unlinked ones
 * sit still. `attention` only shows when the value is non-zero, because a red
 * tile reading "0 reports" teaches people to ignore red.
 */
export function Stat({
  icon,
  label,
  value,
  note,
  href,
  tone = 'neutral',
  className,
}: {
  icon: LucideIcon;
  label: string;
  value: number | string;
  note?: string;
  href?: string;
  tone?: 'neutral' | 'attention' | 'accent';
  className?: string;
}) {
  const hot = tone === 'attention' && Number(value) > 0;
  const glyphTone = hot ? 'alert' : tone === 'accent' ? 'accent' : 'neutral';

  const body = (
    <div className="flex h-full flex-col justify-between gap-4 p-3.5">
      <div className="flex items-start justify-between gap-2">
        <Glyph icon={icon} size="sm" tone={glyphTone} />
        {href ? (
          <ArrowUpRight
            className="size-3.5 translate-y-0.5 text-[color:var(--text-quiet)] opacity-0 transition-all duration-400 group-hover:translate-y-0 group-hover:opacity-100"
            aria-hidden
          />
        ) : null}
      </div>
      <div className="flex flex-col gap-0.5">
        <Counter
          value={value}
          className={cn(
            'figure text-[1.6rem]',
            hot && 'figure-attention',
            tone === 'accent' && !hot && 'figure-accent',
          )}
        />
        <span className="label text-[9.5px] leading-snug">{label}</span>
        {note ? (
          <span className="text-[0.6875rem] leading-relaxed text-[color:var(--text-quiet)]">
            {note}
          </span>
        ) : null}
      </div>
    </div>
  );

  return href ? (
    <CardLink href={href} className={cn('glow sheen', className)} data-lift="figure">
      {body}
    </CardLink>
  ) : (
    <Card className={cn('glow', className)} data-lift="figure">
      {body}
    </Card>
  );
}

/**
 * A queue row.
 *
 * The count leads, because the reader is scanning for the one that is not
 * zero. A cleared queue recedes rather than being hidden: that it is clear is
 * information too.
 */
export function QueueRow({
  href,
  icon,
  label,
  note,
  count,
}: {
  href: string;
  icon: LucideIcon;
  label: string;
  note: string;
  count: number;
}) {
  const waiting = count > 0;

  return (
    <Row href={href} className={cn(!waiting && 'opacity-60')}>
      <span className="row-count" data-waiting={waiting || undefined}>
        {count}
      </span>
      <Glyph icon={icon} size="sm" tone={waiting ? 'accent' : 'neutral'} />
      <RowText title={label} note={note} />
      <ChevronRight
        className="ml-auto size-4 shrink-0 -translate-x-1 text-[color:var(--text-quiet)] opacity-0 transition-all duration-400 group-hover:translate-x-0 group-hover:opacity-100"
        aria-hidden
      />
    </Row>
  );
}

/** A named thing with a completion meter, as a row in a list. */
export function ProgressRow({
  title,
  done,
  total,
  action,
}: {
  title: string;
  done: number;
  total: number;
  action?: React.ReactNode;
}) {
  return (
    <Row className="flex-col items-stretch gap-2 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="row-title">{title}</span>
        {action}
      </div>
      <div className="flex items-center gap-3">
        <Meter value={done} total={total} className="flex-1" />
        <span className="label w-11 shrink-0 text-right text-[10px] tabular-nums">
          {done}/{total}
        </span>
      </div>
    </Row>
  );
}

/** A side panel: glyph, title, prose, and usually one thing to do. */
export function Panel({
  icon,
  title,
  tone = 'neutral',
  badge,
  children,
  className,
}: {
  icon: LucideIcon;
  title: string;
  tone?: 'neutral' | 'accent' | 'positive' | 'alert';
  badge?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn('glow p-4', className)} data-lift="section">
      <div className="mb-2.5 flex items-center gap-2.5">
        <Glyph icon={icon} size="sm" tone={tone} />
        <h3 className="font-display text-sm text-[color:var(--text)]">{title}</h3>
        {badge ? <span className="ml-auto">{badge}</span> : null}
      </div>
      <div className="text-[0.8125rem] leading-relaxed text-[color:var(--text-soft)]">
        {children}
      </div>
    </Card>
  );
}

/**
 * A dial with its reading.
 *
 * For the single proportion a card exists to show: a ring is read at a glance
 * where a bar has to be measured.
 */
export function Dial({
  value,
  total,
  caption,
  tone = 'accent',
  size = 104,
}: {
  value: number;
  total: number;
  caption: string;
  tone?: 'accent' | 'positive' | 'alert';
  size?: number;
}) {
  const pct = Math.round((value / Math.max(1, total)) * 100);

  return (
    <div className="flex shrink-0 flex-col items-center gap-1.5" data-lift="hero">
      <Ring value={value} total={total} size={size} tone={tone}>
        <span className="flex flex-col items-center gap-0.5">
          <span className="figure text-xl">{pct}%</span>
          <span className="text-[0.625rem] text-[color:var(--text-quiet)] tabular-nums">
            {value}/{total}
          </span>
        </span>
      </Ring>
      <span className="label text-[10px]">{caption}</span>
    </div>
  );
}

/**
 * The activity stream.
 *
 * A vertical rail with a node per entry. The rail is what makes a list of
 * audit rows read as a chronology rather than as a table.
 */
export function Stream({
  entries,
}: {
  entries: { id: string; when: string; title: string; detail: string }[];
}) {
  return (
    <ol className="relative flex flex-col px-3.5 py-2" data-lift="list">
      <span
        className="absolute top-5 bottom-5 left-[1.0625rem] w-px bg-[color:var(--line)]"
        aria-hidden
      />
      {entries.map((entry) => (
        <li key={entry.id} className="relative flex gap-3.5 py-2 pl-5">
          <span
            className="absolute top-[0.6875rem] left-0 size-[0.375rem] rounded-full bg-[color:var(--accent)] ring-4 ring-[color:var(--surface-1)]"
            aria-hidden
          />
          <span className="label w-20 shrink-0 pt-px text-[10px] leading-snug">{entry.when}</span>
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="text-[0.8125rem] font-medium text-[color:var(--text)]">
              {entry.title}
            </span>
            <span className="text-[0.75rem] leading-relaxed text-[color:var(--text-quiet)]">
              {entry.detail}
            </span>
          </span>
        </li>
      ))}
    </ol>
  );
}

export { Tag };
