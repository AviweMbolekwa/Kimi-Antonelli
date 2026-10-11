// Mobile/tablet menu sheet (below 1280px), built on open.
import { $, $$, mq } from '../utils/dom.js';
import { C, Spring } from '../core/spring.js';
import { asset } from '../config.js';
import { clamp } from '../utils/math.js';
import { lenis } from '../core/smooth-scroll.js';
import { rise } from '../animations/entrances.js';

export function initSheet() {
  const button = $('.burger');
  const LINKS = [
    ['Driver', '/driver'],
    ['SEASON', '/season'],
    ['journal', '/journal'],
    ['next race', '/next-race'],
    ['store', '/store'],
    ['Garage', '/garage'],
  ];
  let sheet = null,
    fadeSpring = null;
  const close = () => {
    if (!sheet) return;
    const s = sheet;
    sheet = null;
    button.setAttribute('aria-expanded', 'false');
    Object.assign(document.documentElement.style, { position: '', overflow: '', height: '' });
    lenis?.start();
    document.removeEventListener('keydown', onKey);
    fadeSpring.on = (v) => {
      s.style.opacity = clamp(v);
      if (v <= 0.001) s.remove();
    };
    fadeSpring.set(0);
    button.focus();
  };
  const onKey = (e) => {
    if (e.key === 'Escape') close();
  };
  const open = () => {
    if (sheet) return;
    sheet = document.createElement('div');
    sheet.className = 'sheet';
    sheet.setAttribute('role', 'dialog');
    sheet.setAttribute('aria-modal', 'true');
    sheet.setAttribute('aria-label', 'Menu');
    sheet.innerHTML = `<div class="sheet-top"><a href="${import.meta.env.BASE_URL}" class="sheet-logo" aria-label="Grido1 Racing Systems"><img src="${asset('hero/ui/grido1-logo.webp')}" alt=""></a><button class="sheet-close" type="button" aria-label="Close menu"><i></i><i></i></button></div>
      <nav aria-label="Primary"><ul>${LINKS.map(([l, h]) => `<li><a class="ha" href="${h}">${l}</a></li>`).join('')}</ul></nav>`;
    document.body.append(sheet);
    button.setAttribute('aria-expanded', 'true');
    Object.assign(document.documentElement.style, {
      position: 'relative',
      overflow: 'hidden',
      height: '100%',
    });
    lenis?.stop();
    const s = sheet;
    fadeSpring = new Spring(0, C.SHEET, (v) => {
      s.style.opacity = clamp(v);
    });
    fadeSpring.set(1);
    $$('li', sheet).forEach((li, i) => rise(li, { cfg: C.ROW }).set(1, 120 + i * 55));
    $('.sheet-logo', sheet).addEventListener('click', close);
    $('.sheet-close', sheet).addEventListener('click', close);
    $('.sheet-close', sheet).focus();
    document.addEventListener('keydown', onKey);
  };
  button.addEventListener('click', open);
  mq('(min-width: 1280px)').addEventListener('change', (e) => {
    if (e.matches) close();
  });
}
