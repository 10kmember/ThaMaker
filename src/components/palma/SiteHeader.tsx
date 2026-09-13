'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import { Wordmark } from '@/components/brand/Wordmark';
import { Button } from '@/components/ui/button';
import { Container } from './layout';
import { PUBLIC_NAV } from '@/lib/navigation';
import { cn } from '@/lib/utils';

export function SiteHeader({ accountHref = '/portal' }: { accountHref?: string }) {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);
  const [condensed, setCondensed] = React.useState(false);

  React.useEffect(() => setOpen(false), [pathname]);

  React.useEffect(() => {
    const onScroll = () => setCondensed(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  React.useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header
      className={cn(
        'sticky top-0 z-40 border-b transition-colors duration-300',
        condensed || open
          ? 'border-stone-deep bg-ivory/92 backdrop-blur-md'
          : 'bg-ivory border-transparent',
      )}
    >
      <Container className="flex h-18 items-center justify-between gap-8">
        <Wordmark size="sm" />

        <nav aria-label="Primary" className="hidden lg:block">
          <ul className="flex items-center gap-7">
            {PUBLIC_NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={isActive(item.href) ? 'page' : undefined}
                  className={cn(
                    'py-2 transition-colors',
                    item.preserveCase ? 'palma-label-brand' : 'palma-label',
                    isActive(item.href) ? 'text-ink' : 'text-taupe-deep hover:text-ink',
                  )}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-2">
          <Button asChild size="sm" className="hidden sm:inline-flex">
            <Link href="/nominate">Nominate</Link>
          </Button>
          <Button asChild size="sm" variant="ghost" className="hidden lg:inline-flex">
            <Link href={accountHref}>Account</Link>
          </Button>
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-controls="palma-mobile-nav"
            className="text-ink -mr-2 p-2 lg:hidden"
          >
            <span className="sr-only">{open ? 'Close menu' : 'Open menu'}</span>
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </Container>

      <div
        id="palma-mobile-nav"
        hidden={!open}
        className="border-stone-deep bg-ivory border-t lg:hidden"
      >
        <Container className="py-8">
          <nav aria-label="Primary, mobile">
            <ul className="flex flex-col">
              {PUBLIC_NAV.map((item) => (
                <li key={item.href} className="border-stone-deep/60 border-b last:border-none">
                  <Link
                    href={item.href}
                    aria-current={isActive(item.href) ? 'page' : undefined}
                    className={cn(
                      'font-display flex items-center justify-between py-4 text-2xl',
                      isActive(item.href) ? 'text-ink' : 'text-taupe-deep',
                    )}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <div className="mt-8 flex flex-col gap-3">
            <Button asChild size="md">
              <Link href="/nominate">Nominate a creator</Link>
            </Button>
            <Button asChild size="md" variant="outline">
              <Link href={accountHref}>Account</Link>
            </Button>
          </div>
        </Container>
      </div>
    </header>
  );
}
