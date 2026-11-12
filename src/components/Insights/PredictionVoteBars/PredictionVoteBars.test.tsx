import { render, screen } from "@testing-library/react";
import PredictionVoteBars from "./PredictionVoteBars";

describe("PredictionVoteBars", () => {
  it("labels each name with its rounded percentage and fills the bar to it", () => {
    render(<PredictionVoteBars bars={[{ id: "a", name: "Kilby", percent: 0.625 }, { id: "b", name: "Ori", percent: 0 }]} />);
    expect(screen.getByText("Kilby")).toBeInTheDocument();
    expect(screen.getByText("63%")).toBeInTheDocument();
    const meter = screen.getByRole("meter", { name: "Kilby: 63%" });
    expect(meter.firstElementChild).toHaveStyle({ width: "62.5%" });
    expect(screen.getByRole("meter", { name: "Ori: 0%" }).firstElementChild).toHaveStyle({ width: "0%" });
  });

  it("caps the fill at 100%", () => {
    render(<PredictionVoteBars bars={[{ id: "a", name: "Kilby", percent: 1 }]} />);
    expect(screen.getByRole("meter").firstElementChild).toHaveStyle({ width: "100%" });
  });
});
