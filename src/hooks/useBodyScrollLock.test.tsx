import { render } from "@testing-library/react";
import { useBodyScrollLock } from "./useBodyScrollLock";

const Locker = () => {
  useBodyScrollLock();
  return null;
};

describe("useBodyScrollLock", () => {
  beforeEach(() => {
    document.body.removeAttribute("style");
    window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
    Object.defineProperty(window, "scrollY", { value: 420, configurable: true });
  });

  it("pins the page at its scroll position and restores it on close", () => {
    const { unmount } = render(<Locker />);
    expect(document.body.style.position).toBe("fixed");
    expect(document.body.style.top).toBe("-420px");
    unmount();
    expect(document.body.getAttribute("style")).toBeNull();
    expect(window.scrollTo).toHaveBeenCalledWith({ top: 420, left: 0, behavior: "instant" });
  });

  it("keeps the page locked until the last of several modals closes", () => {
    const outer = render(<Locker />);
    const inner = render(<Locker />);
    inner.unmount();
    expect(document.body.style.position).toBe("fixed");
    expect(window.scrollTo).not.toHaveBeenCalled();
    outer.unmount();
    expect(document.body.style.position).toBe("");
    expect(window.scrollTo).toHaveBeenCalledTimes(1);
  });
});
