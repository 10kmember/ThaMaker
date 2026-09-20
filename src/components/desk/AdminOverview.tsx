import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { Monitor, AlertTriangle, ChevronRight, GitBranch, CalendarRange } from 'lucide-react';
import { Card, SectionHead, Label, Tag, Dot, Notice } from './surface';
import { Masthead, Stat } from './blocks';
import { cn } from '@/lib/utils';

/* ───────────────────────────────────────────────────────────────────────────
   The command centre

   The institution in one screen. Four constellations of figures on a bento
   grid: the first figure of a group is the one the group is about, so it
   takes two columns and the rest fall in beside it.

   Deliberately not a wall of charts. The administrator's question here is
   whether anything is wrong and where, which a number answers faster than a
   line.
   ─────────────────────────────────────────────────────────────────────────── */

export type AdminStat = {
  label: string;
  value: number | string;
  note?: string;
  href?: string;
  tone?: 'neutral' | 'attention' | 'accent';
  icon: LucideIcon;
};

export type AdminGroupBlock = { title: string; icon: LucideIcon; stats: AdminStat[] };

export function AdminOverview({
  greeting,
  firstName,
  periodLabel,
  outstanding,
  since,
  degraded,
  groups,
  filter,
  seasonLine,
  advance,
}: {
  greeting: string;
  firstName: string;
  periodLabel: string;
  outstanding: number;
  since?: string | null;
  degraded: string[];
  groups: AdminGroupBlock[];
  /** The period switcher, passed in so this view stays presentational. */
  filter?: React.ReactNode;
  seasonLine?: string | null;
  /** The advance-season form, which owns a server action of its own. */
  advance?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-6">
      <Masthead
        eyebrow="Command centre"
        eyebrowIcon={Monitor}
        title={`${greeting}, ${firstName}.`}
        statement={
          <>
            {outstanding === 0
              ? 'Nothing is waiting on a person across the institution.'
              : `${outstanding} item${outstanding === 1 ? '' : 's'} across the queues need a decision.`}{' '}
            Figures below cover {periodLabel.toLowerCase()}
            {since ? `, counted since ${since}` : ''}.
          </>
        }
        figure={{ value: outstanding, caption: 'open decisions' }}
      >
        {seasonLine ? (
          <Tag tone="accent">
            <CalendarRange className="size-3.5" />
            {seasonLine}
          </Tag>
        ) : null}
        {degraded.length === 0 ? (
          <Tag tone="positive">
            <Dot />
            All services operational
          </Tag>
        ) : null}
      </Masthead>

      {degraded.length > 0 ? (
        <div data-lift="section">
          <Notice icon={AlertTriangle} tone="alert">
            <strong className="text-[color:var(--text)]">A service is not healthy.</strong>{' '}
            {degraded.join(', ')}{' '}
            <Link
              href="/admin/health"
              className="tap inline-flex items-center gap-0.5 font-medium text-[color:var(--accent)] underline-offset-4 hover:underline"
            >
              view system health
              <ChevronRight className="size-3.5" />
            </Link>
          </Notice>
        </div>
      ) : null}

      {filter ? (
        <div className="flex flex-wrap items-center gap-3" data-lift="hero">
          {filter}
        </div>
      ) : null}

      {groups.map((group) => (
        <section key={group.title} data-lift="section">
          <SectionHead
            icon={group.icon}
            title={group.title}
            action={<Label>{group.stats.length} figures</Label>}
          />
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
            {group.stats.map((stat, i) => (
              <Stat
                key={stat.label}
                icon={stat.icon}
                label={stat.label}
                value={stat.value}
                note={stat.note}
                href={stat.href}
                tone={stat.tone}
                className={cn(i === 0 && 'col-span-2')}
              />
            ))}
          </div>
        </section>
      ))}

      {advance ? (
        <section data-lift="section">
          <SectionHead icon={GitBranch} title="Advance the season" />
          <Card elevation="raised" className="glow max-w-2xl p-5">
            {advance}
          </Card>
        </section>
      ) : null}
    </div>
  );
}
