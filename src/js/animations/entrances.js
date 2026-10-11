// Element entrances, each returning a Spring: call .set(1, delayMs) to play, .set(0) to reverse.
import { C, Spring } from '../core/spring.js';
import { clamp } from '../utils/math.js';

// {opacity 0, translateY(y)} → {1, 0}
export function rise(el, { y = 0.75, unit = 'rem', cfg = C.REVEAL } = {}) {
  return new Spring(0, cfg, (p) => {
    el.style.opacity = clamp(p);
    el.style.transform = `translateY(${(1 - p) * y}${unit})`;
  });
}
export function fade(el, cfg = C.REVEAL) {
  return new Spring(0, cfg, (p) => {
    el.style.opacity = clamp(p);
  });
}
export function grow(el, axis = 'X', cfg = C.REVEAL) {
  return new Spring(0, cfg, (p) => {
    el.style.opacity = clamp(p);
    el.style.transform = `scale${axis}(${Math.max(0, p)})`;
  });
}
