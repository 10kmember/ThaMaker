import sharp from 'sharp';
import { writeFileSync } from 'node:fs';
import { CROWN, FRONDS, PALM_UNITS, SPINE } from './geometry.mjs';

const DIR = new URL('.', import.meta.url).pathname;

const INK = '#141517';
const CHAMPAGNE = '#C9B58A';
const CHAMPAGNE_HI = '#EFE4C9';
const BRONZE_DARK = '#5A4C36';
const BRONZE_MID = '#9C8862';
const OAK = '#7B6647';
const OAK_DARK = '#4A3D2B';
const TAUPE = '#8C8478';
const RULE = '#2E3136';

/**
 * A tapered stroke.
 *
 * SVG has no variable stroke width, so the path is drawn many times: each pass
 * a little thinner and, via `pathLength` and a dash, a little shorter. Stacked,
 * they read as one rod swelling at the spine and closing to a point at the tip
 * — which is what cast bronze actually does, and what a uniform stroke cannot
 * say. Without it the fronds look like rubber tube.
 */
function tapered(d, { base, tip, colour, steps = 30, dy = 0, dx = 0 }) {
  const out = [];
  for (let i = 0; i < steps; i += 1) {
    const t = i / (steps - 1);
    // The FULL-length pass is the thinnest, and each shorter pass is thicker.
    // Stacked, that swells the rod at the spine and closes it to a point at the
    // tip. Drawn the other way round it produces a club, which is what the
    // first attempt did.
    const width = tip + (base - tip) * t;
    const length = 100 - t * 100;
    out.push(
      `<path d="${d}" pathLength="100" stroke-dasharray="${length.toFixed(2)} 100"` +
        ` stroke="${colour}" stroke-width="${width.toFixed(3)}"` +
        (dx || dy ? ` transform="translate(${dx} ${dy})"` : '') +
        `/>`,
    );
  }
  return out.join('');
}

/** One frond: dark underside, body, then the polished upper arris. */
function frond(d) {
  const b = 1.72;
  return [
    tapered(d, { base: b * 1.1, tip: 0.2, colour: BRONZE_DARK, dy: 0.34 }),
    tapered(d, { base: b, tip: 0.16, colour: BRONZE_MID }),
    tapered(d, { base: b * 0.3, tip: 0.05, colour: CHAMPAGNE, dy: -0.34 }),
    tapered(d, { base: b * 0.11, tip: 0.03, colour: CHAMPAGNE_HI, dy: -0.46 }),
  ].join('');
}

/** The spine, tapering from the socket to the needle that carries the crown. */
function spine() {
  return [
    tapered(SPINE, { base: 3.0, tip: 0.6, colour: BRONZE_DARK, dx: 0.4 }),
    tapered(SPINE, { base: 2.62, tip: 0.5, colour: BRONZE_MID }),
    tapered(SPINE, { base: 0.78, tip: 0.16, colour: CHAMPAGNE, dx: -0.66 }),
  ].join('');
}

function palm({ cx, baseY, height, crown = true, pairs = 4 }) {
  const k = height / PALM_UNITS;
  const used = FRONDS.slice(4 - pairs);
  const parts = [spine(), ...used.flatMap(([a, b]) => [frond(a), frond(b)])];

  if (crown) {
    parts.push(
      `<circle cx="${CROWN.cx}" cy="${CROWN.cy}" r="${CROWN.r}" fill="${BRONZE_DARK}" stroke="none"/>`,
      `<circle cx="${CROWN.cx - 0.18}" cy="${CROWN.cy - 0.2}" r="${CROWN.r * 0.88}" fill="${BRONZE_MID}" stroke="none"/>`,
      `<circle cx="${CROWN.cx - 0.6}" cy="${CROWN.cy - 0.68}" r="${CROWN.r * 0.34}" fill="${CHAMPAGNE_HI}" stroke="none"/>`,
    );
  }

  return `<g transform="translate(${cx} ${baseY}) scale(${k}) translate(-24 -53)" fill="none" stroke-linecap="round">${parts.join('')}</g>`;
}

/**
 * The base.
 *
 * One block, not two stacked. A trophy on a tiered plinth reads as a wedding
 * cake; a single quarter-sawn block with the brass plate let into its face
 * reads as a thing that was made. The chamfer is drawn, because a 2mm chamfer
 * is the difference between joinery and a offcut.
 */
function base({ cx, topY, width, height, plateW }) {
  const x = cx - width / 2;
  const ch = Math.min(6, height * 0.22);
  const face = `M ${x} ${topY + ch} L ${x + ch} ${topY} L ${x + width - ch} ${topY} L ${x + width} ${topY + ch} L ${x + width} ${topY + height} L ${x} ${topY + height} Z`;
  const grain = [];
  for (let i = 1; i < 4; i += 1) {
    const gy = topY + ch + ((height - ch) / 4) * i;
    grain.push(
      `<line x1="${x + 9}" y1="${gy}" x2="${x + width - 9}" y2="${gy}" stroke="${OAK_DARK}" stroke-width="0.7" opacity="0.45"/>`,
    );
  }
  const ph = Math.max(6, height * 0.34);
  const py = topY + height * 0.42;
  const plate = plateW
    ? `<rect x="${cx - plateW / 2 - 1}" y="${py - 1}" width="${plateW + 2}" height="${ph + 2}" fill="${OAK_DARK}"/>` +
      `<rect x="${cx - plateW / 2}" y="${py}" width="${plateW}" height="${ph}" fill="${BRONZE_MID}"/>` +
      `<rect x="${cx - plateW / 2}" y="${py}" width="${plateW}" height="${ph * 0.32}" fill="${CHAMPAGNE}" opacity="0.6"/>`
    : '';
  return `
    <path d="${face}" fill="${OAK}"/>
    <path d="M ${x} ${topY + ch} L ${x + ch} ${topY} L ${x + width - ch} ${topY} L ${x + width} ${topY + ch} Z" fill="${CHAMPAGNE}" opacity="0.2"/>
    <rect x="${x}" y="${topY + height - 3.5}" width="${width}" height="3.5" fill="${OAK_DARK}"/>
    ${grain.join('')}
    ${plate}
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
    <line x1="${x}" y1="${y + 11}" x2="${x + 190}" y2="${y + 11}" stroke="${RULE}" stroke-width="1"/>
    ${lines.map((line, i) => `<text x="${x}" y="${y + 33 + i * 17}" fill="${TAUPE}" font-size="12.5" font-family="Georgia, serif">${line}</text>`).join('')}
  `;
}

const W = 1680;
const H = 1120;
const S = 1.34;
const GROUND = 760;

const P1 = { cx: 360, base: 34, palm: 288, baseW: 168, plate: 92 };
const P2 = { cx: 852, base: 26, palm: 178, baseW: 128, plate: 70 };
const P3 = { cx: 1276, base: 20, palm: 92, baseW: 104, plate: 54 };

function stand(p, opts) {
  const baseTop = GROUND - p.base * S;
  return {
    top: baseTop - p.palm * S,
    svg:
      base({
        cx: p.cx,
        topY: baseTop,
        width: p.baseW * S,
        height: p.base * S,
        plateW: p.plate * S,
      }) + palm({ cx: p.cx, baseY: baseTop + 2, height: p.palm * S, ...opts }),
  };
}

const a = stand(P1, { crown: true, pairs: 4 });
const b = stand(P2, { crown: false, pairs: 4 });

// The finalist is one frond pair alone, rising from the block: no spine stub,
// which is what made it look like a broken twig rather than a deliberate object.
/**
 * The finalist: a single frond, socketed into the block and rising.
 *
 * A frond pair laid flat reads as a moustache. One frond, rotated up so it
 * leaves the block steeply and opens as it goes, reads as what it is: a part of
 * the palm, given to somebody who was part of the season.
 */
const c = (() => {
  const baseTop = GROUND - P3.base * S;
  const k = (P3.palm * S) / 17.5;
  const d = FRONDS[0][1];
  const g =
    `<g transform="translate(${P3.cx} ${baseTop + 2}) scale(${k}) rotate(-62) translate(-24 -13)" ` +
    `fill="none" stroke-linecap="round">${frond(d)}</g>`;
  return {
    top: baseTop - P3.palm * S,
    svg:
      base({
        cx: P3.cx,
        topY: baseTop,
        width: P3.baseW * S,
        height: P3.base * S,
        plateW: P3.plate * S,
      }) + g,
  };
})();

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="${INK}"/>
  <rect x="38" y="38" width="${W - 76}" height="${H - 76}" fill="none" stroke="${RULE}" stroke-width="1"/>

  <text x="74" y="106" fill="${CHAMPAGNE}" font-size="31" font-family="Georgia, serif" letter-spacing="10">PALMA</text>
  <text x="74" y="133" fill="${TAUPE}" font-size="11.5" font-family="Georgia, serif" letter-spacing="4.5">THE TROPHIES · FRONT ELEVATION · CAST BRONZE AND ENGLISH OAK</text>
  <line x1="74" y1="156" x2="${W - 74}" y2="156" stroke="${RULE}" stroke-width="1"/>

  <line x1="160" y1="${GROUND}" x2="${W - 160}" y2="${GROUND}" stroke="${RULE}" stroke-width="1.4"/>

  ${a.svg}${b.svg}${c.svg}

  ${dimV({ x: P1.cx - 176, y1: a.top, y2: GROUND, label: '400' })}
  ${dimV({ x: P2.cx - 136, y1: b.top, y2: GROUND, label: '265' })}
  ${dimV({ x: P3.cx - 112, y1: c.top, y2: GROUND, label: '112' })}

  ${label({
    x: P1.cx - 176,
    y: GROUND + 62,
    title: 'THE PALMA',
    lines: [
      'One a year. The whole palm, four frond',
      'pairs, and the crown held clear on a',
      'tapered needle. 2.9 kg.',
    ],
  })}
  ${label({
    x: P2.cx - 136,
    y: GROUND + 62,
    title: 'CATEGORY PALMA',
    lines: [
      'The same palm, no crown. That is the',
      'hierarchy, and it reads across a room.',
      '1.4 kg.',
    ],
  })}
  ${label({
    x: P3.cx - 112,
    y: GROUND + 62,
    title: 'FINALIST',
    lines: ['One frond, socketed and rising.', 'Part of the palm, honestly. 0.4 kg.'],
  })}

  <text x="74" y="${H - 74}" fill="${TAUPE}" font-size="12" font-family="Georgia, serif">Every frond tapers from the spine to a closed point. Upper faces mirror-polished, undersides left dark: the palm lights from above.</text>
  <text x="${W - 74}" y="${H - 74}" fill="${TAUPE}" font-size="11" text-anchor="end" font-family="ui-monospace, Menlo, monospace" letter-spacing="1">MILLIMETRES</text>
</svg>`;

writeFileSync(`${DIR}/palma-trophies.svg`, svg);
await sharp(Buffer.from(svg), { density: 200 }).png().toFile(`${DIR}/palma-trophies.png`);
console.log('ok');
