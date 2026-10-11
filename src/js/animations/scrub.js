// Scroll-linked progress (like GSAP ScrollTrigger scrub) using "edge_edge" start/end positions.
import { subscribe } from '../core/ticker.js';

function progressOf(el, start, end, vh) {
  const bb = el.getBoundingClientRect();
  const poses = {
    top_top: bb.top,
    center_top: bb.top + bb.height / 2,
    bottom_top: bb.bottom,
    top_bottom: bb.top - vh,
    center_bottom: bb.top + bb.height / 2 - vh,
    bottom_bottom: bb.bottom - vh,
    top_center: bb.top - vh / 2,
    center_center: bb.top + bb.height / 2 - vh / 2,
    bottom_center: bb.bottom - vh / 2,
  };
  const scrollStart = poses[start],
    scrollEnd = poses[end];
  const length = Math.abs(scrollStart - scrollEnd) || 1;
  return Math.min(Math.max(0, 1 - (scrollStart + length) / length), 1);
}
const scrubs = new Set();
export function scrub(el, start, end, fn) {
  const s = { el, start, end, fn, on: false, tail: 10 };
  scrubs.add(s);
  new IntersectionObserver((es) => {
    s.on = es[es.length - 1].isIntersecting;
    if (!s.on) s.tail = 10;
  }).observe(el);
  fn(progressOf(el, start, end, window.innerHeight));
  return s;
}
subscribe(
  () => {
    const vh = window.innerHeight;
    for (const s of scrubs) {
      if (!s.on) {
        if (s.tail <= 0) continue;
        s.tail -= 1;
      }
      s.fn(progressOf(s.el, s.start, s.end, vh));
    }
  },
  () => 10,
);
