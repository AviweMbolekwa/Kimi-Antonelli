// Device tiering: picks DPR, frame cap, trail samples and which effects run on mobile/tablet/desktop.

const CAP_60 = 1e3 / 60 - 2;
const isEnergySaver = () => {
  const nav = navigator;
  return Boolean(nav.connection?.saveData) || (nav.deviceMemory ?? 8) <= 2;
};
export const getSceneTier = () => {
  const coarse = window.matchMedia('(hover: none) and (pointer: coarse)').matches;
  const width = window.innerWidth;
  const name =
    width < 768 || (coarse && width < 1024) ? 'mobile' : coarse || width < 1280 ? 'tablet' : 'desktop';
  const mobile = name === 'mobile';
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const saver = isEnergySaver();
  return {
    name,
    mobile,
    coarsePointer: coarse,
    reducedMotion,
    maxDpr: mobile ? 1 : name === 'tablet' ? 1.25 : 1.5,
    frameInterval: name === 'desktop' ? 0 : CAP_60,
    pointerEnabled: !coarse && !reducedMotion,
    antialias: name === 'desktop',
    trailSamples: mobile ? 28 : name === 'tablet' ? 44 : 72,
    outline: !mobile,
    reveal: !mobile,
    freeze: reducedMotion || (mobile && saver),
  };
};
