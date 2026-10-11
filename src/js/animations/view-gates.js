// IntersectionObserver helpers: play on enter / reverse on leave, and run a loop only while visible.
import { subscribe } from '../core/ticker.js';

// mode "forward": plays in on entry; holds once scrolled past; reverses only when the block drops back below.
export function onView(el, enter, leave, { rootMargin = '0px', once = false, threshold = 0 } = {}) {
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          enter();
          if (once) io.disconnect();
        } else if (leave && e.boundingClientRect.top > 0) leave();
      }
    },
    { rootMargin, threshold },
  );
  io.observe(el);
}
// The "loop in view" rule: compute while visible, plus ten frames after.
export function loopInView(el, cb, rate = 0) {
  let un = null,
    tail = 0,
    visible = false;
  const start = () => {
    if (un) return;
    un = subscribe(
      (t, dt) => {
        if (!visible) {
          tail -= 1;
          if (tail < 0) {
            un();
            un = null;
            return;
          }
        }
        cb(t, dt);
      },
      () => rate,
    );
  };
  new IntersectionObserver((es) => {
    visible = es[es.length - 1].isIntersecting;
    if (visible) start();
    else tail = 10;
  }).observe(el);
}
