// Where assets are served from. Override with VITE_ASSET_BASE_URL (e.g. a CDN) at build time.
// BASE_URL is Vite's `base` ("/" locally, "/Kimi-Antonelli/" on GitHub Pages).

export const ASSET_BASE_URL = import.meta.env.VITE_ASSET_BASE_URL ?? `${import.meta.env.BASE_URL}assets`;
export const asset = (p) => `${ASSET_BASE_URL}/${p}`;
