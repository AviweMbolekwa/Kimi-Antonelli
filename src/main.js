// Kimi Antonelli / GRID01 entry point.
import './styles/main.css';

// Modules with load-time side effects, imported in the original order:
// asset error banner, shared ticker, Lenis, spring stepper, scroll-scrub stepper.
import './js/core/asset-errors.js';
import './js/core/ticker.js';
import './js/core/smooth-scroll.js';
import './js/core/spring.js';
import './js/animations/scrub.js';

import { initAdaptiveRoot } from './js/core/adaptive-root.js';
import { initFooter } from './js/sections/footer.js';
import { initHero } from './js/sections/hero.js';
import { initPaddock } from './js/sections/paddock.js';
import { initSeason } from './js/sections/season.js';
import { initSheet } from './js/sections/menu-sheet.js';
import { initStack } from './js/sections/stack.js';
import { initTimeline } from './js/sections/timeline.js';

initAdaptiveRoot();
initStack();
initSheet();
initHero();
initSeason();
initTimeline();
initPaddock();
initFooter();
