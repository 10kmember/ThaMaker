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
      className={cn(
        'palma-seal-live h-40 w-40',
        animated && 'motion-safe:animate-(--animate-seal)',
        className,
      )}
      role="img"
      aria-label={[legend, sublegend, centre].filter(Boolean).join(' — ')}
    >
      <defs>
        <path id="palma-seal-upper" d="M110 110 m-84 0 a84 84 0 0 1 168 0" fill="none" />
        {/* The lower arc sweeps left to right beneath the centre, so the
            sublegend reads upright rather than inverted. */}
        <path id="palma-seal-lower" d="M26 110 A84 84 0 0 0 194 110" fill="none" />
      </defs>

      <circle
        cx="110"
        cy="110"
        r="105"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
        opacity="0.55"
      />
      <circle
        cx="110"
        cy="110"
        r="97"
        fill="none"
        stroke="currentColor"
        strokeWidth="0.6"
        opacity="0.35"
      />
      <circle
        cx="110"
        cy="110"
        r="70"
        fill="none"
        stroke="currentColor"
        strokeWidth="0.6"
        opacity="0.25"
      />

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

      <text fill="currentColor" fontSize="8.5" letterSpacing="4.4" opacity="0.8" dy="-7">
        <textPath href="#palma-seal-lower" startOffset="50%" textAnchor="middle">
          {sublegend}
        </textPath>
      </text>

      {/* Palm geometry, engraved */}
      <g
        transform="translate(110 98) scale(1.45)"
        stroke="currentColor"
        strokeWidth="0.9"
        strokeLinecap="round"
        fill="none"
      >
        <path d="M0 20V-16" />
        <path d="M0-11C-5.6-14.6-11.5-15-17-12.6" />
        <path d="M0-11c5.6-3.6 11.5-4 17-1.6" />
        <path d="M0-1.5C-5-5.9-10.6-7.4-16-6" />
        <path d="M0-1.5c5-4.4 10.6-5.9 16-4.5" />
        <path d="M0 8.5c-4.4-4.6-9.2-6.6-14-6" />
        <path d="M0 8.5c4.4-4.6 9.2-6.6 14-6" />
        <circle cx="0" cy="-19.6" r="2" />
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
