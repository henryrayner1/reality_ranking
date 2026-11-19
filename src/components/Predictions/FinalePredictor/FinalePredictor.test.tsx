import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import FinalePredictor from "./FinalePredictor";
import { seedFinaleOrder } from "../../../utils/predictions";
import type { Contestant, Season } from "../../../utils/Constants";

const contestants: Contestant[] = [
  { id: "a", name: "Alice Smith", seasonId: "se1" },
  { id: "b", name: "Bob Jones", seasonId: "se1" },
  { id: "c", name: "Cara Lee", seasonId: "se1" },
];
const season = { id: "se1", showId: "s1", isCurrent: true, seasonNumber: 1, contestants } as Season;

describe("seedFinaleOrder", () => {
  it("uses the roster order without a saved prediction", () => {
    expect(seedFinaleOrder(contestants, [])).toEqual(["a", "b", "c"]);
  });

  it("keeps the saved order, drops departed contestants and appends missing ones", () => {
    expect(seedFinaleOrder(contestants, ["c", "x", "a"])).toEqual(["c", "a", "b"]);
  });
});

describe("FinalePredictor", () => {
  it("labels each slot by placement, winner first, and submits the order", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(
      <FinalePredictor contestants={contestants} initialOrder={["b", "a", "c"]} season={season} hasSaved={false} isSaving={false} onSubmit={onSubmit} />
    );
    // Draggable photo + name chips, in a list separate from the fixed
    // placement labels.
    const chips = within(screen.getByRole("list", { name: /Predicted placements/ })).getAllByRole("button");
    expect(chips.map((c) => c.getAttribute("aria-label"))).toEqual(["Bob Jones", "Alice Smith", "Cara Lee"]);
    expect(within(chips[0]).getByText("Bob")).toBeInTheDocument();
    expect(chips[0].querySelector("img.prediction-chip-photo")).toBeInTheDocument();
    expect(chips[0]).not.toHaveTextContent("Winner");
    const places = Array.from(document.querySelectorAll(".finale-order-places .finale-order-place")).map((p) => p.textContent);
    expect(places).toEqual(["Winner", "2nd", "3rd"]);
    await user.click(screen.getByRole("button", { name: "Submit Prediction" }));
    expect(onSubmit).toHaveBeenCalledWith(["b", "a", "c"]);
  });

  it("shows a saved prediction as a summary, then reopens the order on Update", async () => {
    const user = userEvent.setup();
    render(
      <FinalePredictor contestants={contestants} initialOrder={["c", "a", "b"]} season={season} hasSaved isSaving={false} onSubmit={vi.fn()} />
    );
    expect(screen.getByText(/You have predicted/)).toHaveTextContent("You have predicted Cara will win the season.");
    // Everyone after the winner as chips, captioned with their placement.
    const rest = within(screen.getByRole("list", { name: /Rest of your predicted placements/ })).getAllByRole("listitem");
    expect(rest.map((li) => li.textContent)).toEqual(["Alice2nd", "Bob3rd"]);
    expect(rest[0]).toHaveClass("finale-summary-podium", "placement-silver");
    expect(rest[0].querySelector("img.prediction-chip-photo")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Update Prediction" }));
    expect(screen.getByText(/It's the finale!/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save Prediction" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.getByText(/You have predicted/)).toBeInTheDocument();
  });
});
