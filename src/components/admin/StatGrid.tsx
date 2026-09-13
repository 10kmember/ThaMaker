import Link from 'next/link';
import { cn } from '@/lib/utils';

export type StatEntry = {
  label: string;
  value: number | string;
  /** A quiet second line: a comparison, a qualifier, a warning. */
  note?: string;
  href?: string;
  tone?: 'default' | 'attention';
};

/**
 * The figure block.
 *
 * A number and its name, nothing else. No sparkline behind every stat, no
 * percentage badge invented from a comparison nobody asked for — the charts
 * are a page away and they are honest about their axis.
 */
export function StatGrid({ title, stats }: { title: string; stats: StatEntry[] }) {
  return (
    <section>
      <h3 className="palma-label text-taupe-deep border-stone-deep border-b pb-3">{title}</h3>

      <dl className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
        {stats.map((stat) => {
          const body = (
            <>
              <dt className="palma-label text-taupe-deep">{stat.label}</dt>
              <dd
                className={cn(
                  'font-display mt-2 text-4xl tabular-nums',
                  stat.tone === 'attention' && Number(stat.value) > 0 && 'text-olive',
                )}
              >
                {typeof stat.value === 'number'
                  ? new Intl.NumberFormat('en-GB').format(stat.value)
                  : stat.value}
              </dd>
              {stat.note ? (
                <dd className="text-taupe mt-1.5 text-xs leading-relaxed">{stat.note}</dd>
              ) : null}
            </>
          );

          return stat.href ? (
            <Link
              key={stat.label}
              href={stat.href}
              className="palma-row border-stone-deep/60 -mb-px flex min-w-0 flex-col border-r border-b py-5 pr-4 last:border-r-0"
            >
              {body}
            </Link>
          ) : (
            <div
              key={stat.label}
              className="border-stone-deep/60 -mb-px flex min-w-0 flex-col border-r border-b py-5 pr-4 last:border-r-0"
            >
              {body}
            </div>
          );
        })}
      </dl>
    </section>
  );
}
