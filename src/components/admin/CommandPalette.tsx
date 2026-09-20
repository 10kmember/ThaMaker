'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { searchAdmin } from '@/server/actions/search';
import type { SearchHit } from '@/server/data/people';
/**
 * The palette's own view of the nav.
 *
 * Deliberately not `AdminGroup`: that carries a Lucide `icon`, and a
 * component is a function, which cannot be serialised across the
 * server/client boundary. The palette only ever needs the words and the
 * destination, so it takes only those.
 */
export type PaletteGroup = { title: string; items: { href: string; label: string }[] };
import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * The command palette.
 *
 * ⌘K from anywhere in the back office. It searches the institution — creators,
 * accounts, claims, cases, honours, the audit log — and falls back to the
 * sidebar's own destinations when nothing matches, so the palette is never a
 * dead end.
 *
 * Every result is a real row: the palette is possible at all because there is
 * one record per thing, so one query reaches all of it.
 */

type Entry = { kind: string; title: string; detail: string; href: string };

export function CommandPalette({ groups }: { groups: PaletteGroup[] }) {
  const router = useRouter();
  const reduced = useReducedMotion();

  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const [hits, setHits] = React.useState<SearchHit[]>([]);
  const [active, setActive] = React.useState(0);
  const [pending, startTransition] = React.useTransition();

  const inputRef = React.useRef<HTMLInputElement>(null);
  const listRef = React.useRef<HTMLUListElement>(null);

  // The sidebar's destinations, always available as a fallback.
  const destinations = React.useMemo<Entry[]>(
    () =>
      groups.flatMap((group) =>
        group.items.map((item) => ({
          kind: 'Go to',
          title: item.label,
          detail: group.title,
          href: item.href,
        })),
      ),
    [groups],
  );

  const matchingDestinations = React.useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return destinations;
    return destinations.filter(
      (entry) =>
        entry.title.toLowerCase().includes(term) || entry.detail.toLowerCase().includes(term),
    );
  }, [destinations, query]);

  const entries: Entry[] = React.useMemo(
    () => [...matchingDestinations, ...hits],
    [matchingDestinations, hits],
  );

  React.useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen((current) => !current);
      }
      if (event.key === 'Escape') setOpen(false);
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  React.useEffect(() => {
    if (open) {
      setActive(0);
      // The dialog mounts before the input exists on the first frame.
      const id = window.setTimeout(() => inputRef.current?.focus(), 20);
      return () => window.clearTimeout(id);
    }
    setQuery('');
    setHits([]);
    return undefined;
  }, [open]);

  React.useEffect(() => {
    const term = query.trim();
    if (term.length < 2) {
      setHits([]);
      return undefined;
    }

    // Debounced, because every keystroke is a database query and a person
    // types faster than PostgreSQL should be asked to answer.
    const id = window.setTimeout(() => {
      startTransition(async () => {
        const result = await searchAdmin(term);
        setHits(result.hits);
        setActive(0);
      });
    }, 180);

    return () => window.clearTimeout(id);
  }, [query]);

  const go = React.useCallback(
    (href: string) => {
      setOpen(false);
      router.push(href);
    },
    [router],
  );

  function onInputKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActive((current) => Math.min(entries.length - 1, current + 1));
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((current) => Math.max(0, current - 1));
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      const entry = entries[active];
      if (entry) go(entry.href);
    }
  }

  React.useEffect(() => {
    listRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  const motionProps = reduced
    ? {}
    : {
        initial: { opacity: 0, y: -8, scale: 0.99 },
        animate: { opacity: 1, y: 0, scale: 1 },
        exit: { opacity: 0, y: -6, scale: 0.99 },
        transition: { duration: 0.22, ease: [0.16, 1, 0.3, 1] as const },
      };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          'hidden items-center gap-3 rounded-full border border-[color:var(--line)] px-3.5 py-2 text-xs sm:flex',
          'pointer-coarse:min-h-11',
          'bg-[color:var(--surface-1)] text-[color:var(--text-soft)] shadow-[var(--lift-1)]',
          'transition-[transform,box-shadow] duration-400 [transition-timing-function:var(--spring)]',
          'hover:-translate-y-0.5 hover:shadow-[var(--lift-2)]',
        )}
      >
        <Search className="size-3.5" strokeWidth={2} />
        <span>Search PALMA</span>
        <kbd className="rounded-md px-1.5 py-0.5 font-sans text-[0.625rem] ring-1 ring-[color:var(--line)] ring-inset">
          ⌘K
        </kbd>
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[12vh]"
            initial={reduced ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <button
              type="button"
              aria-label="Close search"
              onClick={() => setOpen(false)}
              className="overlay-veil absolute inset-0"
            />

            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label="Search PALMA"
              className="desk-tokens popover popover-enter relative w-full max-w-2xl overflow-hidden"
              {...motionProps}
            >
              <div className="flex items-center gap-3 border-b border-[color:var(--line)] px-5">
                <Search
                  aria-hidden="true"
                  className="size-4 shrink-0 text-[color:var(--text-quiet)]"
                  strokeWidth={2}
                />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  onKeyDown={onInputKeyDown}
                  placeholder="A name, an email, a reference, a verification code…"
                  aria-label="Search PALMA"
                  className="h-14 min-w-0 flex-1 bg-transparent text-[0.9375rem] text-[color:var(--text)] placeholder:text-[color:var(--text-quiet)] focus:outline-none"
                />
                {pending ? <span className="label motion-safe:animate-pulse">…</span> : null}
              </div>

              <ul ref={listRef} className="max-h-[52vh] overflow-y-auto py-2">
                {entries.length === 0 ? (
                  <li className="px-5 py-8 text-center text-sm text-[color:var(--text-quiet)]">
                    {query.trim().length < 2
                      ? 'Type at least two characters.'
                      : `Nothing matches “${query.trim()}”.`}
                  </li>
                ) : (
                  entries.map((entry, index) => (
                    <li key={`${entry.href}-${entry.title}-${index}`}>
                      <button
                        type="button"
                        data-active={index === active}
                        onMouseEnter={() => setActive(index)}
                        onClick={() => go(entry.href)}
                        className={cn(
                          'flex w-full items-baseline gap-4 px-5 py-2.5 text-left transition-colors',
                          index === active
                            ? 'bg-[color:var(--surface-1)]'
                            : 'hover:bg-[color:var(--surface-1)]/60',
                        )}
                      >
                        <span className="label w-24 shrink-0 truncate text-[10px]">
                          {entry.kind}
                        </span>
                        <span className="font-display min-w-0 flex-1 truncate text-[0.9375rem] text-[color:var(--text)]">
                          {entry.title}
                        </span>
                        <span className="hidden max-w-[45%] min-w-0 truncate text-xs text-[color:var(--text-quiet)] sm:block">
                          {entry.detail}
                        </span>
                      </button>
                    </li>
                  ))
                )}
              </ul>

              <div className="flex flex-wrap items-center gap-x-5 gap-y-1 border-t border-[color:var(--line)] px-5 py-2.5 text-[0.6875rem] text-[color:var(--text-quiet)]">
                <span>↑↓ to move</span>
                <span>↵ to open</span>
                <span>esc to close</span>
                <span className="ml-auto">One record, one history</span>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
