// Numeric helpers: clamp, colour mixing, easing curves.

export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const parseRgb = (s) => (s.match(/[\d.]+/g) || [0, 0, 0]).slice(0, 3).map(Number);
export const mix = (a, b, t) => [
  Math.round(a[0] + (b[0] - a[0]) * t),
  Math.round(a[1] + (b[1] - a[1]) * t),
  Math.round(a[2] + (b[2] - a[2]) * t),
];
export const easeOutQuad = (u) => 1 - (1 - u) * (1 - u);
export const easeOutCubic = (u) => 1 - Math.pow(1 - u, 3);
export const easeInOutSine = (u) => -(Math.cos(Math.PI * u) - 1) / 2;
