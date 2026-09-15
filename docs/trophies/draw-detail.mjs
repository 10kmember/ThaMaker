import sharp from 'sharp';
import { writeFileSync } from 'node:fs';
import { CROWN, FRONDS, PALM_UNITS, SPINE } from './geometry.mjs';

const DIR = new URL('.', import.meta.url).pathname;

const INK = '#141517';
const CHAMPAGNE = '#C9B58A';
const CHAMPAGNE_HI = '#EFE4C9';
const BRONZE_DARK = '#5A4C36';
const BRONZE_MID = '#9C8862';
const BRONZE_BACK = '#3E3527';
const OAK = '#7B6647';
const OAK_DARK = '#4A3D2B';
const TAUPE = '#8C8478';
const RULE = '#2E3136';

function tapered(d, { base, tip, colour, steps = 34, dy = 0, dx = 0, scaleX = 1 }) {
  const out = [];
  for (let i = 0; i < steps; i += 1) {
    const t = i / (steps - 1);
    const width = tip + (base - tip) * t;
    const length = 100 - t * 100;
    const tr = [];
    if (dx || dy) tr.push(`translate(${dx} ${dy})`);
    if (scaleX !== 1) tr.push(`translate(24 0) scale(${scaleX} 1) translate(-24 0)`);
    out.push(
      `<path d="${d}" pathLength="100" stroke-dasharray="${length.toFixed(2)} 100" stroke="${colour}" stroke-width="${width.toFixed(3)}"` +
        (tr.length ? ` transform="${tr.join(' ')}"` : '') +
        `/>`,
    );
  }
  return out.join('');
}

/** The perpendicular set, foreshortened: what stops this reading as a pressing. */
function frondBehind(d) {
  return [
    tapered(d, { base: 1.5, tip: 0.16, colour: BRONZE_BACK, scaleX: 0.1 }),
    tapered(d, { base: 0.38, tip: 0.05, colour: BRONZE_DARK, dy: -0.26, scaleX: 0.1 }),
  ].join('');
}

function frond(d) {
  const b = 1.72;
  return [
    tapered(d, { base: b * 1.1, tip: 0.2, colour: BRONZE_DARK, dy: 0.34 }),
    tapered(d, { base: b, tip: 0.16, colour: BRONZE_MID }),
    tapered(d, { base: b * 0.3, tip: 0.05, colour: CHAMPAGNE, dy: -0.34 }),
    tapered(d, { base: b * 0.11, tip: 0.03, colour: CHAMPAGNE_HI, dy: -0.46 }),
  ].join('');
}

function palm({ cx, baseY, height }) {
  const k = height / PALM_UNITS;
  const parts = [
    ...FRONDS.flatMap(([a, b]) => [frondBehind(a), frondBehind(b)]),
    tapered(SPINE, { base: 3.0, tip: 0.6, colour: BRONZE_DARK, dx: 0.4 }),
    tapered(SPINE, { base: 2.62, tip: 0.5, colour: BRONZE_MID }),
    tapered(SPINE, { base: 0.78, tip: 0.16, colour: CHAMPAGNE, dx: -0.66 }),
    ...FRONDS.flatMap(([a, b]) => [frond(a), frond(b)]),
    `<circle cx="${CROWN.cx}" cy="${CROWN.cy}" r="${CROWN.r}" fill="${BRONZE_DARK}"/>`,
    `<circle cx="${CROWN.cx - 0.18}" cy="${CROWN.cy - 0.2}" r="${CROWN.r * 0.88}" fill="${BRONZE_MID}"/>`,
    `<circle cx="${CROWN.cx - 0.6}" cy="${CROWN.cy - 0.68}" r="${CROWN.r * 0.34}" fill="${CHAMPAGNE_HI}"/>`,
  ];
  return `<g transform="translate(${cx} ${baseY}) scale(${k}) translate(-24 -53)" fill="none" stroke-linecap="round">${parts.join('')}</g>`;
}

function callout({ x1, y1, x2, y2, title, lines, anchor = 'start' }) {
  const tx = anchor === 'end' ? x2 - 12 : x2 + 12;
  return `
    <circle cx="${x1}" cy="${y1}" r="3" fill="${CHAMPAGNE}"/>
    <path d="M ${x1} ${y1} L ${x2} ${y2}" stroke="${CHAMPAGNE}" stroke-width="0.9" opacity="0.55" fill="none"/>
    <text x="${tx}" y="${y2 - 4}" fill="${CHAMPAGNE}" font-size="13" text-anchor="${anchor}" font-family="Georgia, serif" letter-spacing="2.6">${title}</text>
    ${lines.map((l, i) => `<text x="${tx}" y="${y2 + 15 + i * 16}" fill="${TAUPE}" font-size="12" text-anchor="${anchor}" font-family="Georgia, serif">${l}</text>`).join('')}
  `;
}

const W = 1680;
const H = 1180;
const GROUND = 890;
const CX = 640;
const PALM_PX = 600;
const PX_PER_MM = PALM_PX / 288;
const BASE_H = Math.round(42 * PX_PER_MM);
const BASE_W = Math.round(150 * PX_PER_MM);

const baseTop = GROUND - BASE_H;
const bx = CX - BASE_W / 2;
const ch = 13;

/** A frond in section: a round rod, dark below, polished along the top arris. */
function section(cx, cy, r) {
  return `
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="${BRONZE_DARK}"/>
    <path d="M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy} Z" fill="${BRONZE_MID}"/>
    <path d="M ${cx - r * 0.72} ${cy - r * 0.62} A ${r} ${r} 0 0 1 ${cx + r * 0.2} ${cy - r * 0.97} L ${cx} ${cy} Z" fill="${CHAMPAGNE}" opacity="0.85"/>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${TAUPE}" stroke-width="0.8" opacity="0.6"/>
  `;
}

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <radialGradient id="pool" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="${CHAMPAGNE}" stop-opacity="0.09"/>
      <stop offset="100%" stop-color="${CHAMPAGNE}" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <rect width="${W}" height="${H}" fill="${INK}"/>
  <ellipse cx="${CX}" cy="${GROUND - 210}" rx="470" ry="420" fill="url(#pool)"/>
  <rect x="38" y="38" width="${W - 76}" height="${H - 76}" fill="none" stroke="${RULE}" stroke-width="1"/>

  <text x="74" y="106" fill="${CHAMPAGNE}" font-size="31" font-family="Georgia, serif" letter-spacing="10">THE PALMA</text>
  <text x="74" y="133" fill="${TAUPE}" font-size="11.5" font-family="Georgia, serif" letter-spacing="4.5">THE HIGHEST HONOUR · ONE A YEAR · 400 mm · 2.9 kg</text>
  <line x1="74" y1="156" x2="${W - 74}" y2="156" stroke="${RULE}" stroke-width="1"/>

  ${palm({ cx: CX, baseY: baseTop + BASE_H * 0.55, height: PALM_PX })}

  <!-- The turned seal, drawn over the spine so it is socketed, not stood on -->
  <path d="M ${bx} ${baseTop + BASE_H * 0.2 + BASE_H * 0.3} Q ${bx} ${baseTop + BASE_H * 0.2} ${bx + BASE_H * 0.3} ${baseTop + BASE_H * 0.2} Q ${CX} ${baseTop - BASE_H * 0.11} ${bx + BASE_W - BASE_H * 0.3} ${baseTop + BASE_H * 0.2} Q ${bx + BASE_W} ${baseTop + BASE_H * 0.2} ${bx + BASE_W} ${baseTop + BASE_H * 0.5} L ${bx + BASE_W} ${GROUND - 16} L ${bx} ${GROUND - 16} Z" fill="${BRONZE_MID}"/>
  <path d="M ${bx + BASE_H * 0.3} ${baseTop + BASE_H * 0.2} Q ${CX} ${baseTop - BASE_H * 0.11} ${bx + BASE_W - BASE_H * 0.3} ${baseTop + BASE_H * 0.2} Q ${CX} ${baseTop + BASE_H * 0.18} ${bx + BASE_H * 0.3} ${baseTop + BASE_H * 0.2} Z" fill="${CHAMPAGNE}" opacity="0.55"/>
  <rect x="${bx}" y="${GROUND - 26}" width="${BASE_W}" height="10" fill="${BRONZE_DARK}"/>
  <rect x="${bx + BASE_W * 0.06}" y="${GROUND - 16}" width="${BASE_W * 0.88}" height="16" fill="${OAK}"/>
  <rect x="${bx + BASE_W * 0.06}" y="${GROUND - 4}" width="${BASE_W * 0.88}" height="4" fill="${OAK_DARK}"/>

  <!-- The plate, let into the rim -->
  <rect x="${CX - 97}" y="${baseTop + BASE_H * 0.5}" width="194" height="34" fill="${BRONZE_DARK}"/>
  <rect x="${CX - 96}" y="${baseTop + BASE_H * 0.5 + 1}" width="192" height="32" fill="${CHAMPAGNE}" opacity="0.85"/>
  <text x="${CX}" y="${baseTop + BASE_H * 0.5 + 15}" fill="${INK}" font-size="11" text-anchor="middle" font-family="Georgia, serif" letter-spacing="3">THE PALMA · 2027</text>
  <text x="${CX}" y="${baseTop + BASE_H * 0.5 + 28}" fill="${INK}" font-size="10" text-anchor="middle" font-family="Georgia, serif" letter-spacing="2">AMA OKONKWO</text>

  ${callout({
    x1: CX + 2,
    y1: GROUND - BASE_H - PALM_PX + 6,
    x2: CX + 250,
    y2: 250,
    title: 'THE CROWN',
    lines: [
      'A 16 mm sphere held 12 mm clear on a',
      'needle that tapers out of the spine.',
      'Only THE PALMA carries it.',
    ],
  })}

  ${callout({
    x1: CX + 172,
    y1: 352,
    x2: CX + 250,
    y2: 412,
    title: 'THE TIP',
    lines: ['Every frond closes to a 4 mm hemisphere.', 'Nothing in this object is cut off flat.'],
  })}

  ${callout({
    x1: CX - 150,
    y1: 470,
    x2: CX - 250,
    y2: 430,
    anchor: 'end',
    title: 'TWO FINISHES, ONE CASTING',
    lines: [
      'Upper faces mirror-polished; undersides',
      'and spine left bead-blasted dark. The palm',
      'lights from above, which is the only light',
      'an awards photograph ever has.',
    ],
  })}

  ${callout({
    x1: CX - 96,
    y1: baseTop + 42,
    x2: CX - 250,
    y2: baseTop + 6,
    anchor: 'end',
    title: 'THE PLATE',
    lines: [
      'Brass, let in flush 3 mm, deep-etched and',
      'oxide-filled. Not laser-marked: laser sits on',
      'the surface and wears off what gets handled.',
    ],
  })}

  ${callout({
    x1: CX + BASE_W / 2 - 14,
    y1: GROUND - 10,
    x2: CX + 250,
    y2: GROUND - 26,
    title: 'THE CODE, UNDERNEATH',
    lines: [
      'PM-2027-XXXXXX and the verify URL, engraved',
      'on the underside. It is proof, not decoration,',
      'and it should be found by turning the thing over.',
    ],
  })}

  <!-- Section detail -->
  <g transform="translate(${W - 330} ${H - 300})">
    <text x="0" y="0" fill="${CHAMPAGNE}" font-size="13" font-family="Georgia, serif" letter-spacing="2.6">FROND, IN SECTION</text>
    <line x1="0" y1="11" x2="210" y2="11" stroke="${RULE}" stroke-width="1"/>
    ${section(36, 62, 30)}
    ${section(116, 66, 20)}
    ${section(180, 70, 10)}
    <text x="36" y="112" fill="${TAUPE}" font-size="11" text-anchor="middle" font-family="ui-monospace, Menlo, monospace">7</text>
    <text x="116" y="112" fill="${TAUPE}" font-size="11" text-anchor="middle" font-family="ui-monospace, Menlo, monospace">5.5</text>
    <text x="180" y="112" fill="${TAUPE}" font-size="11" text-anchor="middle" font-family="ui-monospace, Menlo, monospace">4</text>
    <text x="0" y="140" fill="${TAUPE}" font-size="11.5" font-family="Georgia, serif">Round throughout. At the spine, at</text>
    <text x="0" y="156" fill="${TAUPE}" font-size="11.5" font-family="Georgia, serif">mid-span, and at the tip.</text>
  </g>

  <text x="74" y="${H - 74}" fill="${TAUPE}" font-size="12" font-family="Georgia, serif">Sand-cast silicon bronze, one piece. Waxed, not lacquered, so it darkens with handling: the object should look like it has been owned.</text>
  <text x="${W - 74}" y="${H - 74}" fill="${TAUPE}" font-size="11" text-anchor="end" font-family="ui-monospace, Menlo, monospace" letter-spacing="1">MILLIMETRES</text>
</svg>`;

writeFileSync(`${DIR}/the-palma-detail.svg`, svg);
await sharp(Buffer.from(svg), { density: 200 }).png().toFile(`${DIR}/the-palma-detail.png`);
console.log('hero ok');
