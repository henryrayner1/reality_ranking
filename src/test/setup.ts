import '@testing-library/jest-dom/vitest';

// jsdom has no ResizeObserver — needed by Navbar.tsx's own nav-height
// measurement and recharts' <ResponsiveContainer> (ContestantTrendChart.tsx).
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
// @ts-expect-error - test polyfill, not a real ResizeObserver
global.ResizeObserver = global.ResizeObserver ?? ResizeObserverMock;

// jsdom has no IntersectionObserver — needed by react-tooltip (used via
// InsightsRankingTable's rank-type-tab tooltips) through @floating-ui/dom's
// autoUpdate.
class IntersectionObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}
// @ts-expect-error - test polyfill, not a real IntersectionObserver
global.IntersectionObserver = global.IntersectionObserver ?? IntersectionObserverMock;

// jsdom has no matchMedia; react-bootstrap's Dropdown/Collapse probe it defensively.
if (!window.matchMedia) {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}

// jsdom's layout engine always reports zero-size rects, which makes
// recharts' <ResponsiveContainer> (ContestantTrendChart.tsx) permanently
// treat itself as zero-sized and render nothing beyond an empty wrapper div
// (it reads getBoundingClientRect synchronously on mount, independent of the
// ResizeObserver callback above). Give every element a fixed non-zero size
// so charts actually render their content under test.
Element.prototype.getBoundingClientRect = () =>
  ({
    width: 500,
    height: 300,
    top: 0,
    left: 0,
    bottom: 300,
    right: 500,
    x: 0,
    y: 0,
    toJSON() {},
  }) as DOMRect;

afterEach(() => {
  localStorage.clear();
});
