// One shared requestAnimationFrame loop. subscribe(cb, rate) runs cb(t, dt) every frame, or at most every rate() ms.

const subs = new Set();
let rafId = 0;
function loop(t) {
  rafId = requestAnimationFrame(loop);
  for (const s of [...subs]) {
    if (!subs.has(s)) continue;
    if (t - s.last > s.rate()) {
      const dt = s.last ? t - s.last : 16.67;
      s.last = t;
      s.cb(t, dt);
    }
  }
}
export function subscribe(cb, rate = () => 0) {
  const s = { cb, rate, last: 0 };
  subs.add(s);
  if (!rafId) rafId = requestAnimationFrame(loop);
  return () => {
    subs.delete(s);
    if (!subs.size && rafId) {
      cancelAnimationFrame(rafId);
      rafId = 0;
    }
  };
}
