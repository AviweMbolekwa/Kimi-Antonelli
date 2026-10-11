// "Message from Kimi": the hero layer stays pinned for a few viewports. Over that scroll the hero itself shrinks into
// a framed card over a dark contour field, its UI fades out, two quote marquees run behind it, then a slash and a
// signature draw in over it.
import { $, $$, REDUCED, mq } from '../utils/dom.js';
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
  ui: [0, 0.12],
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
// Card size as a share of the viewport [width, height] (full bleed → framed → settled behind the signature),
// and where the card's centre ends up vertically (the face sits above centre on desktop, below it on phones).
const FRAMES = {
  wide: { sizes: [[1, 1], [0.62, 0.64], [0.38, 0.4]], centre: 0.46 },
  narrow: { sizes: [[1, 1], [0.86, 0.5], [0.72, 0.38]], centre: 0.56 },
};

const span = (p, [a, b]) => clamp((p - a) / (b - a));
const lerp = (a, b, t) => a + (b - a) * t;

export function initHeroMessage() {
  const hero = $('[data-hero]');
  const inner = hero.parentElement;
  const layer = inner.closest('[data-layer]');
  const next = layer.nextElementSibling;
  const col = $('.hero-col', hero);

  const row = (cls, text) =>
    `<div class="mq-row ${cls}"><div class="mq-track">${`<span>${text}</span>`.repeat(3)}</div></div>`;
  hero.insertAdjacentHTML(
    'beforebegin',
    `<canvas class="msg-contour" aria-hidden="true"></canvas>
    <div class="msg-rows" aria-hidden="true">${row('serif', QUOTE.top)}${row('sans', QUOTE.bottom)}</div>`,
  );
  hero.insertAdjacentHTML('beforeend', `<div class="msg-tint" aria-hidden="true"></div>`);
  hero.insertAdjacentHTML(
    'afterend',
    `<aside class="msg-copy sr-only" aria-label="Message from Kimi"><p>${QUOTE.top} ${QUOTE.bottom}</p></aside>
    <div class="msg-label" aria-hidden="true"><b>ka</b><span>message from kimi</span></div>
    <svg class="msg-sign" viewBox="0 0 1000 600" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      ${STROKES.map((d) => `<path d="${d}" pathLength="1"/>`).join('')}
    </svg>`,
  );
  contour($('.msg-contour', inner), '--message-contour');

  const rows = $('.msg-rows', inner),
    tint = $('.msg-tint', hero),
    label = $('.msg-label', inner);
  const tracks = $$('.mq-track', inner);
  const strokes = $$('.msg-sign path', inner);
  const narrow = mq('(max-width: 767px)');

  let unit = [1, 1];
  const measure = () => {
    unit = tracks.map((t) => t.firstElementChild.offsetWidth || 1);
  };
  new ResizeObserver(measure).observe(inner);
  document.fonts?.ready.then(measure);
  measure();

  // Pin progress: 0 at the top of the page, 1 when the next layer starts to cover the hero.
  const progress = () => {
    const vh = window.innerHeight || 1;
    const total = layer.offsetHeight;
    const top = next.getBoundingClientRect().top;
    return { p: clamp((total - top) / Math.max(1, total - vh)), covered: top <= 0 };
  };

  let last = -1;
  const render = (t) => {
    const { p, covered } = progress();
    if (covered) return;
    const vw = inner.clientWidth,
      vh = hero.clientHeight;

    // marquees: a slow drift plus a push from scroll, opposite directions
    rows.style.opacity = `${easeOutCubic(span(p, BEATS.marquee))}`;
    if (p > 0) {
      const drift = REDUCED ? 0 : t * 0.04;
      const push = p * vw * 0.9;
      tracks.forEach((track, i) => {
        const w = unit[i];
        const x = (((drift + push) % w) + w) % w;
        track.style.transform = `translate3d(${i ? x - w : -x}px, 0, 0)`;
      });
    }
    if (p === last) return;
    last = p;

    const { sizes, centre } = narrow.matches ? FRAMES.narrow : FRAMES.wide;
    const [f0, f1, f2] = sizes;
    const a = easeInOutSine(span(p, BEATS.frame)),
      b = easeInOutSine(span(p, BEATS.settle));
    const sx = b > 0 ? lerp(f1[0], f2[0], b) : lerp(f0[0], f1[0], a);
    const sy = b > 0 ? lerp(f1[1], f2[1], b) : lerp(f0[1], f1[1], a);
    const cy = lerp(0.5, centre, (1 - sy) / (1 - f2[1]));
    const ix = ((1 - sx) * vw) / 2;
    const top = (cy - sy / 2) * vh,
      bottom = (1 - cy - sy / 2) * vh;
    hero.style.clipPath = p > 0 ? `inset(${top.toFixed(1)}px ${ix.toFixed(1)}px ${bottom.toFixed(1)}px)` : '';
    hero.style.filter = b > 0 ? `grayscale(${b.toFixed(3)})` : '';
    tint.style.opacity = `${(0.5 * b).toFixed(3)}`;
    col.style.opacity = `${1 - span(p, BEATS.ui)}`;
    col.style.visibility = p >= BEATS.ui[1] ? 'hidden' : '';

    const l = span(p, BEATS.label);
    label.style.opacity = `${l}`;
    label.style.transform = `translate(-50%, ${(1 - l) * 0.75}rem)`;
    strokes.forEach((s, i) => {
      const u = easeInOutSine(span(p, BEATS.strokes[i]));
      s.style.strokeDashoffset = `${1 - u}`;
      s.style.opacity = u > 0 ? '1' : '0';
    });
  };
  render(performance.now());
  loopInView(inner, render);
}
