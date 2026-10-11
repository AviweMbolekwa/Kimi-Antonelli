// "Message from Kimi": a pinned, scroll-driven beat between the hero and the season. The portrait shrinks into a
// framed card over an olive field, two quote marquees run behind it, then a slash and a signature draw in.
import { $, $$, REDUCED, mq } from '../utils/dom.js';
import { asset } from '../config.js';
import { clamp, easeInOutSine, easeOutCubic } from '../utils/math.js';
import { contour } from '../effects/contour.js';
import { loopInView } from '../animations/view-gates.js';

// Placeholder copy: swap in a real quote from Kimi.
const QUOTE = {
  top: 'every lap is a lesson — ',
  bottom: 'thank you for believing in me, this is only the beginning — ',
};
// Drawn in order over a 1000×600 box centred on the card. The first stroke is the slash.
const STROKES = [
  'M640 20L330 580',
  'M360 300C250 340 130 390 110 420C90 450 170 450 260 430C480 380 780 300 880 230C940 185 900 150 820 165C700 185 520 260 470 300',
  'M470 420C500 360 520 330 530 340C540 350 515 420 525 425C540 430 570 350 585 345C598 342 585 420 598 422C612 424 640 360 655 350C668 342 655 415 668 418C690 420 720 380 735 370',
  'M420 520C560 470 760 420 960 390',
];
// Scroll progress windows [from, to] for each beat of the pin.
const BEATS = {
  frame: [0, 0.3],
  light: [0.04, 0.26],
  marquee: [0.12, 0.32],
  strokes: [
    [0.32, 0.44],
    [0.5, 0.66],
    [0.66, 0.78],
    [0.78, 0.86],
  ],
  settle: [0.44, 0.7],
  label: [0.46, 0.56],
};
// Card size as a share of the viewport [width, height]: full bleed → framed → settled behind the signature.
const FRAMES = {
  wide: [
    [1, 1],
    [0.62, 0.64],
    [0.38, 0.4],
  ],
  narrow: [
    [1, 1],
    [0.86, 0.5],
    [0.72, 0.38],
  ],
};

const span = (p, [a, b]) => clamp((p - a) / (b - a));
const lerp = (a, b, t) => a + (b - a) * t;

export function initMessage() {
  const section = $('[data-message]');
  const layer = section.closest('.msg-layer');
  const next = layer.nextElementSibling;
  const row = (cls, text) =>
    `<div class="mq-row ${cls}"><div class="mq-track">${`<span>${text}</span>`.repeat(3)}</div></div>`;
  section.innerHTML = `
    <h2 class="sr-only" id="msg-h">Message from Kimi</h2>
    <p class="sr-only">${QUOTE.top} ${QUOTE.bottom}</p>
    <div class="msg-light" aria-hidden="true"></div>
    <canvas class="contour" aria-hidden="true"></canvas>
    <div class="msg-rows" aria-hidden="true">${row('serif', QUOTE.top)}${row('sans', QUOTE.bottom)}</div>
    <div class="msg-card" aria-hidden="true">
      <img src="${asset('hero/scene/person-diffuse.webp')}" alt="" decoding="async">
      <div class="msg-tint"></div>
    </div>
    <div class="msg-label" aria-hidden="true"><b>ka</b><span>message from kimi</span></div>
    <svg class="msg-sign" viewBox="0 0 1000 600" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      ${STROKES.map((d) => `<path d="${d}" pathLength="1"/>`).join('')}
    </svg>`;
  contour($('.contour', section), '--message-contour');

  const light = $('.msg-light', section),
    rows = $('.msg-rows', section),
    card = $('.msg-card', section),
    img = $('img', card),
    tint = $('.msg-tint', card),
    label = $('.msg-label', section);
  const tracks = $$('.mq-track', section);
  const strokes = $$('.msg-sign path', section);
  const narrow = mq('(max-width: 767px)');

  let unit = [1, 1];
  const measure = () => {
    unit = tracks.map((t) => t.firstElementChild.offsetWidth || 1);
  };
  new ResizeObserver(measure).observe(section);
  document.fonts?.ready.then(measure);
  measure();

  // Pin progress: 0 when the layer sticks to the top, 1 when the next layer starts to cover it.
  const progress = () => {
    const vh = window.innerHeight || 1;
    const total = layer.offsetHeight;
    const top = next.getBoundingClientRect().top;
    return { p: clamp((total - top) / Math.max(1, total - vh)), covered: top <= 0 };
  };

  const render = (t) => {
    const { p, covered } = progress();
    if (covered) return;
    const vw = section.clientWidth,
      vh = section.clientHeight;

    const [f0, f1, f2] = narrow.matches ? FRAMES.narrow : FRAMES.wide;
    const a = easeInOutSine(span(p, BEATS.frame)),
      b = easeInOutSine(span(p, BEATS.settle));
    const sx = b > 0 ? lerp(f1[0], f2[0], b) : lerp(f0[0], f1[0], a);
    const sy = b > 0 ? lerp(f1[1], f2[1], b) : lerp(f0[1], f1[1], a);
    const ix = ((1 - sx) * vw) / 2,
      iy = ((1 - sy) * vh) / 2;
    card.style.clipPath = `inset(${iy.toFixed(1)}px ${ix.toFixed(1)}px)`;
    img.style.transform = `scale(${(1.08 - 0.08 * a).toFixed(4)})`;
    img.style.filter = b > 0 ? `grayscale(${b.toFixed(3)}) contrast(${(1 - 0.15 * b).toFixed(3)})` : '';
    tint.style.opacity = `${(0.55 * b).toFixed(3)}`;

    light.style.opacity = `${1 - span(p, BEATS.light)}`;
    rows.style.opacity = `${easeOutCubic(span(p, BEATS.marquee))}`;
    label.style.opacity = `${span(p, BEATS.label)}`;
    label.style.transform = `translate(-50%, ${(1 - span(p, BEATS.label)) * 0.75}rem)`;

    // marquees: a slow drift plus a push from scroll, opposite directions
    const drift = REDUCED ? 0 : t * 0.04;
    const push = p * vw * 0.9;
    tracks.forEach((track, i) => {
      const w = unit[i];
      const x = (((drift + push) % w) + w) % w;
      track.style.transform = `translate3d(${i ? x - w : -x}px, 0, 0)`;
    });

    strokes.forEach((s, i) => {
      const u = easeInOutSine(span(p, BEATS.strokes[i]));
      s.style.strokeDashoffset = `${1 - u}`;
      s.style.opacity = u > 0 ? '1' : '0';
    });
  };
  render(performance.now());
  loopInView(section, render);
}
