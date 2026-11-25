import { render, screen } from "@testing-library/react";
import FinalePlacementBars from "./FinalePlacementBars";

describe("FinalePlacementBars", () => {
  it("shows position, name and average, and splits the bar by placement share", () => {
    render(
      <FinalePlacementBars
        bars={[
          { id: "a", name: "Kilby", position: 1, averagePlacement: 1.375, shares: [0.75, 0.125, 0.125, 0] },
          { id: "b", name: "Ori", position: 2, averagePlacement: null, shares: [0, 0, 0, 0] },
        ]}
      />
    );
    expect(screen.getByText("1. Kilby")).toBeInTheDocument();
    expect(screen.getByText("avg 1.4")).toBeInTheDocument();
    expect(screen.getByText("Not placed")).toBeInTheDocument();
    const track = screen.getByRole("img", { name: "Kilby: Winner 75%, 2nd 13%, 3rd 13%, 4th+ 0%" });
    // Zero-share segments aren't drawn.
    expect(track.children).toHaveLength(3);
    expect(track.firstElementChild).toHaveStyle({ width: "75%" });
    expect(screen.getByRole("img", { name: /^Ori:/ }).children).toHaveLength(0);
  });
});
