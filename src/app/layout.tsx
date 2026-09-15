import type { Metadata, Viewport } from 'next';
import { Amatic_SC, Fraunces, Inter } from 'next/font/google';
import { headers } from 'next/headers';
import { SiteHeader } from '@/components/palma/SiteHeader';
import { SiteFooter } from '@/components/palma/SiteFooter';
import { PageCounter } from '@/components/palma/PageCounter';
import { Threshold } from '@/components/brand/Threshold';
import { MotionProvider } from '@/components/motion/MotionProvider';
import { THEME_BOOTSTRAP } from '@/lib/theme';
import { JsonLd, organisationJsonLd, SITE_DESCRIPTOR, SITE_NAME } from '@/lib/seo';
import { siteUrl } from '@/lib/env';
import './globals.css';
import { ENTITY } from '@/lib/legal';

const display = Fraunces({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-palma-display',
  axes: ['SOFT', 'WONK', 'opsz'],
});

const sans = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-palma-sans',
});

/**
 * The annotation face.
 *
 * Used two or three times on the whole site — a hand in the margin of an
 * institutional page. Used more than that it becomes a gimmick, so it is
 * deliberately not available as a general utility: see `.palma-annotation`.
 */
const annotation = Amatic_SC({
  subsets: ['latin'],
  weight: ['700'],
  display: 'swap',
  variable: '--font-palma-annotation',
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: `${SITE_NAME} — ${SITE_DESCRIPTOR}`,
    template: `%s — ${SITE_NAME}`,
  },
  description:
    'PALMA, The Creator Honours. Recognising the people shaping creator culture, and keeping the permanent record of who they are.',
  applicationName: SITE_NAME,
  keywords: ['PALMA', 'Palma Awards', 'creator awards', 'The Creator Honours', 'creator industry'],
  authors: [{ name: SITE_NAME }],
  creator: SITE_NAME,
  publisher: `${ENTITY.name}, a ${ENTITY.parent.name} company`,
  formatDetection: { telephone: false },
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    locale: 'en_GB',
    url: siteUrl,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f4f0e8' },
    { media: '(prefers-color-scheme: dark)', color: '#14151a' },
  ],
  colorScheme: 'light dark',
  /**
   * The page runs to the physical edge of the screen.
   *
   * Without this a notched phone letterboxes the document below the status
   * bar, which puts a strip of nothing above a header that is supposed to be
   * the top of the page. With it, the header runs under the status bar and
   * pads itself back out with `env(safe-area-inset-top)`, so the ivory reaches
   * the edge and the header is genuinely at the top.
   */
  viewportFit: 'cover',
};

/**
 * Surfaces that carry their own furniture.
 *
 * An operator's dashboard has no business wearing the public site's marketing
 * navigation: "Nominate a creator" above a judging room is noise, and the
 * footer's full sitemap under an audit log is worse. These surfaces bring
 * their own shell, so the root layout stands back.
 */
const SELF_CONTAINED = ['/admin', '/portal', '/judge', '/creator'];

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = (await headers()).get('x-palma-pathname') ?? '/';
  const chrome = !SELF_CONTAINED.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  return (
    <html lang="en-GB" className={`${display.variable} ${sans.variable} ${annotation.variable}`}>
      <head>
        {/* Applies the reader's theme before first paint. Without it, every
            reader who chose Ink gets a white flash on every navigation. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP }} />
      </head>
      <body className="flex min-h-dvh flex-col">
        <a
          href="#main"
          className="palma-label focus:bg-ink focus:text-ivory sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-3"
        >
          Skip to content
        </a>
        {/* Parts on arrival. Pure CSS, in the markup, gone in 820ms. */}
        {chrome ? <Threshold /> : null}
        <MotionProvider>
          {chrome ? <SiteHeader /> : null}
          <main id="main" className="flex-1">
            {children}
          </main>
          {chrome ? <SiteFooter /> : null}
        </MotionProvider>
        {/* Counts the page. Sets nothing, stores nothing, sends nothing about
            the reader — see src/domain/measurement.ts. */}
        {chrome ? <PageCounter /> : null}
        <JsonLd data={organisationJsonLd()} />
      </body>
    </html>
  );
}
