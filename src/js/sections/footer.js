// "Keep pushing forward" footer.
import { $, $$ } from '../utils/dom.js';
import { ARROW } from '../utils/markup.js';
import { C } from '../core/spring.js';
import { asset } from '../config.js';
import { contour } from '../effects/contour.js';
import { fade, rise } from '../animations/entrances.js';
import { headLines, reveal } from '../animations/text.js';
import { hydrateImages } from '../core/asset-errors.js';
import { onView } from '../animations/view-gates.js';
import { px } from '../utils/css-units.js';
import { scrub } from '../animations/scrub.js';

export function initFooter() {
  const section = $('.ft');
  const NAV = [
    ['driver', '/driver'],
    ['season', '/season'],
    ['journal', '/journal'],
    ['next race', '/next-race'],
    ['store', '/store'],
  ];
  section.innerHTML = `
    <div class="ft-panel"><canvas class="contour" aria-hidden="true"></canvas></div>
    <div class="ft-fig"><div class="ft-fig-in">
      <img class="ft-body" data-src="footer/body.webp" alt="" aria-hidden="true">
      <img class="ft-helmet" data-src="footer/helmet.webp" alt="Kimi Antonelli's helmet">
    </div></div>
    <div class="ft-logo" role="img" aria-label="GRID01 Racing Systems"></div>
    <h2 class="ft-head disp" id="ft-h"></h2>
    <nav class="ft-nav" aria-label="Footer"><ul>${NAV.map(([l, h]) => `<li><a class="ha disp" href="${h}"><span class="nt">${l}</span><svg class="ar" viewBox="0 0 13.7071 10.7071" aria-hidden="true"><path d="M0 5.35H13M8 10.35L13 5.35L8 0.35"/></svg></a></li>`).join('')}</ul></nav>
    <p class="ft-foot ft-copy">© 2026 GRID01 Racing Systems. All rights reserved.</p>
    <a class="ft-foot ft-cta" href="/legal">
      <svg class="frame" viewBox="0 0 275 50" preserveAspectRatio="none" aria-hidden="true">
        <path class="flood" d="M0.5 0.5H274.5V41.165L266.165 49.5H0.5Z" style="fill:var(--accent)"/>
        <path d="M0.5 0.5H274.5V41.165L266.165 49.5H0.5Z" fill="none" style="stroke:var(--accent)" vector-effect="non-scaling-stroke"/>
      </svg>
      <span class="inner"><span class="lbl">legal documents</span>${ARROW}</span>
    </a>
    <ul class="ft-foot ft-social">
      <li><a class="ha" href="https://instagram.com">inst</a></li>
      <li><a class="ha" href="https://x.com">x</a></li>
      <li><a class="ha" href="https://youtube.com">youtube</a></li>
    </ul>`;
  hydrateImages(section);
  $('.ft-logo', section).style.setProperty('--lm', `url("${asset('footer/logo-mask.png')}")`);
  contour($('.contour', section), '--footer-contour');

  const figIn = $('.ft-fig-in', section);
  scrub(section, 'top_bottom', 'bottom_bottom', (p) => {
    figIn.style.top = px(60 * (1 - p));
  });

  const logo = fade($('.ft-logo', section));
  const head = headLines($('.ft-head', section), ['keep pushing', 'forward'], 'var(--foreground-on-dark)');
  const nav = $$('.ft-nav .nt', section).map((n) =>
    reveal(n, { letters: true, stagger: 22, cfg: C.ROW, gap: 0.2 }),
  );
  const foot = $$('.ft-foot', section).map((f) => rise(f));
  onView(
    section,
    () => {
      logo.set(1, 120);
      head.play(0);
      nav.forEach((n, i) => n.play(260 + i * 80));
      foot.forEach((f, i) => f.set(1, 640 + i * 80));
    },
    () => {
      logo.set(0);
      head.back();
      nav.forEach((n) => n.back());
      foot.forEach((f) => f.set(0));
    },
    { threshold: 0.1 },
  );
}
