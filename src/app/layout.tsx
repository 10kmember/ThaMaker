import type { Metadata, Viewport } from 'next';
import { Fraunces, Inter } from 'next/font/google';
import { SiteHeader } from '@/components/palma/SiteHeader';
import { SiteFooter } from '@/components/palma/SiteFooter';
import { JsonLd, organisationJsonLd, SITE_DESCRIPTOR, SITE_NAME } from '@/lib/seo';
import { siteUrl } from '@/lib/env';
import './globals.css';

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

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: `${SITE_NAME} — ${SITE_DESCRIPTOR}`,
    template: `%s — ${SITE_NAME}`,
  },
  description:
    'PALMA — The Creator Honours. Recognising the people shaping creator culture, and keeping the permanent record of who they are.',
  applicationName: SITE_NAME,
  keywords: ['PALMA', 'Palma Awards', 'creator awards', 'The Creator Honours', 'creator industry'],
  authors: [{ name: SITE_NAME }],
  creator: SITE_NAME,
  publisher: 'Palma Awards Ltd',
  formatDetection: { telephone: false },
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    locale: 'en_GB',
    url: siteUrl,
  },
};

export const viewport: Viewport = {
  themeColor: '#161719',
  colorScheme: 'light',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB" className={`${display.variable} ${sans.variable}`}>
      <body className="flex min-h-dvh flex-col">
        <a
          href="#main"
          className="palma-label focus:bg-ink focus:text-ivory sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-3"
        >
          Skip to content
        </a>
        <SiteHeader />
        <main id="main" className="flex-1">
          {children}
        </main>
        <SiteFooter />
        <JsonLd data={organisationJsonLd()} />
      </body>
    </html>
  );
}
