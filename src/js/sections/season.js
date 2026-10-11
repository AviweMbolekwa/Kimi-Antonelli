// "The season so far": fitted map stage, lap animation, looping map details, copy reveals.
import { $, $$, COARSE } from '../utils/dom.js';
import { C, tween } from '../core/spring.js';
import { CIRCUIT_PATH } from '../data/circuit-path.js';
import { HUB, LAP_LENGTH } from '../data/track-map.js';
import { buildMapSvg } from '../season/map-svg.js';
import { chequer } from '../effects/chequer.js';
import { easeInOutSine, easeOutCubic, easeOutQuad, parseRgb } from '../utils/math.js';
import { grow, rise } from '../animations/entrances.js';
import { headLines, reveal } from '../animations/text.js';
import { initDots } from '../season/dots.js';
import { loopInView, onView } from '../animations/view-gates.js';
import { makeLap } from '../season/lap.js';
import { readToken } from '../utils/read-token.js';

export function initSeason() {
  const section = $('[data-season]');
  const col = $('.season-col', section);
  chequer(section, 'light', { before: col });

  // fit the stage
  const frameEl = $('.stage-frame', section),
    stage = $('.stage', section);
  let bx0 = Infinity,
    by0 = Infinity,
    bx1 = -Infinity,
    by1 = -Infinity;
  for (const [x, y] of CIRCUIT_PATH) {
    bx0 = Math.min(bx0, x);
    by0 = Math.min(by0, y);
    bx1 = Math.max(bx1, x);
    by1 = Math.max(by1, y);
  }
  const TRACK_BOX = { x: bx0 - 46, y: by0 - 46, width: bx1 - bx0 + 92, height: by1 - by0 + 92 };
  const fit = () => {
    const w = frameEl.clientWidth,
      h = frameEl.clientHeight;
    let s, tx, ty;
    if (window.innerWidth >= 1024) {
      s = Math.max(w / 1440, h / 800);
      tx = (w - 1440 * s) / 2;
      ty = (h - 800 * s) / 2;
    } else {
      s = w / TRACK_BOX.width;
      tx = w / 2 - (TRACK_BOX.x + TRACK_BOX.width / 2) * s;
      ty = h / 2 - (TRACK_BOX.y + TRACK_BOX.height / 2) * s;
    }
    stage.style.transform = `translate(${tx}px, ${ty}px) scale(${s})`;
  };
  new ResizeObserver(fit).observe(frameEl);
  fit();

  // the map
  const svg = $('.map', section);
  buildMapSvg(svg);
  const axes = $('.axes', svg),
    ping = $('.ping', svg),
    lapLine = $('.lap-line', svg);
  const meridian = $('.meridian', section);
  const dots = initDots($('.dots', section), section);

  // the lap
  const trace = $('.trace', section);
  const ratio = COARSE ? 1 : Math.min(window.devicePixelRatio || 1, 2);
  trace.width = 1440 * ratio;
  trace.height = 800 * ratio;
  const context = trace.getContext('2d');
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  const palette = {
    accent: parseRgb(readToken('--accent')),
    white: parseRgb(readToken('--foreground-on-dark')),
    bright: [236, 255, 160],
  };
  const lap = makeLap(context, palette);
  const showLap = (v) => {
    lap.render(v);
    const reveal = 1 - lap.distanceAtTime(v) / lap.TOTAL;
    lapLine.setAttribute('stroke-dashoffset', `${60 + reveal * LAP_LENGTH}`);
  };
  showLap(0);
  const lapObserver = new IntersectionObserver(
    (es) => {
      if (!es.some((e) => e.isIntersecting)) return;
      lapObserver.disconnect();
      tween(6000, easeInOutSine, showLap, () => {
        tween(
          800,
          easeOutCubic,
          (u) => {
            lap.setHeat(1 - u);
            lap.render(1);
          },
          () => dots.arm(),
        );
      });
    },
    { threshold: 0.35 },
  );
  lapObserver.observe(frameEl);

  // the loops: grid crawl, ping, globe, halftone
  loopInView(section, (t) => {
    axes.setAttribute('stroke-dashoffset', `${((t % 7000) / 7000) * 20.5}`);
    const v = easeOutQuad((t % 4200) / 4200);
    ping.setAttribute('r', `${HUB.r + v * 86}`);
    ping.setAttribute('opacity', `${0.4 * (1 - v) * (1 - v)}`);
    const turn = ((t % 10000) / 10000) * Math.PI * 2;
    meridian.setAttribute('rx', `${Math.max(0.5, Math.abs(Math.cos(turn)) * 18)}`);
    dots.frame();
  });

  // copy
  const head = headLines($('.s-head', section), ['the season', 'so far'], 'var(--foreground-on-dark)');
  const rule = grow($('.s-rule', section));
  const intro = reveal($('.s-intro', section), { stagger: 34, cfg: C.COPY_WORDS, gap: 0.22 });
  const plate = rise($('.splate', section));
  const wm = [
    reveal($('.wm .w1', section), { letters: true, stagger: 22, cfg: C.TYPE }),
    reveal($('.wm .w2', section), { letters: true, stagger: 22, cfg: C.TYPE }),
  ];
  const statRows = $$('.pstats > div', section).map((row) => ({
    fig: reveal($('dt', row), { letters: true, stagger: 22, cfg: C.TYPE }),
    words: reveal($('dd', row), { letters: true, stagger: 22, cfg: C.TYPE, gap: 0.3 }),
  }));
  onView(
    section,
    () => {
      head.play(0);
      rule.set(1, 2 * 130);
      intro.play(2 * 130 + 90);
      plate.set(1, 260);
      wm[0].play(430);
      wm[1].play(490);
      statRows.forEach((r, i) => {
        r.fig.play(430 + i * 110);
        r.words.play(430 + i * 110 + 70);
      });
    },
    () => {
      head.back();
      rule.set(0);
      intro.back();
      plate.set(0);
      wm.forEach((x) => x.back());
      statRows.forEach((r) => {
        r.fig.back();
        r.words.back();
      });
    },
    { threshold: 0.2 },
  );
}
