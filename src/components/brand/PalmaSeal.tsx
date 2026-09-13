import { cn } from '@/lib/utils';

type PalmaSealProps = {
  className?: string;
  /** Rendered around the seal's upper arc, e.g. "PALMA 2027". */
  legend?: string;
  /** Rendered around the lower arc. */
  sublegend?: string;
  /** Set at the centre beneath the mark, e.g. "WINNER". */
  centre?: string;
  animated?: boolean;
};

/**
 * The institutional seal. Used on winner pages, certificates, badges,
 * verification and share cards — the one place the ceremonial register is
 * allowed to be explicit.
 */
export function PalmaSeal({
  className,
  legend = 'PALMA',
  sublegend = 'THE CREATOR HONOURS',
  centre,
  animated = false,
}: PalmaSealProps) {
  return (
    <svg
      viewBox="0 0 220 220"
      className={cn('h-40 w-40', animated && 'motion-safe:animate-(--animate-seal)', className)}
      role="img"
      aria-label={[legend, sublegend, centre].filter(Boolean).join(' — ')}
    >
      <defs>
        <path id="palma-seal-upper" d="M110 110 m-84 0 a84 84 0 0 1 168 0" fill="none" />
        <path id="palma-seal-lower" d="M110 110 m84 0 a84 84 0 0 1 -168 0" fill="none" />
      </defs>

      <circle cx="110" cy="110" r="105" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.55" />
      <circle cx="110" cy="110" r="97" fill="none" stroke="currentColor" strokeWidth="0.6" opacity="0.35" />
      <circle cx="110" cy="110" r="70" fill="none" stroke="currentColor" strokeWidth="0.6" opacity="0.25" />

      <text
        fill="currentColor"
        fontSize="12"
        letterSpacing="6"
        style={{ fontFamily: 'var(--font-display)' }}
      >
        <textPath href="#palma-seal-upper" startOffset="50%" textAnchor="middle">
          {legend}
        </textPath>
      </text>

      <text fill="currentColor" fontSize="8.5" letterSpacing="4.4" opacity="0.8">
        <textPath href="#palma-seal-lower" startOffset="50%" textAnchor="middle">
          {sublegend}
        </textPath>
      </text>

      {/* Palm geometry, engraved */}
      <g
        transform="translate(110 96) scale(0.92)"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        fill="none"
      >
        <path d="M0 32V-2" />
        <path d="M0 0c-5.6-1-9.6-4.5-11.6-9.8C-5.8-9.4-1.9-6.3 0-2.1" />
        <path d="M0 0c5.6-1 9.6-4.5 11.6-9.8C5.8-9.4 1.9-6.3 0-2.1" />
        <path d="M0 12c-4.7-.9-8.1-3.8-9.8-8.3C-4.9 4.3-1.6 7-0 10.6" />
        <path d="M0 12c4.7-.9 8.1-3.8 9.8-8.3C4.9 4.3 1.6 7 0 10.6" />
        <path d="M0-2.1V-12" />
        <circle cx="0" cy="-14.4" r="1.9" />
      </g>

      {centre ? (
        <text
          x="110"
          y="152"
          textAnchor="middle"
          fill="currentColor"
          fontSize="10"
          letterSpacing="3.4"
          style={{ fontFamily: 'var(--font-sans)', textTransform: 'uppercase' }}
        >
          {centre}
        </text>
      ) : null}
    </svg>
  );
}
