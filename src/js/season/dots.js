// Interactive halftone dots: pointer reticle and optional wave light the dot lattice.
import { COARSE, REDUCED, mq } from '../utils/dom.js';
import { DOTS, DOT_LATTICE, DOT_RADIUS } from '../data/dots.js';
import { MAP_VIEW } from '../data/track-map.js';
import { mix, parseRgb } from '../utils/math.js';
import { readToken } from '../utils/read-token.js';

export function initDots(canvas, section) {
  const MAX_RATIO = COARSE ? 1 : 2;
  const MIN_LEVEL = 0.02,
    WAVE_ANGLE = (-20 * Math.PI) / 180,
    POINTER_HEAT = 0.95;
  const RETICLE_OPEN = 420,
    RETICLE_SETTLE = 900,
    SPREAD_OPEN = 0.38,
    SPREAD_SHUT = 0.09;
  const RETICLE_ARM = 0.82,
    RETICLE_CORE = 54,
    POINTER_TRAIL = 0.07,
    POINTER_RISE = 0.14,
    POINTER_FALL = 0.3;
  const CHEQUER_FILL = 1,
    CHEQUER_SEED = 0.7;
  const P = { threshold: 0.34, radius: 170, waveSpeed: 0.16, fade: 0.9, source: 'none' };
  const approach = (from, to, dt, tau) => from + (to - from) * (1 - Math.exp(-dt / Math.max(tau, 1e-4)));
  const falloff = (t) => {
    if (t >= 1) return 0;
    const u = 1 - t;
    return u * u;
  };
  const css = ([r, g, b]) => `rgb(${r} ${g} ${b})`;
  const palette = {
    dot: parseRgb(readToken('--map-dot')),
    accent: parseRgb(readToken('--accent')),
    white: parseRgb(readToken('--foreground-on-dark')),
    bright: [141, 243, 250],
  };

  const { columns, rows, points, count } = DOTS;
  // the lattice index
  let minI = Infinity,
    maxI = -Infinity,
    minJ = Infinity,
    maxJ = -Infinity;
  for (let i = 0; i < count; i += 1) {
    if (columns[i] < minI) minI = columns[i];
    if (columns[i] > maxI) maxI = columns[i];
    if (rows[i] < minJ) minJ = rows[i];
    if (rows[i] > maxJ) maxJ = rows[i];
  }
  const w = maxI - minI + 1,
    h = maxJ - minJ + 1;
  const cell = new Int32Array(w * h).fill(-1);
  for (let i = 0; i < count; i += 1) cell[(rows[i] - minJ) * w + (columns[i] - minI)] = i;
  const dx = Math.cos(WAVE_ANGLE),
    dy = Math.sin(WAVE_ANGLE);
  const projection = new Float32Array(count);
  for (let i = 0; i < count; i += 1) projection[i] = points[i * 2] * dx + points[i * 2 + 1] * dy;
  const order = Array.from({ length: count }, (_, i) => i).sort((a, b) => projection[a] - projection[b]);
  const sorted = new Int32Array(order);
  const sortedProjection = Float32Array.from(order, (i) => projection[i]);
  const projectionMin = sortedProjection[0],
    projectionMax = sortedProjection[count - 1];

  const level = new Float32Array(count),
    active = new Int32Array(count),
    inList = new Uint8Array(count);
  let activeCount = 0,
    baked = null,
    dirty = false,
    spread = 0,
    phase = 0,
    last = 0,
    armed = false;
  const pointer = { x: 0, y: 0, heat: 0 },
    target = { x: 0, y: 0, on: false };

  const draw = () => {
    if (!baked || !canvas.width) return;
    const context = canvas.getContext('2d');
    const scale = canvas.width / MAP_VIEW.width;
    context.setTransform(scale, 0, 0, scale, 0, 0);
    context.clearRect(0, 0, MAP_VIEW.width, MAP_VIEW.height);
    context.drawImage(baked, 0, 0, MAP_VIEW.width, MAP_VIEW.height);
    const box = DOT_RADIUS * 2 + 1;
    const span = 1 - P.threshold || 1;
    let drew = 0;
    for (let k = 0; k < activeCount; k += 1) {
      const idx = active[k];
      if (level[idx] < P.threshold) continue;
      context.clearRect(points[idx * 2] - DOT_RADIUS - 0.5, points[idx * 2 + 1] - DOT_RADIUS - 0.5, box, box);
      drew += 1;
    }
    if (!drew) return;
    for (let k = 0; k < activeCount; k += 1) {
      const idx = active[k];
      const value = level[idx];
      if (value < P.threshold) continue;
      if ((columns[idx] + rows[idx]) & 1) continue;
      const t = Math.min(1, (value - P.threshold) / span);
      const side = DOT_LATTICE.pitchX * (CHEQUER_SEED + (CHEQUER_FILL - CHEQUER_SEED) * t);
      context.fillStyle = css(
        value > 0.8
          ? palette.white
          : value > 0.5
            ? palette.bright
            : mix(palette.accent, palette.bright, value),
      );
      context.fillRect(points[idx * 2] - side / 2, points[idx * 2 + 1] - side / 2, side, side);
    }
  };

  const bake = () => {
    const width = canvas.clientWidth,
      height = canvas.clientHeight;
    if (!width || !height) return;
    const ratio = Math.min(window.devicePixelRatio || 1, MAX_RATIO);
    const bw = Math.round(width * ratio),
      bh = Math.round(height * ratio);
    if (canvas.width !== bw || canvas.height !== bh) {
      canvas.width = bw;
      canvas.height = bh;
    }
    baked = baked ?? document.createElement('canvas');
    baked.width = bw;
    baked.height = bh;
    const context = baked.getContext('2d');
    const scale = bw / MAP_VIEW.width;
    context.setTransform(scale, 0, 0, scale, 0, 0);
    context.clearRect(0, 0, MAP_VIEW.width, MAP_VIEW.height);
    context.fillStyle = css(palette.dot);
    context.beginPath();
    for (let i = 0; i < count; i += 1) {
      const x = points[i * 2],
        y = points[i * 2 + 1];
      context.moveTo(x + DOT_RADIUS, y);
      context.arc(x, y, DOT_RADIUS, 0, Math.PI * 2);
    }
    context.fill();
    dirty = true;
    draw();
  };

  const add = (i, value) => {
    if (value <= MIN_LEVEL) return;
    if (value > level[i]) level[i] = value;
    if (!inList[i]) {
      inList[i] = 1;
      active[activeCount] = i;
      activeCount += 1;
    }
  };
  const addPoint = (source, reach) => {
    if (source.heat <= 0.01) return;
    const i0 = Math.floor((source.x - reach - DOT_LATTICE.originX) / DOT_LATTICE.pitchX);
    const i1 = Math.ceil((source.x + reach - DOT_LATTICE.originX) / DOT_LATTICE.pitchX);
    const j0 = Math.floor((source.y - reach - DOT_LATTICE.originY) / DOT_LATTICE.pitchY);
    const j1 = Math.ceil((source.y + reach - DOT_LATTICE.originY) / DOT_LATTICE.pitchY);
    for (let j = Math.max(minJ, j0); j <= Math.min(minJ + h - 1, j1); j += 1) {
      const row = (j - minJ) * w;
      for (let i = Math.max(minI, i0); i <= Math.min(minI + w - 1, i1); i += 1) {
        const idx = cell[row + (i - minI)];
        if (idx < 0) continue;
        const d = Math.hypot(points[idx * 2] - source.x, points[idx * 2 + 1] - source.y);
        add(idx, falloff(d / reach) * source.heat);
      }
    }
  };
  const addReticle = (source) => {
    if (source.heat <= 0.01) return;
    const ci = Math.round((source.x - DOT_LATTICE.originX) / DOT_LATTICE.pitchX);
    const cj = Math.round((source.y - DOT_LATTICE.originY) / DOT_LATTICE.pitchY);
    const arm = RETICLE_ARM * source.heat;
    const reach = RETICLE_OPEN * spread;
    if (reach > 1 && cj >= minJ && cj < minJ + h) {
      const row = (cj - minJ) * w;
      const spanCols = Math.ceil(reach / DOT_LATTICE.pitchX);
      for (let i = Math.max(minI, ci - spanCols); i <= Math.min(minI + w - 1, ci + spanCols); i += 1) {
        const idx = cell[row + (i - minI)];
        if (idx < 0) continue;
        add(idx, (1 - Math.abs(points[idx * 2] - source.x) / reach) * arm);
      }
    }
    if (reach > 1 && ci >= minI && ci < minI + w) {
      const spanRows = Math.ceil(reach / DOT_LATTICE.pitchY);
      for (let j = Math.max(minJ, cj - spanRows); j <= Math.min(minJ + h - 1, cj + spanRows); j += 1) {
        const idx = cell[(j - minJ) * w + (ci - minI)];
        if (idx < 0) continue;
        add(idx, (1 - Math.abs(points[idx * 2 + 1] - source.y) / reach) * arm);
      }
    }
    addPoint(source, RETICLE_CORE);
  };
  const light = (dt) => {
    addReticle(pointer);
    if (P.source === 'none') return;
    phase = (phase + dt * P.waveSpeed) % 1;
    const radius = Math.max(1, P.radius);
    const spanP = projectionMax - projectionMin + radius * 2;
    const centre = projectionMin - radius + phase * spanP;
    const lo = centre - radius,
      hi = centre + radius;
    let a = 0,
      b = sortedProjection.length;
    while (a < b) {
      const m = (a + b) >> 1;
      if (sortedProjection[m] < lo) a = m + 1;
      else b = m;
    }
    for (let k = a; k < sortedProjection.length; k += 1) {
      if (sortedProjection[k] > hi) break;
      add(sorted[k], falloff(Math.abs(sortedProjection[k] - centre) / radius));
    }
  };

  const frame = () => {
    const now = performance.now();
    const dt = last ? Math.min(0.1, (now - last) / 1000) : 0;
    last = now;
    const wanted = target.on ? POINTER_HEAT : 0;
    if (pointer.heat <= 0.001 && wanted > 0) {
      pointer.x = target.x;
      pointer.y = target.y;
    } else if (dt > 0) {
      const px0 = pointer.x,
        py0 = pointer.y;
      pointer.x = approach(px0, target.x, dt, POINTER_TRAIL);
      pointer.y = approach(py0, target.y, dt, POINTER_TRAIL);
      const speed = Math.hypot(pointer.x - px0, pointer.y - py0) / dt;
      const wantedSpread = Math.max(0, 1 - speed / RETICLE_SETTLE);
      spread = approach(spread, wantedSpread, dt, wantedSpread > spread ? SPREAD_OPEN : SPREAD_SHUT);
    }
    pointer.heat = approach(pointer.heat, wanted, dt, wanted > pointer.heat ? POINTER_RISE : POINTER_FALL);
    if (pointer.heat < 0.005) {
      pointer.heat = 0;
      spread = 0;
    }

    const decay = Math.exp(-dt / Math.max(0.05, P.fade / 3));
    let write = 0;
    for (let k = 0; k < activeCount; k += 1) {
      const idx = active[k];
      const value = level[idx] * decay;
      if (value > MIN_LEVEL) {
        level[idx] = value;
        active[write] = idx;
        write += 1;
      } else {
        level[idx] = 0;
        inList[idx] = 0;
      }
    }
    const before = activeCount;
    activeCount = write;
    light(dt);
    if (activeCount === 0 && before === 0 && !dirty) return;
    dirty = false;
    draw();
  };

  const canLight = !mq('(hover: none)').matches && !REDUCED;
  if (canLight) {
    window.addEventListener(
      'pointermove',
      (e) => {
        if (!armed || e.pointerType !== 'mouse') return;
        const s = section.getBoundingClientRect();
        const inside =
          e.clientX >= s.left && e.clientX <= s.right && e.clientY >= s.top && e.clientY <= s.bottom;
        const r = canvas.getBoundingClientRect();
        target.x = ((e.clientX - r.left) / r.width) * MAP_VIEW.width;
        target.y = ((e.clientY - r.top) / r.height) * MAP_VIEW.height;
        target.on = inside;
      },
      { passive: true },
    );
    document.documentElement.addEventListener('pointerleave', () => {
      target.on = false;
    });
    window.addEventListener('blur', () => {
      target.on = false;
    });
  }
  new ResizeObserver(bake).observe(canvas);
  return {
    frame,
    arm() {
      armed = true;
    },
  };
}
