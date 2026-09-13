import { cn } from '@/lib/utils';
import { formatDate } from '@/lib/format';

export type TimelineItem = {
  label: string;
  date: string | null;
  description?: string;
  state?: 'past' | 'current' | 'future';
};

export function Timeline({ items, className }: { items: TimelineItem[]; className?: string }) {
  return (
    <ol className={cn('flex flex-col', className)}>
      {items.map((item, index) => (
        <li
          key={`${item.label}-${index}`}
          className="relative flex gap-5 border-l border-stone-deep pb-8 pl-6 last:pb-0"
        >
          <span
            className={cn(
              'absolute top-1.5 -left-[4.5px] size-2 rounded-full',
              item.state === 'current'
                ? 'bg-champagne-deep ring-4 ring-champagne/25'
                : item.state === 'past'
                  ? 'bg-olive'
                  : 'bg-stone-deep',
            )}
            aria-hidden="true"
          />
          <div className="flex flex-col gap-1.5">
            <span className="palma-label text-taupe-deep">{formatDate(item.date)}</span>
            <span className="font-display text-lg leading-snug">{item.label}</span>
            {item.description ? (
              <span className="text-sm leading-relaxed text-taupe-deep">{item.description}</span>
            ) : null}
          </div>
        </li>
      ))}
    </ol>
  );
}
