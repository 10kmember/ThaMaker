import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

/** The PALMA mark on ink, for a home-screen shortcut. */
export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#161719',
      }}
    >
      <svg width="104" height="122" viewBox="0 0 48 56" fill="none">
        <g stroke="#C9B58A" strokeWidth="1.9" strokeLinecap="round" fill="none">
          <path d="M24 50V12" />
          <path d="M24 16C18.2 12.8 12.6 12.4 7.2 14.8" />
          <path d="M24 16c5.8-3.2 11.4-3.6 16.8-1.2" />
          <path d="M24 26.5C18.8 22.6 13.5 21.3 8.2 22.6" />
          <path d="M24 26.5c5.2-3.9 10.5-5.2 15.8-3.9" />
          <path d="M24 37c-4.6-4.2-9.3-6-14-5.4" />
          <path d="M24 37c4.6-4.2 9.3-6 14-5.4" />
          <circle cx="24" cy="8" r="2.2" />
        </g>
      </svg>
    </div>,
    size,
  );
}
