import Link from 'next/link';
import { Wordmark } from '@/components/brand/Wordmark';
import { PalmMark } from '@/components/brand/PalmMark';
import { Container } from './layout';
import { FOOTER_NAV } from '@/lib/navigation';

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

        <div className="border-ivory/12 text-ivory/45 mt-16 flex flex-col gap-4 border-t pt-8 text-xs sm:flex-row sm:items-center sm:justify-between">
          <p>© {year} PALMA. The Creator Honours. Palma Awards Ltd, United Kingdom.</p>
          <ul className="flex flex-wrap gap-6">
            <li>
              <Link href="/about/policy" className="palma-quiet-link hover:text-ivory">
                Content policy
              </Link>
            </li>
            <li>
              <Link href="/legal/privacy" className="palma-quiet-link hover:text-ivory">
                Privacy
              </Link>
            </li>
            <li>
              <Link href="/legal/terms" className="palma-quiet-link hover:text-ivory">
                Terms
              </Link>
            </li>
          </ul>
        </div>
      </Container>
    </footer>
  );
}
