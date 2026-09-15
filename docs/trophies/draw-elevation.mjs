import sharp from 'sharp';
import { writeFileSync } from 'node:fs';
import { CROWN, FRONDS, PALM_UNITS, SPINE } from './geometry.mjs';

const DIR = new URL('.', import.meta.url).pathname;

const INK = '#141517';
const CHAMPAGNE = '#C9B58A';
const CHAMPAGNE_HI = '#EFE4C9';
const BRONZE_DARK = '#5A4C36';
const BRONZE_BACK = '#3E3527';
const BRONZE_MID = '#9C8862';
const OAK = '#7B6647';
const OAK_DARK = '#4A3D2B';
const TAUPE = '#8C8478';
const RULE = '#2E3136';

function tapered(d, { base, tip, colour, steps = 30, dy = 0, dx = 0, scaleX = 1 }) {
  const out = [];
  for (let i = 0; i < steps; i += 1) {
    const t = i / (steps - 1);
    const width = tip + (base - tip) * t;
    const length = 100 - t * 100;
    const tr = [];
    if (dx || dy) tr.push(`translate(${dx} ${dy})`);
    if (scaleX !== 1) tr.push(`translate(24 0) scale(${scaleX} 1) translate(-24 0)`);
    out.push(
      `<path d="${d}" pathLength="100" stroke-dasharray="${length.toFixed(2)} 100"` +
        ` stroke="${colour}" stroke-width="${width.toFixed(3)}"` +
        (tr.length ? ` transform="${tr.join(' ')}"` : '') +
        `/>`,
    );
  }
  return out.join('');
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

/**
 * The same frond, seen end-on.
 *
 * The object is a cross in plan: one set of fronds in the plane of the mark, a
 * second set at ninety degrees to it. Head-on you see the logo exactly; from
 * anywhere else you see a palm rather than a cutout of one. In elevation the
 * perpendicular set foreshortens almost to nothing, and drawing it dark and
 * short is what stops the trophy reading as a flat pressing.
 */
function frondBehind(d) {
  return [
    tapered(d, { base: 1.5, tip: 0.16, colour: BRONZE_BACK, scaleX: 0.1 }),
    tapered(d, { base: 0.38, tip: 0.05, colour: BRONZE_DARK, dy: -0.26, scaleX: 0.1 }),
  ].join('');
}

/**
 * The palm.
 *
 * `bare` is how much spine shows below the lowest frond pair, in mark units.
 * The first version left almost half the palm as naked stalk, which is the
 * single thing that made it read as a plant on a stick rather than an object.
 * The palm is now socketed deep into a turned collar, so what shows is a hand's
 * width and the transition is deliberate.
 */
function palm({ cx, baseY, height, crown = true }) {
  const k = height / PALM_UNITS;
  const behind = FRONDS.flatMap(([a, b]) => [frondBehind(a), frondBehind(b)]);
  const front = FRONDS.flatMap(([a, b]) => [frond(a), frond(b)]);

  const parts = [
    ...behind,
    tapered(SPINE, { base: 3.0, tip: 0.6, colour: BRONZE_DARK, dx: 0.4 }),
    tapered(SPINE, { base: 2.62, tip: 0.5, colour: BRONZE_MID }),
    tapered(SPINE, { base: 0.78, tip: 0.16, colour: CHAMPAGNE, dx: -0.66 }),
    ...front,
  ];

  if (crown) {
    parts.push(
      `<circle cx="${CROWN.cx}" cy="${CROWN.cy}" r="${CROWN.r}" fill="${BRONZE_DARK}"/>`,
      `<circle cx="${CROWN.cx - 0.18}" cy="${CROWN.cy - 0.2}" r="${CROWN.r * 0.88}" fill="${BRONZE_MID}"/>`,
      `<circle cx="${CROWN.cx - 0.6}" cy="${CROWN.cy - 0.68}" r="${CROWN.r * 0.34}" fill="${CHAMPAGNE_HI}"/>`,
    );
  }

  return `<g transform="translate(${cx} ${baseY}) scale(${k}) translate(-24 -53)" fill="none" stroke-linecap="round">${parts.join('')}</g>`;
}

/**
 * The seal.
 *
 * A turned bronze disc, not an oak block. A block is joinery; a disc that has
 * been turned on a lathe and struck with the year is the object PALMA's whole
 * verification language already describes. The oak survives as the ring foot it
 * stands on, which is what keeps it warm and stops it ringing on a table.
 */
function sealBase({ cx, topY, width, height, plateW }) {
  const x = cx - width / 2;
  const r = width / 2;
  // The crown of a turned disc: a shallow dome across the top face, then a
  // quarter fillet down to the rim. Drawn as straight chamfers it was a tray.
  const domeDrop = height * 0.2;
  const fillet = height * 0.3;
  const footW = width * 0.88;
  const footH = height * 0.3;
  const fx = cx - footW / 2;
  const fy = topY + height;

  const body =
    `M ${x} ${topY + domeDrop + fillet}` +
    ` Q ${x} ${topY + domeDrop} ${x + fillet} ${topY + domeDrop}` +
    ` Q ${cx} ${topY - domeDrop * 0.55} ${x + width - fillet} ${topY + domeDrop}` +
    ` Q ${x + width} ${topY + domeDrop} ${x + width} ${topY + domeDrop + fillet}` +
    ` L ${x + width} ${topY + height} L ${x} ${topY + height} Z`;

  const ph = Math.max(7, height * 0.3);
  const py = topY + height * 0.52;

  return `
    <path d="${body}" fill="${BRONZE_MID}"/>
    <path d="M ${x + fillet} ${topY + domeDrop} Q ${cx} ${topY - domeDrop * 0.55} ${x + width - fillet} ${topY + domeDrop} Q ${cx} ${topY + domeDrop * 0.9} ${x + fillet} ${topY + domeDrop} Z" fill="${CHAMPAGNE}" opacity="0.55"/>
    <rect x="${x}" y="${topY + height - height * 0.2}" width="${width}" height="${height * 0.2}" fill="${BRONZE_DARK}"/>
    <rect x="${cx - plateW / 2 - 1}" y="${py - 1}" width="${plateW + 2}" height="${ph + 2}" fill="${BRONZE_DARK}"/>
    <rect x="${cx - plateW / 2}" y="${py}" width="${plateW}" height="${ph}" fill="${CHAMPAGNE}" opacity="0.8"/>
    <rect x="${fx}" y="${fy}" width="${footW}" height="${footH}" fill="${OAK}"/>
    <rect x="${fx}" y="${fy + footH - 2.5}" width="${footW}" height="2.5" fill="${OAK_DARK}"/>
    ${void r}
  `;
}

/** The cruciform arrangement, seen from above. */
function plan({ cx, cy, r }) {
  const arms = [0, 90, 180, 270]
    .map(
      (a) =>
        `<g transform="rotate(${a} ${cx} ${cy})">` +
        `<path d="M ${cx} ${cy} Q ${cx + r * 0.55} ${cy - r * 0.16} ${cx + r} ${cy - r * 0.1}" stroke="${BRONZE_MID}" stroke-width="3.4" fill="none" stroke-linecap="round"/>` +
        `<path d="M ${cx} ${cy} Q ${cx + r * 0.55} ${cy - r * 0.16} ${cx + r} ${cy - r * 0.1}" stroke="${CHAMPAGNE}" stroke-width="1.1" fill="none" stroke-linecap="round" transform="translate(0 -1.1)"/>` +
        `</g>`,
    )
    .join('');
  return `
    <circle cx="${cx}" cy="${cy}" r="${r * 1.28}" fill="none" stroke="${RULE}" stroke-width="1"/>
    <circle cx="${cx}" cy="${cy}" r="${r * 1.28}" fill="${BRONZE_MID}" opacity="0.07"/>
    ${arms}
    <circle cx="${cx}" cy="${cy}" r="5" fill="${BRONZE_MID}"/>
    <circle cx="${cx - 1}" cy="${cy - 1}" r="2" fill="${CHAMPAGNE_HI}"/>
  `;
}

function dimV({ x, y1, y2, label }) {
  const mid = (y1 + y2) / 2;
  return `
    <line x1="${x}" y1="${y1}" x2="${x}" y2="${y2}" stroke="${TAUPE}" stroke-width="0.8" opacity="0.8"/>
    <line x1="${x - 5}" y1="${y1}" x2="${x + 5}" y2="${y1}" stroke="${TAUPE}" stroke-width="0.8"/>
    <line x1="${x - 5}" y1="${y2}" x2="${x + 5}" y2="${y2}" stroke="${TAUPE}" stroke-width="0.8"/>
    <text x="${x - 11}" y="${mid}" fill="${TAUPE}" font-size="12.5" text-anchor="end" dominant-baseline="middle"
      font-family="ui-monospace, Menlo, monospace" letter-spacing="1">${label}</text>
  `;
}

function label({ x, y, title, lines }) {
  return `
    <text x="${x}" y="${y}" fill="${CHAMPAGNE}" font-size="14" font-family="Georgia, serif" letter-spacing="3.4">${title}</text>
    <line x1="${x}" y1="${y + 11}" x2="${x + 200}" y2="${y + 11}" stroke="${RULE}" stroke-width="1"/>
    ${lines.map((l, i) => `<text x="${x}" y="${y + 33 + i * 17}" fill="${TAUPE}" font-size="12.5" font-family="Georgia, serif">${l}</text>`).join('')}
  `;
}

const W = 1680;
const H = 1120;
const S = 1.34;
const GROUND = 770;

// Two objects. The finalist frond is gone: a third thing in the family was one
// thing too many, and a finalist is already recognised by being named.
const P1 = { cx: 430, base: 42, foot: 10, palm: 296, baseW: 150, plate: 96 };
const P2 = { cx: 980, base: 32, foot: 8, palm: 184, baseW: 116, plate: 72 };

function stand(p, opts) {
  const baseTop = GROUND - (p.base + p.foot) * S;
  return {
    top: baseTop - p.palm * S,
    svg:
      palm({ cx: p.cx, baseY: baseTop + p.base * S * 0.55, height: p.palm * S, ...opts }) +
      sealBase({
        cx: p.cx,
        topY: baseTop,
        width: p.baseW * S,
        height: p.base * S,
        plateW: p.plate * S,
      }),
  };
}

const a = stand(P1, { crown: true });
const b = stand(P2, { crown: false });

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="${INK}"/>
  <rect x="38" y="38" width="${W - 76}" height="${H - 76}" fill="none" stroke="${RULE}" stroke-width="1"/>

  <text x="74" y="106" fill="${CHAMPAGNE}" font-size="31" font-family="Georgia, serif" letter-spacing="10">PALMA</text>
  <text x="74" y="133" fill="${TAUPE}" font-size="11.5" font-family="Georgia, serif" letter-spacing="4.5">THE TROPHIES · FRONT ELEVATION AND PLAN · CAST BRONZE ON A TURNED SEAL</text>
  <line x1="74" y1="156" x2="${W - 74}" y2="156" stroke="${RULE}" stroke-width="1"/>

  <line x1="200" y1="${GROUND}" x2="1180" y2="${GROUND}" stroke="${RULE}" stroke-width="1.4"/>

  ${a.svg}${b.svg}

  ${dimV({ x: P1.cx - 212, y1: a.top, y2: GROUND, label: '400' })}
  ${dimV({ x: P2.cx - 158, y1: b.top, y2: GROUND, label: '265' })}

  ${label({
    x: P1.cx - 212,
    y: GROUND + 62,
    title: 'THE PALMA',
    lines: [
      'One a year. The whole palm, four frond pairs,',
      'and the crown held clear on a tapered needle.',
      'Bronze, on a turned bronze seal. 2.9 kg.',
    ],
  })}
  ${label({
    x: P2.cx - 158,
    y: GROUND + 62,
    title: 'CATEGORY PALMA',
    lines: [
      'The same palm, no crown. That is the whole',
      'hierarchy, and it reads across a room.',
      '1.4 kg.',
    ],
  })}

  <!-- Plan -->
  <g>
    <text x="1330" y="252" fill="${CHAMPAGNE}" font-size="14" font-family="Georgia, serif" letter-spacing="3.4">PLAN</text>
    <line x1="1330" y1="263" x2="1530" y2="263" stroke="${RULE}" stroke-width="1"/>
    ${plan({ cx: 1430, cy: 400, r: 96 })}
    <text x="1330" y="556" fill="${TAUPE}" font-size="12.5" font-family="Georgia, serif">Cruciform. One set of fronds in the</text>
    <text x="1330" y="573" fill="${TAUPE}" font-size="12.5" font-family="Georgia, serif">plane of the mark, a second at ninety</text>
    <text x="1330" y="590" fill="${TAUPE}" font-size="12.5" font-family="Georgia, serif">degrees to it.</text>
    <text x="1330" y="620" fill="${TAUPE}" font-size="12.5" font-family="Georgia, serif">Head-on you see the logo exactly.</text>
    <text x="1330" y="637" fill="${TAUPE}" font-size="12.5" font-family="Georgia, serif">From anywhere else you see a palm,</text>
    <text x="1330" y="654" fill="${TAUPE}" font-size="12.5" font-family="Georgia, serif">not a cutout of one.</text>
  </g>

  <text x="74" y="${H - 74}" fill="${TAUPE}" font-size="12" font-family="Georgia, serif">Socketed deep into the seal, so what shows below the lowest fronds is a hand's width and not a bare stalk.</text>
  <text x="${W - 74}" y="${H - 74}" fill="${TAUPE}" font-size="11" text-anchor="end" font-family="ui-monospace, Menlo, monospace" letter-spacing="1">MILLIMETRES</text>
</svg>`;

writeFileSync(`${DIR}/palma-trophies.svg`, svg);
await sharp(Buffer.from(svg), { density: 200 }).png().toFile(`${DIR}/palma-trophies.png`);
console.log('elevation ok');
