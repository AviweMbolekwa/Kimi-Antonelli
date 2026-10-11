// Chequered-flag dissolve: a canvas strip of squares that breaks up as a section scrolls in.
import { C, Spring } from '../core/spring.js';
import { clamp } from '../utils/math.js';
import { readToken } from '../utils/read-token.js';
import { scrub } from '../animations/scrub.js';

export function chequer(host, carry, { before = null, extraClass = '' } = {}) {
  const CELL = 24,
    SOLID_UNTIL = 0.16,
    LIFT = 2,
    ACCENT_SHARE = 0.06;
  const noise = (x, y) => {
    let h = Math.imul(x, 374761393) + Math.imul(y, 668265263);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
  };
  const canvas = document.createElement('canvas');
  canvas.className = `flag ${extraClass}`;
  canvas.setAttribute('aria-hidden', 'true');
  host.insertBefore(canvas, before);
  const context = canvas.getContext('2d');
  const accent = readToken('--accent');
  const surface = readToken(carry === 'light' ? '--background' : '--surface-black');
  let progress = 0;
  const render = () => {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const width = canvas.clientWidth,
      height = canvas.clientHeight;
    if (!width || !height) return;
    const w = Math.round(width * ratio),
      h = Math.round(height * ratio);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, width, height);
    const cell = parseFloat(getComputedStyle(canvas).getPropertyValue('--flag-cell')) || CELL;
    const columns = Math.ceil(width / cell),
      rows = Math.ceil(height / cell),
      lift = progress * LIFT;
    for (let y = 0; y < rows; y += 1) {
      const depth = y / Math.max(1, rows - 1) + lift;
      if (depth > 1) break;
      const solid = depth <= SOLID_UNTIL;
      const fadeOut = clamp(1 - (depth - SOLID_UNTIL) / (1 - SOLID_UNTIL));
      if (!solid && fadeOut <= 0) break;
      for (let x = 0; x < columns; x += 1) {
        if (!solid) {
          if ((x + y) % 2 !== 0) continue;
          if (noise(x, y) > fadeOut) continue;
        }
        context.fillStyle = !solid && noise(x + 101, y + 57) < ACCENT_SHARE ? accent : surface;
        context.fillRect(x * cell, y * cell, cell, cell);
      }
    }
  };
  const spring = new Spring(0, C.TRIGGER, (v) => {
    progress = v;
    render();
  });
  scrub(canvas, 'top_bottom', 'top_top', (p) => {
    if (Math.abs(p - spring.to) > 1e-4) spring.set(p);
  });
  new ResizeObserver(render).observe(canvas);
}
