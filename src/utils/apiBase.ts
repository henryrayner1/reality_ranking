// The frontend (GitHub Pages) and backend (Render) are hosted on different
// origins in production, so every backend-relative path — API calls and
// /uploads/* image URLs alike — needs this prefix. Empty string in local
// dev, where Vite's /api proxy (see vite.config.ts) makes relative paths
// work against the same-origin dev server.
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

export const backendUrl = (path: string) => `${API_BASE_URL}${path}`;
