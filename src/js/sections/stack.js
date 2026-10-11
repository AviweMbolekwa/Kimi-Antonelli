// Sticky stacked layers: each pinned layer scales down and darkens as the next one slides over it.
import { $, $$, mq } from '../utils/dom.js';

export function initStack() {
  const RECEDE_SCALE = 0.9;
  const RECEDE_SHADE = 0.55;
  const layers = $$('[data-layer]');
  const nexts = [...layers.slice(1), $('[data-layer-last]')];
  const pinned = layers.map((l, i) => ({
    inner: $('.layer-inner', l),
    shade: $('.shade', l),
    next: nexts[i],
  }));
  const phone = mq('(max-width: 639px)');
  let queued = 0;
  const apply = () => {
    queued = 0;
    const view = window.innerHeight || 1;
    const shrink = phone.matches ? 0 : 1 - RECEDE_SCALE;
    for (const { inner, shade, next } of pinned) {
      const p = Math.min(1, Math.max(0, 1 - next.getBoundingClientRect().top / view));
      inner.style.transform = p > 0 && shrink > 0 ? `scale(${1 - shrink * p})` : '';
      inner.style.willChange = p > 0 && shrink > 0 ? 'transform' : '';
      shade.style.opacity = `${RECEDE_SHADE * p}`;
      inner.style.visibility = p >= 1 ? 'hidden' : 'visible';
    }
  };
  const request = () => {
    if (!queued) queued = requestAnimationFrame(apply);
  };
  window.addEventListener('scroll', request, { passive: true });
  window.addEventListener('resize', request);
  apply();
}
