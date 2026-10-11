// Design-space units. The layout was drawn on a 1440px artboard; px(v) converts artboard px to container-query width (cqw).

export const px = (v) => `${((v / 1440) * 100).toFixed(4)}cqw`;
export const type = (v) => `max(${px(v)}, var(--type-min, 0px))`;
