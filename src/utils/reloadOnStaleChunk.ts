// Each GitHub Pages deploy replaces every file in assets/, and the lazily
// loaded pages (Admin, Ranking, Insights, Predictions) are separate files
// with content hashes in their names. A tab opened before a deploy still
// asks for the old names when you switch pages, gets a 404, and React.lazy
// leaves a blank page ("Failed to fetch dynamically imported module").
// Vite reports that as a `vite:preloadError` event; reloading picks up the
// current build, whose index.html points at the new file names.
//
// Guarded so a genuinely broken deploy (the file is missing even after a
// fresh load) can't put the tab in a reload loop: at most one reload per
// RELOAD_COOLDOWN_MS, tracked in sessionStorage.

const STORAGE_KEY = "staleChunkReloadAt";
export const RELOAD_COOLDOWN_MS = 10_000;

const readLastReload = (): number => {
  try {
    return Number(sessionStorage.getItem(STORAGE_KEY)) || 0;
  } catch {
    return 0;
  }
};

const writeLastReload = (time: number) => {
  try {
    sessionStorage.setItem(STORAGE_KEY, String(time));
  } catch {
    // Storage blocked: still reload this once; the cooldown just won't persist.
  }
};

export const handleStaleChunk = (event: Event, now: number = Date.now(), reload: () => void = () => window.location.reload()) => {
  if (now - readLastReload() < RELOAD_COOLDOWN_MS) return; // let the error surface
  event.preventDefault();
  writeLastReload(now);
  reload();
};

export const installStaleChunkReload = () => {
  window.addEventListener("vite:preloadError", (event) => handleStaleChunk(event));
};
