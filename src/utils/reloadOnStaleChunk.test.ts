import { handleStaleChunk, RELOAD_COOLDOWN_MS } from "./reloadOnStaleChunk";

const preloadError = () => new Event("vite:preloadError", { cancelable: true });

describe("handleStaleChunk", () => {
  beforeEach(() => sessionStorage.clear());

  it("reloads and swallows the error the first time", () => {
    const reload = vi.fn();
    const event = preloadError();
    handleStaleChunk(event, 1_000_000, reload);
    expect(reload).toHaveBeenCalledTimes(1);
    expect(event.defaultPrevented).toBe(true);
  });

  it("doesn't reload again within the cooldown, so a broken deploy can't loop", () => {
    const reload = vi.fn();
    handleStaleChunk(preloadError(), 1_000_000, reload);
    const second = preloadError();
    handleStaleChunk(second, 1_000_000 + RELOAD_COOLDOWN_MS - 1, reload);
    expect(reload).toHaveBeenCalledTimes(1);
    expect(second.defaultPrevented).toBe(false);
  });

  it("reloads again once the cooldown has passed (a later deploy)", () => {
    const reload = vi.fn();
    handleStaleChunk(preloadError(), 1_000_000, reload);
    handleStaleChunk(preloadError(), 1_000_000 + RELOAD_COOLDOWN_MS, reload);
    expect(reload).toHaveBeenCalledTimes(2);
  });
});
