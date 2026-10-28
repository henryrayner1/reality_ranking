import { render } from "@testing-library/react";
import TvStaticBackground from "./TvStaticBackground";

describe("TvStaticBackground", () => {
  it("renders a decorative canvas hidden from assistive tech", () => {
    const { container } = render(<TvStaticBackground />);
    const wrapper = container.querySelector(".tv-static");
    expect(wrapper).toHaveAttribute("aria-hidden", "true");
    expect(wrapper?.querySelector("canvas")).toBeInTheDocument();
  });
});
