// Loading veil: helmet silhouette fills while the 3D scene loads, then fades and hands over to the hero entrance.
import { $ } from '../utils/dom.js';
import { C, Spring } from '../core/spring.js';
import { clamp } from '../utils/math.js';
import { rise } from '../animations/entrances.js';

export function initVeil(onHandover) {
  const veil = $('.veil');
  const fill = $('.veil-fill'),
    meter = $('.veil-meter i'),
    track = $('.veil-meter'),
    content = $('.veil-content');
  const progress = new Spring(0, C.WAITING, (v) => {
    fill.style.transform = `scaleY(${v})`;
    meter.style.transform = `scaleX(${v})`;
  });
  progress.set(0.7);
  rise($('.veil-name'), { y: 0.6, cfg: C.LABEL }).set(1, 260);
  let done = false;
  return {
    ready() {
      if (done) return;
      done = true;
      veil.style.pointerEvents = 'none';
      veil.setAttribute('aria-label', 'Loaded');
      progress.set(1, 0, C.READY);
      new Spring(1, C.CLEAR, (v) => {
        content.style.opacity = clamp(v);
        content.style.transform = `translateY(${-(1 - v) * 0.75}rem)`;
        track.style.opacity = clamp(v);
      }).set(0);
      setTimeout(() => {
        new Spring(1, C.VEIL, (v) => {
          veil.style.opacity = clamp(v);
        }).set(0);
        onHandover();
        const t0 = performance.now();
        let removed = false;
        const remove = () => {
          if (!removed) {
            removed = true;
            veil.remove();
          }
        };
        setTimeout(remove, 3000);
        const poll = () => {
          if (removed) return;
          if (parseFloat(getComputedStyle(veil).opacity) <= 0.004 || performance.now() - t0 > 3000) {
            remove();
            return;
          }
          requestAnimationFrame(poll);
        };
        requestAnimationFrame(poll);
      }, 430 + 240);
    },
  };
}
