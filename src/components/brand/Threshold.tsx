import { CHAMPAGNE, MARK_CROWN, MARK_PATHS, MARK_VIEWBOX } from './geometry';

/**
 * The threshold.
 *
 * Two ink panels covering the page, which part from the centreline to reveal
 * it, with the mark struck between them. Open sesame.
 *
 * **It is pure CSS, and that is the whole point.** A loading screen that waits
 * for JavaScript is not fast, it is a delay wearing a costume: the page would
 * have been readable sooner without it. This is in the server-rendered markup,
 * animates from the first paint, and never blocks anything. The page is fully
 * laid out underneath the entire time; the panels are a covering that leaves,
 * not a screen that has to finish before content can start.
 *
 * It runs on a page load, which is to say when somebody arrives at PALMA. It
 * does not run on navigation between pages: `template.tsx` handles those, and a
 * curtain on every click would be theatre rather than an entrance.
 *
 * Total 820ms, front-loaded. The panels are gone by 700ms; the rest is the
 * mark's own fade, which happens over ground the reader can already see.
 *
 * Under `prefers-reduced-motion` it is removed entirely rather than shortened.
 * A curtain nobody asked for is exactly the thing that setting means.
 */
export function Threshold() {
  return (
    <div className="palma-threshold" aria-hidden="true">
      <span className="palma-threshold-leaf" data-side="left" />
      <span className="palma-threshold-leaf" data-side="right" />
      <span className="palma-threshold-mark">
        <svg viewBox={MARK_VIEWBOX} width="48" height="56" fill="none">
          <g stroke={CHAMPAGNE} strokeWidth={1.4} strokeLinecap="round" fill="none">
            {MARK_PATHS.map((d) => (
              <path key={d} d={d} />
            ))}
            <circle cx={MARK_CROWN.cx} cy={MARK_CROWN.cy} r={MARK_CROWN.r} />
          </g>
        </svg>
      </span>
    </div>
  );
}
