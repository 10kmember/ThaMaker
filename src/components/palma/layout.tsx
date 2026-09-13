import * as React from 'react';
import { cn } from '@/lib/utils';

export function Container({
  className,
  size = 'default',
  ...props
}: React.ComponentProps<'div'> & { size?: 'default' | 'wide' | 'narrow' }) {
  return (
    <div
      className={cn(
        'mx-auto w-full px-5 sm:px-8',
        size === 'wide' ? 'max-w-360' : size === 'narrow' ? 'max-w-180' : 'max-w-300',
        className,
      )}
      {...props}
    />
  );
}

export function Section({
  className,
  tone = 'ivory',
  ...props
}: React.ComponentProps<'section'> & { tone?: 'ivory' | 'ink' | 'stone' | 'olive' }) {
  const tones = {
    ivory: 'bg-ivory text-ink',
    stone: 'bg-stone/35 text-ink',
    ink: 'on-ink bg-ink text-ivory',
    olive: 'on-ink bg-olive text-ivory',
  } as const;

  return <section className={cn('py-20 sm:py-28', tones[tone], className)} {...props} />;
}

/**
 * The standing section header: an institutional label, a display title, and an
 * optional standfirst. Used everywhere so the page rhythm stays consistent.
 */
export function SectionHeading({
  label,
  title,
  standfirst,
  action,
  align = 'start',
  className,
}: {
  label?: string;
  title: React.ReactNode;
  standfirst?: React.ReactNode;
  action?: React.ReactNode;
  align?: 'start' | 'centre';
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between',
        align === 'centre' && 'sm:flex-col sm:items-center sm:text-center',
        className,
      )}
    >
      <div className={cn('flex max-w-180 flex-col gap-4', align === 'centre' && 'items-center')}>
        {label ? <span className="palma-label text-taupe-deep">{label}</span> : null}
        <h2 className="text-3xl leading-[1.08] sm:text-4xl lg:text-[2.75rem]">{title}</h2>
        {standfirst ? (
          <p className="text-taupe-deep max-w-150 text-[1.0625rem] leading-relaxed">{standfirst}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function PageHeader({
  label,
  title,
  standfirst,
  meta,
  children,
  tone = 'ink',
}: {
  label?: string;
  title: React.ReactNode;
  standfirst?: React.ReactNode;
  meta?: React.ReactNode;
  children?: React.ReactNode;
  tone?: 'ink' | 'ivory';
}) {
  const dark = tone === 'ink';
  return (
    <header
      className={cn(
        'relative overflow-hidden border-b',
        dark ? 'on-ink border-ink bg-ink text-ivory' : 'border-stone-deep bg-ivory text-ink',
      )}
    >
      <Container className="relative py-16 sm:py-24">
        <div className="flex max-w-220 flex-col gap-6">
          {label ? (
            <span className={cn('palma-label', dark ? 'text-champagne' : 'text-taupe-deep')}>
              {label}
            </span>
          ) : null}
          <h1 className="text-4xl leading-[1.02] sm:text-6xl lg:text-7xl">{title}</h1>
          {standfirst ? (
            <p
              className={cn(
                'max-w-160 text-lg leading-relaxed',
                dark ? 'text-ivory/70' : 'text-taupe-deep',
              )}
            >
              {standfirst}
            </p>
          ) : null}
          {meta ? <div className="flex flex-wrap items-center gap-3 pt-2">{meta}</div> : null}
          {children}
        </div>
      </Container>
    </header>
  );
}
