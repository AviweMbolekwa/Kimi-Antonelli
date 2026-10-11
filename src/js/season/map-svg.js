// Builds the season map SVG (grid, rings, track ribbon, lap mask, turn markers).
import {
  CORNER_MARKS,
  CORNER_MARK_SIZE,
  FLAG_CUT,
  FLAG_DIAMONDS,
  GRID_AXES_X,
  GRID_AXIS_Y,
  GRID_DASH,
  GRID_STROKE,
  HUB,
  LAP_CENTRELINE,
  LAP_LENGTH,
  LAP_MASK_WIDTH,
  RINGS,
  TRACK_RIBBON,
  TURNS,
  TURN_POINTS,
} from '../data/track-map.js';

export function buildMapSvg(svg) {
  const r = (v) => +v.toFixed(2);
  const overrun = 4000;
  const grid = [
    ...GRID_AXES_X.map((x) => `<line x1="${x}" y1="${-overrun}" x2="${x}" y2="${1440 + overrun}"/>`),
    `<line x1="${-overrun}" y1="${GRID_AXIS_Y}" x2="${2560 + overrun}" y2="${GRID_AXIS_Y}"/>`,
  ].join('');
  const rings = RINGS.map(
    (ring) =>
      `<circle cx="${HUB.x}" cy="${HUB.y}" r="${ring.r}" fill="none" stroke-width="${ring.width}" style="stroke:var(${ring.ghost ? '--map-grid-ghost' : '--map-grid'})"/>`,
  ).join('');
  const marks = CORNER_MARKS.map(
    ([x, y]) =>
      `<rect x="${r(x - CORNER_MARK_SIZE / 2)}" y="${r(y - CORNER_MARK_SIZE / 2)}" width="${CORNER_MARK_SIZE}" height="${CORNER_MARK_SIZE}" style="fill:var(--map-mark)"/>`,
  ).join('');
  const turns = TURNS.map(
    (t) =>
      `<polygon points="${TURN_POINTS}" transform="translate(${t.x} ${t.y}) rotate(${t.angle})" style="fill:var(--accent)"/>`,
  ).join('');
  const dashLength = LAP_LENGTH + 60;
  svg.innerHTML = `
    <defs>
      <mask id="flag-cut" maskUnits="userSpaceOnUse" x="-100" y="-100" width="2760" height="1640">
        <rect x="-100" y="-100" width="2760" height="1640" fill="#fff"/>
        <rect x="${-FLAG_CUT.along / 2}" y="${-FLAG_CUT.across / 2}" width="${FLAG_CUT.along}" height="${FLAG_CUT.across}" fill="#000" transform="translate(${FLAG_CUT.x} ${FLAG_CUT.y}) rotate(${FLAG_CUT.angle})"/>
      </mask>
      <mask id="lap-mask" maskUnits="userSpaceOnUse" x="-100" y="-100" width="2760" height="1640">
        <path class="lap-line" d="${LAP_CENTRELINE}" fill="none" stroke="#fff" stroke-width="${LAP_MASK_WIDTH}" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="${dashLength}" stroke-dashoffset="${60 + LAP_LENGTH}"/>
      </mask>
    </defs>
    <g id="grid">
      <g class="axes" fill="none" stroke-width="${GRID_STROKE}" stroke-dasharray="${GRID_DASH}" style="stroke:var(--map-grid)">${grid}</g>
      ${rings}
      <circle class="ping" cx="${HUB.x}" cy="${HUB.y}" r="${HUB.r}" fill="none" stroke-width="2.13" style="stroke:var(--accent)" opacity="0"/>
      ${marks}
      <circle cx="${HUB.x}" cy="${HUB.y}" r="${HUB.r}" style="fill:var(--map-mark)"/>
    </g>
    <g mask="url(#flag-cut)">
      <path d="${TRACK_RIBBON}" style="fill:var(--foreground-on-dark)"/>
      <path d="${TRACK_RIBBON}" style="fill:var(--accent)" mask="url(#lap-mask)"/>
    </g>
    <g id="markers">${turns}</g>
    <path d="${FLAG_DIAMONDS}" style="fill:var(--map-mark)"/>`;
}
