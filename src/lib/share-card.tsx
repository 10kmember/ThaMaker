import { ImageResponse } from 'next/og';

export const SHARE_CARD_SIZE = { width: 1200, height: 630 };

const INK = '#161719';
const IVORY = '#F4F0E8';
const CHAMPAGNE = '#C9B58A';

/**
 * PALMA share cards.
 *
 * Generated from the record itself, so a card cannot misstate an honour: the
 * name, category and season come from the same row the verification page reads.
 */
export function renderShareCard({
  eyebrow,
  name,
  line,
  footer,
}: {
  eyebrow: string;
  name: string;
  line?: string;
  footer?: string;
}) {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        background: INK,
        color: IVORY,
        padding: '72px 80px',
        position: 'relative',
      }}
    >
      {/* Engraved palm, top right */}
      <svg
        width="420"
        height="520"
        viewBox="0 0 200 260"
        style={{ position: 'absolute', top: -60, right: -60, opacity: 0.07 }}
      >
        <g stroke={IVORY} strokeWidth="1.2" fill="none" strokeLinecap="round">
          <path d="M100 250V96" />
          <path d="M100 110c-28-5-48-22-58-50 30 2 51 19 58 43" />
          <path d="M100 110c28-5 48-22 58-50-30 2-51 19-58 43" />
          <path d="M100 156c-22-4-38-18-46-40 24 2 41 15 46 34" />
          <path d="M100 156c22-4 38-18 46-40-24 2-41 15-46 34" />
          <path d="M100 200c-17-3-29-14-35-31 18 2 31 12 35 26" />
          <path d="M100 200c17-3 29-14 35-31-18 2-31 12-35 26" />
        </g>
      </svg>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ fontSize: 30, letterSpacing: 14, fontWeight: 600 }}>PALMA</div>
        <div
          style={{ fontSize: 17, letterSpacing: 5, color: CHAMPAGNE, textTransform: 'uppercase' }}
        >
          {eyebrow}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 22, maxWidth: 940 }}>
        <div style={{ fontSize: name.length > 24 ? 78 : 104, lineHeight: 1, letterSpacing: -2 }}>
          {name}
        </div>
        {line ? (
          <div style={{ fontSize: 30, color: 'rgba(244,240,232,0.72)', letterSpacing: -0.4 }}>
            {line}
          </div>
        ) : null}
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          borderTop: '1px solid rgba(244,240,232,0.2)',
          paddingTop: 26,
        }}
      >
        <div style={{ fontSize: 17, letterSpacing: 5, color: 'rgba(244,240,232,0.6)' }}>
          THE CREATOR HONOURS
        </div>
        {footer ? (
          <div style={{ fontSize: 17, letterSpacing: 3, color: CHAMPAGNE }}>{footer}</div>
        ) : null}
      </div>
    </div>,
    SHARE_CARD_SIZE,
  );
}
