// "From the paddock": contour backdrop, portrait parallax, stats panels and the race calendar strip.
import { $, $$ } from '../utils/dom.js';
import { ARROW } from '../utils/markup.js';
import { C, Spring } from '../core/spring.js';
import { chequer } from '../effects/chequer.js';
import { clamp, easeOutQuad } from '../utils/math.js';
import { contour } from '../effects/contour.js';
import { fade, grow, rise } from '../animations/entrances.js';
import { headLines, reveal } from '../animations/text.js';
import { hydrateImages } from '../core/asset-errors.js';
import { loopInView, onView } from '../animations/view-gates.js';
import { px, type } from '../utils/css-units.js';
import { scrub } from '../animations/scrub.js';

const BRACKET_PATH = 'M0 0.5H10V10.5';
function bracketSet({
  left,
  right,
  top,
  bottom,
  size,
  color,
  spread = 'var(--bracket-spread, 0px)',
  stretch = '0px',
  cls = '',
}) {
  const corner = (l, t, rot) =>
    `<svg class="brk ${cls}" viewBox="0 0 10.5 10.5" style="left:${l};top:${t};width:${size};height:${size};transform:rotate(${rot}deg);stroke:${color}" aria-hidden="true"><path d="${BRACKET_PATH}" vector-effect="non-scaling-stroke"/></svg>`;
  return (
    corner(`calc(${left} - ${spread})`, `calc(${top} - ${spread})`, 270) +
    corner(`calc(${right} - ${size} + ${spread})`, `calc(${top} - ${spread})`, 0) +
    corner(`calc(${right} - ${size} + ${spread})`, `calc(${bottom} - ${size} + ${spread} + ${stretch})`, 90) +
    corner(`calc(${left} - ${spread})`, `calc(${bottom} - ${size} + ${spread} + ${stretch})`, 180)
  );
}
const CALENDAR = [
  { round: 'round 11', name: 'austrian gp', date: '29 jun', x: 347, w: 100, marker: 'p6' },
  { round: 'round 12', name: 'british gp', date: '12 jul', x: 511, w: 100, marker: 'p4' },
  { round: 'round 13', name: 'belgian gp', date: '27 jul', x: 675, w: 100, marker: 'live' },
  { round: 'round 14', name: 'hungarian gp', date: '03 aug', x: 839, w: 114, marker: 'ring' },
  { round: 'round 15', name: 'dutch gp', date: '31 aug', x: 1017, w: 76, marker: 'ring' },
];
const LINKS = [
  { x: 416, w: 126 },
  { x: 580, w: 128 },
  { x: 743, w: 136 },
  { x: 914, w: 124 },
];
const PADDOCK_STATS = [
  { icon: 'flag', label: 'last result', value: 'P4' },
  { icon: 'bars', label: 'points gained', value: '+12' },
  { icon: 'trophy', label: 'championship', value: 'P1' },
  { icon: 'gauge', label: 'points', value: '118' },
];

export function initPaddock() {
  const section = $('.pd');
  const U = 'var(--panel-u, calc(100cqw / 1440))';
  const u = (n) => `calc(${n} * ${U})`;
  const FRAME_RIGHT = 'calc(100% - 2.2222cqw)';
  const FRAME_LEFT = `calc(100% - 2.2222cqw - ${u(218)})`;
  const COLUMN_LEFT = `calc(100% - 2.2222cqw - ${u(12)} - ${u(193)})`;
  const drop = 'var(--stats-drop, 0px)';
  const spread = (x) => `calc(50% + ${px(x - 720)} * var(--cal-spread, 1))`;
  const markDrop = 'var(--cal-mark-drop, 0px)';

  const statRows = PADDOCK_STATS.map(
    (s, i) => `
    ${i ? `<div class="st-rule" style="margin:var(--stats-rule-top, ${u(24)}) 0 var(--stats-rule-bottom, ${u(23)})"></div>` : ''}
    <div class="st-row" style="height:${u(58)};gap:${u(24)}">
      <img data-src="paddock/icon-${s.icon}.svg" alt="" aria-hidden="true" style="width:${u(31)};height:${u(31)}">
      <div style="display:flex;flex-direction:column;gap:${u(12)}">
        <span class="muted" style="font-size:${u(12)};letter-spacing:${u(-0.48)}">${s.label}</span>
        <span class="fig" style="font-size:${u(38)};letter-spacing:${u(-3.04)}">${s.value}</span>
      </div>
    </div>`,
  ).join('');

  const links = LINKS.map(
    (l, i) =>
      `<div class="link" data-dir="${i < 2 ? 1 : -1}" style="left:${spread(l.x)};width:calc(${px(l.w)} * var(--cal-spread, 1));top:calc(${px(131.5)} + ${markDrop});background:repeating-linear-gradient(to right, var(--foreground-on-dark-muted) 0 ${px(7)}, transparent ${px(7)} ${px(11.45)})"></div>`,
  ).join('');
  const cards = CALENDAR.map(
    (c, i) => `
    <div class="card ${c.marker === 'live' ? 'live' : ''} ${i < 2 ? 'early' : ''}" style="left:calc(${spread(c.x + c.w / 2)} - ${px(c.w / 2)});top:calc(${px(43)} + var(--cal-card-drop, 0px));width:var(--cal-card-w, ${px(c.w)});gap:${type(12)}">
      <span style="font-size:${type(12)};letter-spacing:${px(-0.24)}">${c.round}</span>
      <span class="nm" style="font-size:max(${type(18)}, var(--copy-min-size, 0px))">${c.name}</span>
      <span style="font-size:${type(14)};letter-spacing:${px(-0.28)}">${c.date}</span>
    </div>`,
  ).join('');
  const markers = CALENDAR.map((c) => {
    let inner;
    if (c.marker === 'live')
      inner = `<svg viewBox="0 0 11 11" style="width:${px(11)};height:${px(11)}"><circle class="pulse" cx="5.5" cy="5.5" r="5.5" fill="none" vector-effect="non-scaling-stroke" style="stroke:var(--accent)" opacity="0"/><circle cx="5.5" cy="5.5" r="5.5" style="fill:var(--accent)"/></svg>`;
    else if (c.marker === 'ring')
      inner = `<svg viewBox="0 0 11 11" style="width:${px(11)};height:${px(11)}"><circle cx="5.5" cy="5.5" r="5" fill="none" stroke="#fff" vector-effect="non-scaling-stroke"/></svg>`;
    else inner = `<b style="font-size:${type(12)}">${c.marker}</b>`;
    return `<div class="mark" style="left:${spread(c.x + c.w / 2)};top:calc(${px(126)} + ${markDrop})">${inner}</div>`;
  }).join('');

  section.innerHTML = `
    <canvas class="contour" aria-hidden="true"></canvas>
    <div class="pd-band" aria-hidden="true"></div>
    <div class="pd-fig"><div class="pd-fig-in"><img data-src="paddock/portrait.webp" alt="Kimi Antonelli in the paddock"></div></div>
    <div class="pd-melt" aria-hidden="true"></div>
    <h2 class="pd-head disp" id="pd-h"></h2>
    <div class="pd-intro">
      <p>A composed drive through a difficult weekend secured another podium — and kept Kimi at the top of the championship.</p>
      <a class="cta2" href="/stories/hungarian-gp">
        <svg class="frame" viewBox="0 0 217 50" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0.5 0.5H216.5V42L209 49.5H0.5Z" style="fill:var(--surface-black);stroke:var(--accent)" vector-effect="non-scaling-stroke"/>
          <path class="flood" d="M0.5 0.5H216.5V42L209 49.5H0.5Z" style="fill:var(--accent)"/>
        </svg>
        <span class="inner"><span class="lbl">read story</span>${ARROW}</span>
      </a>
    </div>
    <div class="pd-panels">
      <div class="meet-brk" style="opacity:0">${bracketSet({ left: `var(--meet-frame-left, ${FRAME_LEFT})`, right: `var(--meet-frame-right, ${FRAME_RIGHT})`, top: `var(--meet-frame-top, ${u(32)})`, bottom: `var(--meet-frame-bottom, ${u(105)})`, size: u(10), color: 'var(--foreground)' })}</div>
      <div class="pd-col meet" style="left:var(--meet-left, ${COLUMN_LEFT});top:var(--meet-top, ${u(43)});width:${u(193)};gap:${u(6)};font-size:${u(14)};opacity:0">
        <b>hungarian gp</b><span>silverstone</span><span>july 12, 2026</span>
      </div>
      <div class="stats-brk" style="opacity:0">${bracketSet({ left: `var(--stats-frame-left, ${FRAME_LEFT})`, right: `var(--stats-frame-right, ${FRAME_RIGHT})`, top: `calc(${u(137)} + ${drop})`, bottom: `calc(${u(535)} + ${drop})`, size: u(10), color: 'var(--foreground)', stretch: 'var(--stats-stretch, 0px)' })}</div>
      <div class="pd-col stats-col" style="left:var(--stats-left, ${COLUMN_LEFT});top:calc(${u(147)} + ${drop});width:var(--stats-col-w, ${u(193)})">${statRows}</div>
    </div>
    <div class="strip">
      ${links}${cards}${markers}
      <div class="live-brk">${bracketSet({ left: spread(669), right: spread(781), top: `calc(${px(32)} + var(--bracket-drop, 0px))`, bottom: `calc(${px(113)} + var(--bracket-drop, 0px))`, size: px(10), color: 'var(--accent)', stretch: 'var(--bracket-stretch, 0px)' })}</div>
    </div>`;
  hydrateImages(section);
  contour($('.contour', section), '--paddock-contour');
  chequer(section, 'dark', { before: $('.pd-head', section), extraClass: 'z30' });

  const figIn = $('.pd-fig-in', section);
  scrub(section, 'top_bottom', 'bottom_top', (p) => {
    figIn.style.top = `${(-3.3333 * p).toFixed(4)}cqw`;
  });

  // intro + panels
  const head = headLines($('.pd-head', section), ['from the', 'paddock'], 'var(--accent)');
  const report = reveal($('.pd-intro p', section), { stagger: 30, cfg: C.COPY_WORDS, gap: 0.22 });
  const button = rise($('.cta2', section));
  const meetBrk = fade($('.meet-brk', section));
  const meetCol = rise($('.meet', section));
  const statsBrk = fade($('.stats-brk', section));
  const rules = $$('.st-rule', section).map((r) => grow(r));
  const rowEls = $$('.st-row', section);
  const rowRises = rowEls.map((r) => rise(r));
  const figs = rowEls.map((r) => reveal($('.fig', r), { letters: true, stagger: 24, cfg: C.FIGURE }));
  onView(
    section,
    () => {
      head.play(0);
      report.play(2 * 130 + 90);
      button.set(1, 2 * 130 + 260);
      meetBrk.set(1, 320);
      meetCol.set(1, 410);
      statsBrk.set(1, 460);
      rowEls.forEach((_, i) => {
        const at = 460 + i * 90;
        if (i) rules[i - 1].set(1, at);
        rowRises[i].set(1, at + 40);
        figs[i].play(at + 120);
      });
    },
    () => {
      head.back();
      report.back();
      button.set(0);
      meetBrk.set(0);
      meetCol.set(0);
      statsBrk.set(0);
      rules.forEach((r) => r.set(0));
      rowRises.forEach((r) => r.set(0));
      figs.forEach((f) => f.back());
    },
    { threshold: 0.15 },
  );

  // the calendar strip
  const strip = $('.strip', section);
  const linkEls = $$('.link', strip);
  const linkGrow = linkEls.map(
    (l) =>
      new Spring(0, C.ROW, (p) => {
        l.style.transform = `scaleX(${clamp(p)})`;
      }),
  );
  const cardEls = $$('.card', strip);
  const cardRise = cardEls.map((c) => rise(c, { y: 0.5, cfg: C.ROW }));
  const nameRise = cardEls.map((c) => rise($('.nm', c), { y: 0.3, unit: 'em', cfg: C.NAME }));
  const markFade = $$('.mark', strip).map((m) => fade(m, C.ROW));
  const liveBrk = fade($('.live-brk', strip), C.ROW);
  onView(
    strip,
    () => {
      linkGrow.forEach((s, i) => s.set(1, 560 + i * 90));
      cardRise.forEach((s, i) => s.set(1, 560 + i * 90));
      nameRise.forEach((s, i) => s.set(1, 560 + i * 90 + 110));
      markFade.forEach((s, i) => s.set(1, 560 + i * 90 + 60));
      liveBrk.set(1, 560 + 5 * 90);
    },
    null,
    { rootMargin: '0% 0% -20% 0%', once: true },
  );
  const live = $('.card.live', strip);
  live.addEventListener('mouseenter', () => strip.style.setProperty('--bracket-spread', px(5)));
  live.addEventListener('mouseleave', () => strip.style.removeProperty('--bracket-spread'));
  const pulse = $('.pulse', strip);
  loopInView(strip, (t) => {
    linkEls.forEach((l) => {
      const f = ((t % 5200) / 5200) * +l.dataset.dir;
      l.style.backgroundPositionX = `calc(${px(11.45)} * ${f.toFixed(4)})`;
    });
    const v = easeOutQuad((t % 3200) / 3200);
    pulse.setAttribute('r', `${5.5 + v * 5.5 * 3.4}`);
    pulse.setAttribute('opacity', `${0.5 * (1 - v) * (1 - v)}`);
  });
}
