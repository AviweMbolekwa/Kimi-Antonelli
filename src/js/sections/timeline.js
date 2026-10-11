// "From karts to F1": timeline rows with parallax plates, year reveals and a scroll-driven rail.
import { $, $$, REDUCED, mq } from '../utils/dom.js';
import { C, Spring } from '../core/spring.js';
import { chequer } from '../effects/chequer.js';
import { clamp } from '../utils/math.js';
import { headLines, reveal } from '../animations/text.js';
import { hydrateImages } from '../core/asset-errors.js';
import { onView } from '../animations/view-gates.js';
import { px } from '../utils/css-units.js';
import { scrub } from '../animations/scrub.js';

const PLATE_OUTLINE =
  'M13.6168 0.497469H697.378C700.858 0.497469 704.195 1.38786 706.655 2.97277C709.115 4.55769 710.498 6.70729 710.498 8.94869V411.208C710.498 413.449 709.115 415.599 706.655 417.183C704.195 418.768 700.858 419.659 697.378 419.659H460.249C454.073 419.659 447.976 420.555 442.411 422.281C436.847 424.008 431.958 426.519 428.107 429.63L399.246 452.95C395.559 455.928 390.878 458.333 385.55 459.986C380.223 461.639 374.385 462.497 368.472 462.497H13.6168C10.1373 462.497 6.80038 461.607 4.34003 460.022C1.87968 458.437 0.497469 456.288 0.497469 454.046V8.94869C0.497469 6.70729 1.87968 4.55769 4.34003 2.97277C6.80038 1.38786 10.1373 0.497469 13.6168 0.497469Z';
const PARALLAX = { plate: { side: 60, centre: 20 }, copy: 110 };
const TIMELINE = [
  {
    year: 2012,
    frame: 'centre',
    lead: 'The first kart.',
    rest: 'At six, Kimi discovered karting — turning a childhood curiosity into something of his own.',
    w: 228,
    alt: 'Kimi in kart overalls in the paddock, aged six',
  },
  { year: 2015, frame: 'side', align: 'right', alt: 'Kimi holding a karting trophy at sunset' },
  {
    year: 2019,
    frame: 'centre',
    lead: 'Finding his people.',
    rest: 'Kimi joined the Mercedes Junior Programme, marking his first major step into professional motorsport.',
    w: 272,
    alt: 'Kimi signing with the Mercedes junior team',
  },
  { year: 2021, frame: 'side', align: 'left', alt: 'Kimi beside a single-seater in the garage' },
  {
    year: 2024,
    frame: 'centre',
    lead: 'The year everything changed.',
    rest: 'Formula 2 brought Kimi closer to F1, while Mercedes confirmed him as their future race driver.',
    w: 278,
    alt: 'Kimi walking the pit lane in Mercedes kit',
  },
  { year: 2025, frame: 'side', align: 'right', alt: 'Kimi in the Mercedes garage' },
  {
    year: 2026,
    frame: 'centre',
    lead: 'From karts to f1.',
    rest: 'Kimi is now racing at the highest level, with Bologna still his anchor — family, home and life beyond racing.',
    w: 284,
    alt: 'The Mercedes-AMG F1 car on track',
  },
];

export function initTimeline() {
  const section = $('.tline');
  const rows = TIMELINE.map(
    (e, i) => `
    <div class="row ${e.frame} ${e.align || ''} ${i % 2 ? 'odd' : ''}">
      <div class="lay" data-travel="${PARALLAX.plate[e.frame]}"><div class="lay-in">
        <div class="plate">
          <div class="pfill"><div class="pslot"><img data-src="timeline/${e.year}.webp" alt="${e.alt}" loading="lazy" decoding="async"></div></div>
          <svg class="poutline" viewBox="0 0 710.995 462.995" preserveAspectRatio="none" aria-hidden="true"><path d="${PLATE_OUTLINE}" vector-effect="non-scaling-stroke"/></svg>
        </div>
        <div class="year">${e.year}</div>
      </div></div>
      ${
        e.frame === 'centre'
          ? `<div class="lay" data-travel="${PARALLAX.copy}"><div class="lay-in">
        <p class="tcopy" style="width:min(max(${px(e.w)}, var(--copy-min-w, 0px)), var(--copy-max-w, 100vw))"><b>${e.lead}</b> ${e.rest}</p>
      </div></div>`
          : ''
      }
    </div>`,
  ).join('');
  section.innerHTML = `
    <h2 class="tl-head disp" id="tl-h"></h2>
    <div class="rail" aria-hidden="true"><svg preserveAspectRatio="none">
      <line class="r-solid" x1="8" x2="8" y1="0" y2="98" stroke-width="1" style="stroke:var(--timeline-rail)"/>
      <line class="r-dash" x1="8" x2="8" y1="102" y2="102" stroke-width="1" stroke-dasharray="6 6" style="stroke:var(--timeline-rail)"/>
      <rect class="r-run" x="7.5" y="0" width="1" height="0" style="fill:var(--foreground-on-dark)"/>
      <rect class="r-mark" x="-4.5" y="-4.5" width="9" height="9" style="fill:var(--foreground-on-dark)"/>
    </svg></div>
    <div class="tl-wrap">${rows}</div>`;
  hydrateImages(section);
  chequer(section, 'light', { before: $('.tl-wrap', section), extraClass: 'z30' });

  const head = headLines($('.tl-head', section), ['from karts', 'to f1'], 'var(--foreground-on-dark)');
  onView(
    section,
    () => head.play(0),
    () => head.back(),
    { threshold: 0.05 },
  );

  const canHover = mq('(hover: hover)').matches && !REDUCED;
  for (const row of $$('.row', section)) {
    const centre = row.classList.contains('centre');
    for (const lay of $$('.lay', row)) {
      const inner = $('.lay-in', lay);
      const travel = +lay.dataset.travel;
      scrub(row, 'top_bottom', 'bottom_top', (p) => {
        inner.style.top = px(travel * (1 - 2 * p));
      });
    }
    const plate = $('.plate', row);
    const slot = $('.pslot', row);
    scrub(plate, 'top_bottom', 'top_center', (p) => {
      slot.style.top = `${-10 * (1 - p)}%`;
    });
    if (canHover) {
      plate.addEventListener('mouseenter', () => {
        section.classList.add('dim');
        row.classList.add('hot');
      });
      plate.addEventListener('mouseleave', () => {
        section.classList.remove('dim');
        row.classList.remove('hot');
      });
    }
    const yearEl = $('.year', row);
    const year = reveal(yearEl, { letters: true, stagger: 26, cfg: C.YEAR });
    const settle = new Spring(1, C.YEAR_SETTLE, (v) => {
      yearEl.style.opacity = v;
    });
    const copyEl = $('.tcopy', row);
    const copy = copyEl
      ? new Spring(0, C.COPY, (p) => {
          copyEl.style.opacity = clamp(p);
          copyEl.style.translate = `0 ${(1 - p) * 0.75}rem`;
        })
      : null;
    onView(
      row,
      () => {
        year.play(0);
        if (centre) settle.set(0.4, 2200);
        copy?.set(1, 220);
      },
      null,
      { rootMargin: '0% 0% -25% 0%', once: true },
    );
  }

  // the rail
  const rail = $('.rail', section),
    svg = $('svg', rail);
  const solid = $('.r-solid', svg),
    dash = $('.r-dash', svg),
    run = $('.r-run', svg),
    mark = $('.r-mark', svg);
  let rest = 1,
    value = 0;
  const draw = (p) => {
    value = p;
    const y = clamp(p) * rest;
    run.setAttribute('height', `${Math.max(0, y)}`);
    mark.setAttribute('transform', `translate(8 ${y}) rotate(${(y / rest) * 1800})`);
  };
  const layout = () => {
    if (!rail.clientHeight) return;
    const scale = section.clientWidth / 1440;
    const viewH = rail.clientHeight / scale;
    const last = $$('.row', section).at(-1).getBoundingClientRect();
    const top = rail.getBoundingClientRect().top;
    rest = (last.top + last.height / 2 - top) / scale - 50;
    svg.setAttribute('viewBox', `0 0 16 ${viewH}`);
    dash.setAttribute('y2', `${Math.max(102, rest)}`);
    const size = window.innerWidth < 1024 ? 20 : 9;
    mark.setAttribute('x', `${-size / 2}`);
    mark.setAttribute('y', `${-size / 2}`);
    mark.setAttribute('width', `${size}`);
    mark.setAttribute('height', `${size}`);
    draw(value);
  };
  new ResizeObserver(layout).observe(section);
  layout();
  const progress = new Spring(0, C.PROGRESS, draw);
  scrub(rail, 'top_center', 'bottom_bottom', (p) => {
    if (Math.abs(p - progress.to) > 1e-4) progress.set(p);
  });
}
