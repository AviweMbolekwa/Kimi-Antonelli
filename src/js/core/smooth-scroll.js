// Lenis smooth scroll (skipped for reduced motion), driven by the shared ticker.
import Lenis from 'lenis';
import { REDUCED } from '../utils/dom.js';
import { subscribe } from './ticker.js';

export let lenis = null;
if (!REDUCED) {
  lenis = new Lenis({ smoothWheel: true });
  subscribe(
    (time) => lenis.raf(time),
    () => 0,
  );
}
