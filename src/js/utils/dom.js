// DOM query helpers and media-query flags.

export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const mq = (q) => window.matchMedia(q);
export const REDUCED = mq('(prefers-reduced-motion: reduce)').matches;
export const COARSE = mq('(hover: none) and (pointer: coarse)').matches;
