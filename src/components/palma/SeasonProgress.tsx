import { cn } from '@/lib/utils';
import { ordinal } from '@/lib/utils';
import { PUBLIC_PHASES, phaseState, type SeasonStage } from '@/domain/season';
import { formatShortDate } from '@/lib/format';

export function SeasonProgress({
  stage,
  dates,
  tone = 'dark',
  className,
}: {
  stage: SeasonStage;
  dates?: (string | null)[];
  tone?: 'dark' | 'light';
  className?: string;
}) {
  const dark = tone === 'dark';

  return (
    <ol className={cn('grid gap-px sm:grid-cols-2 lg:grid-cols-4', className)}>
      {PUBLIC_PHASES.map((phase, index) => {
        const state = phaseState(stage, index);
        return (
          <li
            key={phase.key}
            aria-current={state === 'current' ? 'step' : undefined}
            className={cn(
              'relative flex flex-col gap-3 border-t-2 pt-5',
              state === 'current'
                ? dark
                  ? 'border-champagne'
                  : 'border-ink'
                : state === 'complete'
                  ? dark
                    ? 'border-ivory/45'
                    : 'border-taupe'
                  : dark
                    ? 'border-ivory/15'
                    : 'border-stone-deep',
            )}
          >
            <span
              className={cn(
                'palma-label',
                state === 'upcoming'
                  ? dark
                    ? 'text-ivory/35'
                    : 'text-taupe'
                  : dark
                    ? 'text-champagne'
                    : 'text-olive',
              )}
            >
              {ordinal(index)}
            </span>
            <span
              className={cn(
                'font-display text-2xl leading-none',
                state === 'upcoming' && (dark ? 'text-ivory/45' : 'text-taupe-deep'),
              )}
            >
              {phase.label}
            </span>
            <span className={cn('text-xs', dark ? 'text-ivory/45' : 'text-taupe-deep')}>
              {state === 'current' ? 'In progress' : null}
              {state === 'complete' ? 'Complete' : null}
              {state === 'upcoming' && dates?.[index] ? formatShortDate(dates[index]) : null}
              {state === 'upcoming' && !dates?.[index] ? 'To come' : null}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
