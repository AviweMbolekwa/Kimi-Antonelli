// Hero section: entrance choreography, HeroScene lifecycle, image fallback when WebGL is unavailable.
import { $, $$, mq } from '../utils/dom.js';
import { C } from '../core/spring.js';
import { DEFAULT_PARAMS, fitSubjectToBox } from '../hero-scene/constants.js';
import { HeroScene } from '../hero-scene/HeroScene.js';
import { asset } from '../config.js';
import { fade, rise } from '../animations/entrances.js';
import { hydrateImages, reportFailure } from '../core/asset-errors.js';
import { initVeil } from './veil.js';
import { reveal } from '../animations/text.js';
import { subscribe } from '../core/ticker.js';

export function initHero() {
  const section = $('[data-hero]');
  hydrateImages(section);
  $('.veil-helmet').style.setProperty('--hm', `url("${asset('hero/ui/helmet-mask.png')}")`);

  // entrance pieces
  const head = rise($('.hero-head'), { y: 1.25 });
  const id = fade($('.driver-id'));
  const name = reveal($('.hero-name'), { stagger: 110 });
  const metas = $$('.meta li').map((li) => rise(li));
  const panels = rise($('.hero-panels'), { y: 1.25 });
  const figures = $$('.stats dd').map((dd) => reveal(dd, { letters: true, stagger: 26, cfg: C.FIGURE }));
  const actions = rise($('.hero-actions'), { y: 1.25 });

  let scene = null;
  const handover = () => {
    head.set(1, 0);
    id.set(1, 180);
    name.play(180);
    metas.forEach((m, i) => m.set(1, 180 + 260 + i * 130));
    panels.set(1, 900);
    figures.forEach((f, i) => f.play(900 + i * 90));
    actions.set(1, 1500);
    scene?.beginRise();
  };
  const veil = initVeil(handover);

  // the scene
  const container = $('.hero-canvas');
  const canvas = $('canvas', container);
  const box = $('.hero-fit');
  const fallback = () => {
    container.style.display = 'none';
    const fb = $('.hero-fallback');
    fb.classList.add('on');
    hydrateImages(fb);
    const fig = document.createElement('img');
    fig.className = 'fig';
    fig.alt = '';
    fig.src = asset('hero/scene/person-diffuse.webp');
    (box.offsetParent ? box : fb).append(fig);
    veil.ready();
  };
  try {
    const probe = document.createElement('canvas');
    if (!(probe.getContext('webgl2') || probe.getContext('webgl'))) throw new Error('no webgl');
    scene = new HeroScene(canvas);
  } catch {
    fallback();
    return;
  }
  scene.onReady = () => veil.ready();
  scene.onError = (error) => {
    reportFailure(error?.message || 'hero scene');
    scene.dispose();
    scene = null;
    fallback();
  };

  const applyFit = () => {
    if (!scene) return;
    const s = section.getBoundingClientRect();
    let fit = null;
    if (box.offsetParent !== null) {
      const b = box.getBoundingClientRect();
      fit = fitSubjectToBox(DEFAULT_PARAMS, { top: b.top - s.top, height: b.height }, container.clientHeight);
    }
    scene.setParams({
      ...DEFAULT_PARAMS,
      ...fit,
      ...(mq('(max-width: 1023px)').matches ? { bgRevealOpacity: 0 } : null),
      ...(mq('(hover: none)').matches ? { autoSweepAmount: 0.76 } : null),
      ...(mq('(max-width: 639px)').matches
        ? { sweepRadius: 0.95, sweepWarp: 0.18, autoSweepAmount: 0.55 }
        : null),
      ...(scene.tier.reveal ? null : { autoSweepAmount: 0 }),
    });
  };
  const size = () => {
    if (!scene) return;
    scene.resize(container.clientWidth, container.clientHeight);
    applyFit();
  };
  size();

  let tier = scene.tier;
  let bound = false;
  const onMove = (e) =>
    scene?.setPointer((e.clientX / window.innerWidth) * 2 - 1, (e.clientY / window.innerHeight) * 2 - 1);
  const bindPointer = () => {
    if (tier.pointerEnabled && !bound) {
      window.addEventListener('pointermove', onMove, { passive: true });
      bound = true;
    } else if (!tier.pointerEnabled && bound) {
      window.removeEventListener('pointermove', onMove);
      bound = false;
    }
  };
  bindPointer();

  // the hero layer is pinned for the message beat, so it is only covered once the scroll passes its full height
  const layer = section.closest('[data-layer]');
  const COVERED_AFTER = 0.15;
  let inView = true,
    tail = 10;
  new IntersectionObserver((es) => {
    inView = es[es.length - 1].isIntersecting;
    if (!inView) tail = 10;
  }).observe(section);
  subscribe(
    (t) => {
      if (!scene || document.hidden) return;
      if (!inView) {
        if (tail <= 0) return;
        tail -= 1;
      }
      if (window.scrollY > layer.offsetHeight + window.innerHeight * COVERED_AFTER) return;
      scene.update(t);
    },
    () => tier.frameInterval,
  );

  let lastWidth = container.clientWidth,
    pending = 0;
  new ResizeObserver(() => {
    cancelAnimationFrame(pending);
    pending = requestAnimationFrame(() => {
      if (!scene) return;
      const w = container.clientWidth;
      const widthChanged = w !== lastWidth;
      if (!widthChanged && scene.tier.coarsePointer) return; // the iOS URL bar
      lastWidth = w;
      if (widthChanged) {
        tier = scene.retune();
        bindPointer();
      }
      size();
    });
  }).observe(container);
  mq('(hover: none) and (pointer: coarse)').addEventListener('change', () => {
    if (!scene) return;
    tier = scene.retune();
    bindPointer();
    applyFit();
  });
}
