// Where assets are served from. Override with VITE_ASSET_BASE_URL (e.g. a CDN) at build time.

export const ASSET_BASE_URL = import.meta.env.VITE_ASSET_BASE_URL ?? '/assets';
export const asset = (p) => `${ASSET_BASE_URL}/${p}`;
