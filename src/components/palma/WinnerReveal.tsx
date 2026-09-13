import Link from 'next/link';
import { PalmaSeal } from '@/components/brand/PalmaSeal';
import { EditorialImage } from './EditorialImage';
import { CopyLink } from './CopyLink';
import { Button } from '@/components/ui/button';
import { Container } from './layout';
import { absoluteUrl } from '@/lib/seo';
import { countryName } from '@/lib/format';
import type { CategoryOutcome, SeasonView } from '@/server/data/types';

/**
 * The winner reveal.
 *
 * A PALMA is not announced with a toast. The sequence is deliberate — season,
 * category, pause, name, seal — and it degrades to a still, complete
 * composition under `prefers-reduced-motion`.
 */
export function WinnerReveal({
  outcome,
  season,
}: {
  outcome: CategoryOutcome;
  season: SeasonView;
}) {
  const winner = outcome.winner;
  if (!winner) return null;

  const verifyUrl = winner.code ? absoluteUrl(`/verify/${winner.code}`) : null;

  return (
    <section className="on-ink bg-ink text-ivory relative overflow-hidden">
      <Container className="relative py-24 sm:py-32">
        <div className="grid gap-16 lg:grid-cols-12 lg:items-center">
          <div className="flex flex-col gap-8 lg:col-span-7">
            <div
              className="flex flex-col gap-3 motion-safe:animate-(--animate-rise)"
              style={{ animationDelay: '120ms' }}
            >
              <span className="palma-label text-champagne">{season.title}</span>
              <span className="font-display text-ivory/70 text-2xl leading-tight sm:text-3xl">
                {outcome.category.name}
              </span>
            </div>

            <div
              className="flex flex-col gap-4 motion-safe:animate-(--animate-reveal)"
              style={{ animationDelay: '620ms' }}
            >
              <h2 className="text-5xl leading-[0.95] sm:text-7xl lg:text-8xl">
                {winner.creator.displayName}
              </h2>
              <span className="palma-label text-champagne">Winner</span>
            </div>

            <div
              className="border-ivory/15 flex flex-col gap-6 border-t pt-8 motion-safe:animate-(--animate-rise)"
              style={{ animationDelay: '980ms' }}
            >
              {winner.citation ? (
                <p className="font-display text-ivory/75 max-w-130 text-xl leading-snug">
                  “{winner.citation}”
                </p>
              ) : null}

              <dl className="flex flex-wrap gap-x-12 gap-y-4">
                <div className="flex flex-col gap-1.5">
                  <dt className="palma-label text-ivory/45">Country</dt>
                  <dd className="text-sm">{countryName(winner.creator.countryCode)}</dd>
                </div>
                {winner.code ? (
                  <div className="flex flex-col gap-1.5">
                    <dt className="palma-label text-ivory/45">Verification</dt>
                    <dd className="font-mono text-sm tracking-wider">{winner.code}</dd>
                  </div>
                ) : null}
              </dl>

              <div className="flex flex-wrap items-center gap-3">
                <Button asChild variant="ivory" size="sm">
                  <Link href={`/creators/${winner.creator.slug}`}>View the record</Link>
                </Button>
                {verifyUrl ? (
                  <>
                    <Button asChild variant="quiet" size="sm">
                      <Link href={`/verify/${winner.code}`}>Verify this honour</Link>
                    </Button>
                    <CopyLink value={verifyUrl} variant="quiet" />
                  </>
                ) : null}
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center gap-10 lg:col-span-5">
            <div
              className="w-full max-w-80 motion-safe:animate-(--animate-reveal)"
              style={{ animationDelay: '760ms' }}
            >
              <EditorialImage
                name={winner.creator.displayName}
                src={winner.creator.portraitUrl}
                alt={winner.creator.portraitAlt}
                sizes="(max-width: 1024px) 80vw, 20rem"
              />
            </div>
            <PalmaSeal
              animated
              legend={`PALMA ${season.year}`}
              sublegend="THE CREATOR HONOURS"
              centre="Winner"
              className="text-champagne/85 h-36 w-36"
            />
          </div>
        </div>
      </Container>
    </section>
  );
}
