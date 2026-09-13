import Image from 'next/image';
import { cn } from '@/lib/utils';

const FIELDS = [
  'from-stone to-stone-deep',
  'from-olive/85 to-olive',
  'from-ink-muted to-ink',
  'from-taupe to-taupe-deep',
] as const;

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

/** Deterministic field selection, so a creator always gets the same plate. */
function fieldFor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) % 997;
  return FIELDS[hash % FIELDS.length]!;
}

export type EditorialImageProps = {
  src?: string | null;
  alt?: string | null;
  name: string;
  className?: string;
  ratio?: 'portrait' | 'square' | 'landscape';
  sizes?: string;
  priority?: boolean;
};

/**
 * Editorial imagery with an engraved fallback plate.
 *
 * PALMA never renders a stock photograph and never renders explicit imagery.
 * Where no approved portrait exists, the creator gets an institutional plate:
 * their initials set in the display face over a palm engraving.
 */
export function EditorialImage({
  src,
  alt,
  name,
  className,
  ratio = 'portrait',
  sizes = '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw',
  priority = false,
}: EditorialImageProps) {
  const ratios = {
    portrait: 'aspect-[3/4]',
    square: 'aspect-square',
    landscape: 'aspect-[16/10]',
  } as const;

  if (src) {
    return (
      <div className={cn('bg-stone relative overflow-hidden', ratios[ratio], className)}>
        <Image
          src={src}
          alt={alt ?? `${name} — PALMA creator portrait`}
          fill
          sizes={sizes}
          priority={priority}
          className="object-cover transition-transform duration-700 ease-(--ease-ceremonial) group-hover:scale-[1.02]"
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        'relative flex items-center justify-center overflow-hidden bg-gradient-to-br',
        fieldFor(name),
        ratios[ratio],
        className,
      )}
      role="img"
      aria-label={`${name} — no approved portrait on file`}
    >
      <svg
        viewBox="0 0 200 260"
        className="text-ivory/18 absolute inset-0 h-full w-full"
        aria-hidden="true"
        preserveAspectRatio="xMidYMid slice"
      >
        <g stroke="currentColor" strokeWidth="0.8" fill="none" strokeLinecap="round">
          <path d="M100 250V96" />
          <path d="M100 110c-28-5-48-22-58-50 30 2 51 19 58 43" />
          <path d="M100 110c28-5 48-22 58-50-30 2-51 19-58 43" />
          <path d="M100 156c-22-4-38-18-46-40 24 2 41 15 46 34" />
          <path d="M100 156c22-4 38-18 46-40-24 2-41 15-46 34" />
          <path d="M100 200c-17-3-29-14-35-31 18 2 31 12 35 26" />
          <path d="M100 200c17-3 29-14 35-31-18 2-31 12-35 26" />
        </g>
      </svg>
      <span className="font-display text-ivory/85 relative text-4xl tracking-[0.12em]">
        {initials(name)}
      </span>
    </div>
  );
}
