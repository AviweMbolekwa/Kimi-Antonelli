// Asset loading: data-src -> real src, plus a visible banner for anything that fails to load.
import { DefaultLoadingManager } from 'three';
import { $, $$ } from '../utils/dom.js';
import { asset } from '../config.js';

const failed = new Set();
export function reportFailure(url) {
  if (failed.has(url)) return;
  failed.add(url);
  const banner = $('#asset-error');
  banner.hidden = false;
  const line = document.createElement('div');
  line.textContent = `Could not load ${url}`;
  banner.append(line);
}
document.addEventListener(
  'error',
  (e) => {
    const t = e.target;
    if (t && t.tagName === 'IMG') reportFailure(t.getAttribute('src'));
  },
  true,
);
DefaultLoadingManager.onError = (url) => reportFailure(url);
export function hydrateImages(root = document) {
  for (const img of $$('img[data-src]', root)) {
    img.src = asset(img.dataset.src);
    img.removeAttribute('data-src');
  }
}
