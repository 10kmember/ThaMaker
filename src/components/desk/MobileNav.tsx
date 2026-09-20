'use client';

import { useEffect, useId, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

/* ───────────────────────────────────────────────────────────────────────────
   The mobile menu

   A panel that comes down from under the chrome, opened by a hamburger in the
   outer corner where a thumb actually reaches.

   It replaces the horizontal strip of tabs that used to run across the top of
   the page on a phone. That strip was the worst of both: it ate a band of
   vertical space on the smallest screens, it scrolled sideways so half the
   destinations were off-screen and undiscoverable, and it sat in the page
   rather than in the frame, so it looked like content.

   The nav is passed in already rendered, because its items carry icons and an
   icon is a component, which cannot be serialised into a client component.
   ─────────────────────────────────────────────────────────────────────────── */

export function MobileNav({
  label,
  children,
  className,
}: {
  /** Names the menu for assistive technology, e.g. "Administration". */
  label: string;
  /** The rendered nav rows, built on the server. */
  children: React.ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const panelId = useId();

  // Following a link inside the panel navigates but does not unmount the
  // shell, so the panel has to be told to close itself.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Escape closes it, as it would any other transient surface.
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={open ? 'Close menu' : 'Open menu'}
        data-open={open || undefined}
        className={cn(
          'relative size-9 shrink-0 rounded-full lg:hidden',
          // Forty-four pixels for a thumb; nine for a cursor.
          'pointer-coarse:size-11',
          'border border-[color:var(--line)] bg-[color:var(--surface-1)]',
          'transition-[background-color,transform] duration-400 [transition-timing-function:var(--spring)]',
          'active:scale-95',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--accent)]',
          className,
        )}
      >
        <span className="burger-line bg-[color:var(--text)]" />
        <span className="burger-line bg-[color:var(--text)]" />
        <span className="burger-line bg-[color:var(--text)]" />
      </button>

      {/* Full-bleed so the panel spans the chrome rather than the corner it
          was opened from. */}
      <div
        id={panelId}
        data-open={open || undefined}
        className="sheet absolute inset-x-0 top-full lg:hidden"
      >
        <div>
          <nav
            aria-label={`${label} sections`}
            className="border-t border-[color:var(--line)] bg-[color:var(--surface-1)] px-3 py-3 shadow-[var(--lift-3)]"
          >
            {children}
          </nav>
        </div>
      </div>
    </>
  );
}

/** A row inside the mobile menu. */
export function MobileNavItem({
  href,
  active,
  index,
  children,
}: {
  href: string;
  active?: boolean;
  index: number;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      data-active={active || undefined}
      style={{ ['--i']: index } as React.CSSProperties}
      className={cn(
        'sheet-item rail-item',
        'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[color:var(--accent)]',
      )}
    >
      {children}
    </Link>
  );
}

/** A group heading inside the mobile menu. */
export function MobileNavGroup({
  title,
  index,
  children,
}: {
  title: string;
  index: number;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-0.5 pb-1">
      <h2
        className="sheet-item label px-3 pt-2 pb-1 text-[10px]"
        style={{ ['--i']: index } as React.CSSProperties}
      >
        {title}
      </h2>
      {children}
    </div>
  );
}
