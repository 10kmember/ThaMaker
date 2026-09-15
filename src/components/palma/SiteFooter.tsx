import Link from 'next/link';
import { Wordmark } from '@/components/brand/Wordmark';
import { PalmMark } from '@/components/brand/PalmMark';
import { Container } from './layout';
import { FOOTER_NAV, LEGAL_NAV, type FooterBranch } from '@/lib/navigation';

/**
 * A branch: a hairline spine with a short stub out to each destination.
 *
 * Drawn the way the mark is drawn, because it is the same idea. The spine is a
 * left border on the list and every item puts a stub across the gap, so the
 * structure is visible without a single box or divider being added to the page.
 */
function Branch({ branch }: { branch: FooterBranch }) {
  return (
    <div className="flex flex-col gap-3">
      {branch.title ? (
        <h3 className="text-ivory/40 text-[0.6875rem] tracking-[0.14em] uppercase">
          {branch.title}
        </h3>
      ) : null}
      <ul className="border-ivory/15 flex flex-col gap-2.5 border-l pl-4">
        {branch.items.map((item) => (
          <li
            key={item.href}
            className="before:bg-ivory/20 relative before:absolute before:top-[0.6em] before:-left-4 before:h-px before:w-2.5 before:content-['']"
          >
            <Link
              href={item.href}
              className="palma-quiet-link text-ivory/65 hover:text-ivory text-sm"
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function SiteFooter() {
  const year = new Date().getUTCFullYear();

  return (
    <footer className="on-ink border-ink bg-ink text-ivory border-t">
      <Container className="py-14 sm:py-16">
        <div className="flex flex-col gap-12 lg:flex-row lg:justify-between lg:gap-12">
          <div className="flex max-w-72 shrink-0 flex-col gap-5">
            <Wordmark size="md" descriptor />
            <p className="text-ivory/55 text-sm leading-relaxed">
              PALMA is the permanent record of achievement in the creator industry. The ceremony is
              one expression of it.
            </p>
            <PalmMark className="text-ivory/25 h-10" />
          </div>

          {/* Each column is a trunk. A trunk with several branches spreads
              across two, which is what keeps the footer short: the longest
              list stops setting the height of everything beside it. */}
          <div className="grid flex-1 gap-x-8 gap-y-9 sm:grid-cols-2 lg:grid-cols-5">
            {FOOTER_NAV.map((group) => (
              <nav
                key={group.title}
                aria-label={group.title}
                className={`flex flex-col gap-4 ${
                  group.branches.length > 1 ? 'sm:col-span-2 lg:col-span-2' : ''
                }`}
              >
                <h2 className="palma-label text-champagne">{group.title}</h2>
                {group.branches.length > 1 ? (
                  <div className="grid gap-x-8 gap-y-6 sm:grid-cols-2">
                    {group.branches.map((branch) => (
                      <Branch key={branch.title ?? branch.items[0]?.href} branch={branch} />
                    ))}
                  </div>
                ) : (
                  group.branches.map((branch) => (
                    <Branch key={branch.title ?? branch.items[0]?.href} branch={branch} />
                  ))
                )}
              </nav>
            ))}
          </div>
        </div>

        <nav aria-label="Legal register" className="border-ivory/12 mt-12 border-t pt-7">
          <h2 className="palma-label text-champagne">The register</h2>
          <ul className="text-ivory/55 mt-4 flex flex-wrap gap-x-7 gap-y-3 text-xs">
            {LEGAL_NAV.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="palma-quiet-link hover:text-ivory">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="border-ivory/12 text-ivory/45 mt-7 flex flex-col gap-4 border-t pt-7 text-xs sm:flex-row sm:items-center sm:justify-between">
          <p>© {year} PALMA. The Creator Honours. Palma Awards Ltd, United Kingdom.</p>
          <p className="text-ivory/35">
            Nominations are free. Honours cannot be bought. Scores are never published.
          </p>
        </div>
      </Container>
    </footer>
  );
}
