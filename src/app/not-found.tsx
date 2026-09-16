import Link from 'next/link';
import { Container } from '@/components/palma/layout';
import { Button } from '@/components/ui/button';
import { PalmMark } from '@/components/brand/PalmMark';

/**
 * Not in the record.
 *
 * A 404 on this site is not an error page, it is the institution saying it
 * has looked and found nothing — which is a thing PALMA does elsewhere on
 * purpose, when a category is contested and no honour is conferred. So it is
 * written in the same voice rather than apologising, and it is built like the
 * laureate band: a full band of ink that interrupts the ivory, framed in
 * champagne, with the mark carried at scale.
 *
 * The mark engraves itself on arrival, stroke by stroke, crown last. That is
 * the only motion on the page and it is the whole idea: PALMA cuts a record,
 * and here it is cutting one that turns out to be empty.
 *
 * Every route out is one a lost reader actually wants: a code to check, the
 * archive, the categories, the way home. No "go back" button, which the
 * browser already has and does better.
 */
export default function NotFound() {
  return (
    <section className="on-ink bg-ink text-ivory relative isolate overflow-hidden">
      <div
        aria-hidden="true"
        className="border-champagne/25 pointer-events-none absolute inset-3 border sm:inset-5"
      />
      <div
        aria-hidden="true"
        className="border-champagne/10 pointer-events-none absolute inset-4.5 border sm:inset-7"
      />

      <Container className="relative flex min-h-[70vh] flex-col justify-center py-20 sm:py-28">
        <div className="grid items-center gap-14 lg:grid-cols-12 lg:gap-16">
          <div className="flex flex-col gap-8 lg:col-span-7">
            <div className="flex flex-col gap-3">
              <span className="palma-label text-champagne text-[0.8125rem] tracking-[0.3em]">
                404
              </span>
              <h1 className="font-display text-[clamp(2.5rem,9vw,5.5rem)] leading-[0.92] tracking-tight">
                Not in the record
              </h1>
            </div>

            <div className="border-champagne/25 flex flex-col gap-6 border-t pt-8">
              <p className="font-display text-ivory/80 max-w-140 text-lg leading-relaxed text-balance">
                This page does not exist, or the honour it named was never conferred. PALMA keeps
                both kinds of silence, and does not invent a page to cover either.
              </p>

              <div className="flex flex-wrap gap-3">
                <Button asChild size="md" variant="ivory">
                  <Link href="/verify">Check a code</Link>
                </Button>
                {/* `quiet`, not `outline`: outline draws an ink border, which on
                    an ink ground is an invisible button. */}
                <Button asChild size="md" variant="quiet">
                  <Link href="/paroh" className="palma-label-brand">
                    Enter the PaROH
                  </Link>
                </Button>
              </div>

              <nav aria-label="Elsewhere" className="flex flex-wrap gap-x-7 gap-y-3 pt-2">
                {[
                  { href: '/', label: 'Home' },
                  { href: '/the-palma', label: 'THE PALMA' },
                  { href: '/categories', label: 'Categories' },
                  { href: '/winners', label: 'Winners' },
                ].map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="palma-quiet-link text-ivory/55 hover:text-ivory text-sm"
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
            </div>
          </div>

          {/* Struck rather than shown. The one piece of motion on the page. */}
          <div className="lg:col-span-5">
            <PalmMark
              draw
              className="text-champagne/70 mx-auto h-56 w-auto sm:h-72 lg:mr-0 lg:ml-auto lg:h-96"
            />
          </div>
        </div>
      </Container>
    </section>
  );
}
