import Link from 'next/link';
import { Wordmark } from '@/components/brand/Wordmark';
import { PalmMark } from '@/components/brand/PalmMark';
import { Container } from './layout';
import { FOOTER_NAV, LEGAL_NAV } from '@/lib/navigation';

export function SiteFooter() {
  const year = new Date().getUTCFullYear();

  return (
    <footer className="on-ink border-ink bg-ink text-ivory border-t">
      <Container className="py-16 sm:py-20">
        <div className="flex flex-col gap-14 lg:flex-row lg:justify-between">
          <div className="flex max-w-90 flex-col gap-6">
            <Wordmark size="md" descriptor />
            <p className="text-ivory/55 text-sm leading-relaxed">
              PALMA is the permanent record of achievement in the creator industry. The ceremony is
              one expression of it.
            </p>
            <PalmMark className="text-ivory/25 h-10" />
          </div>

          <div className="grid flex-1 gap-10 sm:grid-cols-2 lg:max-w-160 lg:grid-cols-4">
            {FOOTER_NAV.map((group) => (
              <nav key={group.title} aria-label={group.title} className="flex flex-col gap-4">
                <h2 className="palma-label text-champagne">{group.title}</h2>
                <ul className="flex flex-col gap-3">
                  {group.items.map((item) => (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className="palma-quiet-link text-ivory/65 hover:text-ivory text-sm"
                      >
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>
        </div>

        <nav aria-label="Legal register" className="border-ivory/12 mt-16 border-t pt-8">
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

        <div className="border-ivory/12 text-ivory/45 mt-8 flex flex-col gap-4 border-t pt-8 text-xs sm:flex-row sm:items-center sm:justify-between">
          <p>© {year} PALMA. The Creator Honours. Palma Awards Ltd, United Kingdom.</p>
          <p className="text-ivory/35">
            Nominations are free. Honours cannot be bought. Scores are never published.
          </p>
        </div>
      </Container>
    </footer>
  );
}
