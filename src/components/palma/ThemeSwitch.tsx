'use client';

import * as React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Check, Palette } from 'lucide-react';
import { DEFAULT_THEME, isThemeKey, THEME_STORAGE_KEY, THEMES, type ThemeKey } from '@/lib/theme';
import { DURATION, EASE } from '@/lib/motion';
import { cn } from '@/lib/utils';

/**
 * The theme switch.
 *
 * Three themes, named rather than toggled — Paper, Ink, Archive — because a
 * two-state sun/moon toggle would not describe what these actually are. A
 * reader's choice is remembered; a reader who has expressed no choice gets
 * whatever their system asked for.
 */
export function ThemeSwitch({
  className,
  tone = 'light',
}: {
  className?: string;
  tone?: 'light' | 'dark';
}) {
  const [theme, setTheme] = React.useState<ThemeKey>(DEFAULT_THEME);
  const [open, setOpen] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);
  const root = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    setMounted(true);
    const current = document.documentElement.dataset.theme;
    if (isThemeKey(current)) setTheme(current);
  }, []);

  React.useEffect(() => {
    if (!open) return;
    const onAway = (event: MouseEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onAway);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onAway);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  function choose(next: ThemeKey) {
    setTheme(next);
    setOpen(false);
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Private browsing. The choice holds for this page, and that is enough.
    }
  }

  const active = THEMES.find((entry) => entry.key === theme) ?? THEMES[0];

  return (
    <div ref={root} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="menu"
        className={cn(
          'palma-label flex items-center gap-2 px-2 py-2 transition-colors',
          tone === 'dark' ? 'text-ivory/55 hover:text-ivory' : 'text-taupe-deep hover:text-ink',
        )}
      >
        <Palette className="size-4" aria-hidden="true" />
        <span className="sr-only sm:not-sr-only">{mounted ? active.label : 'Theme'}</span>
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            role="menu"
            aria-label="Theme"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4, transition: { duration: DURATION.quick, ease: EASE.exit } }}
            transition={{ duration: DURATION.base, ease: EASE.ceremonial }}
            className="border-stone-deep bg-ivory-bright absolute right-0 z-50 mt-2 w-64 border p-1.5 shadow-[0_28px_70px_-45px_rgba(0,0,0,0.7)]"
          >
            {THEMES.map((entry) => (
              <button
                key={entry.key}
                type="button"
                role="menuitemradio"
                aria-checked={theme === entry.key}
                onClick={() => choose(entry.key)}
                className={cn(
                  'flex w-full items-start gap-3 px-3 py-2.5 text-left transition-colors',
                  theme === entry.key ? 'bg-stone/45' : 'hover:bg-stone/25',
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    'mt-1 size-3.5 shrink-0 rounded-full border',
                    entry.key === 'paper' && 'border-stone-deep bg-[#f4f0e8]',
                    entry.key === 'ink' && 'border-stone-deep bg-[#14151a]',
                    entry.key === 'archive' && 'border-stone-deep bg-[#efe7d7]',
                  )}
                />
                <span className="flex flex-col gap-0.5">
                  <span className="palma-label text-ink flex items-center gap-2">
                    {entry.label}
                    {theme === entry.key ? (
                      <Check className="text-olive size-3.5" aria-hidden="true" />
                    ) : null}
                  </span>
                  <span className="text-taupe-deep text-xs leading-relaxed">
                    {entry.description}
                  </span>
                </span>
              </button>
            ))}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
