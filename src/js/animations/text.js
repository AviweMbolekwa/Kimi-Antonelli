// The text engine: split text into word/letter units and reveal them with staggered springs.
import { C, Spring } from '../core/spring.js';
import { clamp } from '../utils/math.js';
import { fade } from './entrances.js';

function split(el, { letters = false, gap = null, sr = true } = {}) {
  const text = el.textContent.replace(/\s+/g, ' ').trim();
  el.textContent = '';
  el.classList.add('tx');
  if (gap != null) el.style.columnGap = `${gap}em`;
  if (sr) {
    const copy = document.createElement('span');
    copy.className = 'sr-only';
    copy.textContent = text;
    el.append(copy);
  }
  const units = [];
  for (const word of text.split(' ')) {
    if (letters) {
      const w = document.createElement('span');
      w.className = 'tw';
      w.setAttribute('aria-hidden', 'true');
      for (const ch of word) {
        const u = document.createElement('span');
        u.className = 'u';
        u.textContent = ch;
        w.append(u);
        units.push(u);
      }
      el.append(w);
    } else {
      const u = document.createElement('span');
      u.className = 'u';
      u.setAttribute('aria-hidden', 'true');
      u.textContent = word;
      el.append(u);
      units.push(u);
    }
  }
  return units;
}
export function reveal(el, { letters = false, stagger, cfg = C.REVEAL, gap = null, sr = true } = {}) {
  const units = split(el, { letters, gap, sr });
  const y = letters ? 0.3 : 0.35;
  const step = stagger ?? (letters ? 26 : 110);
  const springs = units.map(
    (u) =>
      new Spring(0, cfg, (p) => {
        u.style.opacity = clamp(p);
        u.style.transform = `translateY(${(1 - p) * y}em)`;
      }),
  );
  return {
    units,
    play(delay = 0) {
      springs.forEach((s, i) => s.set(1, delay + i * step));
    },
    back() {
      springs.forEach((s) => s.set(0));
    },
  };
}
// A masthead: authored lines, each its own word reveal at index*130, the full stop at 130+110.
export function headLines(h, lines, stopColor) {
  h.textContent = '';
  const copy = document.createElement('span');
  copy.className = 'sr-only';
  copy.textContent = `${lines.join(' ')}.`;
  h.append(copy);
  const revs = lines.map((line) => {
    const l = document.createElement('span');
    l.className = 'hl';
    l.setAttribute('aria-hidden', 'true');
    l.textContent = line;
    h.append(l);
    return reveal(l, { sr: false });
  });
  const stop = document.createElement('span');
  stop.className = 'stop';
  stop.style.color = stopColor;
  stop.textContent = '.';
  revs.at(-1).units.at(-1).append(stop);
  const s = fade(stop);
  return {
    play(base = 0) {
      revs.forEach((r, i) => r.play(base + i * 130));
      s.set(1, base + 130 + 110);
    },
    back() {
      revs.forEach((r) => r.back());
      s.set(0);
    },
  };
}
