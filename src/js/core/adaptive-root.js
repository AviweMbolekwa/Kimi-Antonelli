// Above 1920px wide, scale the root font-size so the rem layout keeps growing.

export function initAdaptiveRoot() {
  if (window.innerWidth > 1920) {
    const scaleRoot = () => {
      document.documentElement.style.fontSize =
        window.innerWidth > 1920 ? `${(16 * window.innerWidth) / 1920}px` : '';
    };
    scaleRoot();
    window.addEventListener('resize', scaleRoot);
  } else {
    window.addEventListener('resize', () => {
      document.documentElement.style.fontSize =
        window.innerWidth > 1920 ? `${(16 * window.innerWidth) / 1920}px` : '';
    });
  }
}
