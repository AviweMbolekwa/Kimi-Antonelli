// Spring physics (react-spring's solver), named spring presets (C), and a simple tween().
import { clamp } from '../utils/math.js';
import { subscribe } from './ticker.js';

const activeSprings = new Set();
let springLast = 0;
subscribe((t) => {
  const dt = springLast ? Math.min(64, t - springLast) : 16;
  springLast = t;
  for (const s of [...activeSprings]) if (!s.step(t, dt)) activeSprings.delete(s);
});
export class Spring {
  constructor(value, cfg, on, prec = 0.001) {
    this.value = value;
    this.velocity = 0;
    this.to = value;
    this.cfg = cfg;
    this.on = on;
    this.prec = prec;
    this.start = 0;
    this.tw = null;
    on?.(value);
  }
  set(to, delay = 0, cfg) {
    if (cfg) this.cfg = cfg;
    if (to === this.to && !activeSprings.has(this) && this.value === to) return this;
    this.to = to;
    this.start = performance.now() + delay;
    this.tw = null;
    activeSprings.add(this);
    return this;
  }
  step(t, dt) {
    if (t < this.start) return true;
    const c = this.cfg;
    if (c.duration != null) {
      if (!this.tw) this.tw = { from: this.value, t0: t };
      const u = clamp((t - this.tw.t0) / Math.max(c.duration, 1));
      this.value = this.tw.from + (this.to - this.tw.from) * (c.easing || ((x) => x))(u);
      this.on?.(this.value);
      if (u >= 1) {
        this.tw = null;
        return false;
      }
      return true;
    }
    const n = Math.ceil(dt);
    for (let i = 0; i < n; i += 1) {
      const spring = -c.tension * 0.000001 * (this.value - this.to);
      const damping = -c.friction * 0.001 * this.velocity;
      this.velocity += spring + damping;
      this.value += this.velocity;
    }
    const rest = Math.abs(this.velocity) < this.prec && Math.abs(this.to - this.value) < this.prec;
    if (rest) {
      this.value = this.to;
      this.velocity = 0;
    }
    this.on?.(this.value);
    return !rest;
  }
}
export const C = {
  REVEAL: { tension: 90, friction: 26 },
  ROW: { tension: 170, friction: 24 },
  SHEET: { tension: 190, friction: 26 },
  FIGURE: { tension: 200, friction: 24 },
  TYPE: { tension: 210, friction: 24 },
  YEAR: { tension: 190, friction: 24 },
  COPY: { tension: 110, friction: 26 },
  COPY_WORDS: { tension: 150, friction: 24 },
  NAME: { tension: 190, friction: 24 },
  VEIL: { tension: 70, friction: 24 },
  CLEAR: { tension: 140, friction: 26 },
  LABEL: { tension: 110, friction: 26 },
  WAITING: { tension: 10, friction: 30 },
  READY: { tension: 170, friction: 26 },
  YEAR_SETTLE: { tension: 32, friction: 26 },
  TRIGGER: { tension: 140, friction: 30 },
  PROGRESS: { tension: 170, friction: 26 },
};
export function tween(ms, ease, onUpdate, onDone) {
  const t0 = performance.now();
  const un = subscribe((t) => {
    const u = clamp((t - t0) / ms);
    onUpdate(ease(u));
    if (u >= 1) {
      un();
      onDone?.();
    }
  });
}
