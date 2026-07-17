import { render } from "@testing-library/react";
import ImageContainer from "./ImageContainer";

// Note: ImageContainer defines a `getImages` fetcher but never calls it (no
// useEffect/mount hook invokes it, and it isn't exposed to the parent) — so
// under current behavior this component always renders its empty/fallback
// state. This test documents that actual behavior rather than the
// presumably-intended "fetches images on mount" behavior.
describe("ImageContainer", () => {
  it("renders an empty fallback since nothing triggers the image fetch", () => {
    const { container } = render(<ImageContainer newImage={[]} />);
    expect(container.querySelector("img")).not.toBeInTheDocument();
    expect(container.querySelector("h1")).toHaveTextContent("");
  });
});
