import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import EliminationPicker from "./EliminationPicker";
import type { Contestant, Season } from "../../../utils/Constants";

const contestants: Contestant[] = [
  { id: "a", name: "Alice Smith", seasonId: "se1" },
  { id: "b", name: "Bob Jones", seasonId: "se1" },
  { id: "c", name: "Cara Lee", seasonId: "se1" },
];
const season = { id: "se1", showId: "s1", isCurrent: true, seasonNumber: 1, contestants } as Season;

const renderPicker = (props: Partial<React.ComponentProps<typeof EliminationPicker>> = {}) => {
  const onSubmit = vi.fn();
  render(
    <EliminationPicker
      contestants={contestants}
      count={1}
      initialPicks={[]}
      season={season}
      hasSaved={false}
      isSaving={false}
      onSubmit={onSubmit}
      {...props}
    />
  );
  return onSubmit;
};

const option = (name: string) => screen.getByRole("button", { name });

describe("EliminationPicker", () => {
  it("swaps the pick when only one contestant leaves", async () => {
    const user = userEvent.setup();
    const onSubmit = renderPicker();
    expect(screen.getByRole("button", { name: "Submit Prediction" })).toBeDisabled();
    await user.click(option("Alice Smith"));
    await user.click(option("Bob Jones"));
    expect(option("Alice Smith")).toHaveAttribute("aria-pressed", "false");
    expect(option("Bob Jones")).toHaveAttribute("aria-pressed", "true");
    await user.click(screen.getByRole("button", { name: "Submit Prediction" }));
    expect(onSubmit).toHaveBeenCalledWith(["b"]);
  });

  it("requires exactly N picks and ignores clicks past the limit", async () => {
    const user = userEvent.setup();
    const onSubmit = renderPicker({ count: 2 });
    await user.click(option("Alice Smith"));
    expect(screen.getByRole("button", { name: "Submit Prediction" })).toBeDisabled();
    await user.click(option("Bob Jones"));
    await user.click(option("Cara Lee"));
    expect(option("Cara Lee")).toHaveAttribute("aria-pressed", "false");
    await user.click(screen.getByRole("button", { name: "Submit Prediction" }));
    expect(onSubmit).toHaveBeenCalledWith(["a", "b"]);
  });

  it("shows a saved prediction as a summary with an enabled Update button", () => {
    renderPicker({ initialPicks: ["c"], hasSaved: true });
    expect(screen.getByText(/You have predicted/)).toHaveTextContent("You have predicted Cara will go home this episode.");
    expect(screen.queryByRole("group", { name: "Contestants" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Update Prediction" })).toBeEnabled();
  });

  it("names every pick in the summary of a multi-elimination prediction", () => {
    renderPicker({ count: 2, initialPicks: ["a", "c"], hasSaved: true });
    expect(screen.getByText(/You have predicted/)).toHaveTextContent("Alice and Cara will go home");
  });

  it("reopens the picker on Update, saves only a changed pick, and Cancel restores the summary", async () => {
    const user = userEvent.setup();
    const onSubmit = renderPicker({ initialPicks: ["c"], hasSaved: true });
    await user.click(screen.getByRole("button", { name: "Update Prediction" }));
    expect(option("Cara Lee")).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Save Prediction" })).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.getByText(/You have predicted/)).toHaveTextContent("Cara");

    await user.click(screen.getByRole("button", { name: "Update Prediction" }));
    await user.click(option("Alice Smith"));
    await user.click(screen.getByRole("button", { name: "Save Prediction" }));
    expect(onSubmit).toHaveBeenCalledWith(["a"]);
  });

  it("has no Cancel button before the first submission", () => {
    renderPicker();
    expect(screen.queryByRole("button", { name: "Cancel" })).not.toBeInTheDocument();
  });

  it("shows a save error", () => {
    renderPicker({ error: "Predictions for this episode are closed" });
    expect(screen.getByRole("alert")).toHaveTextContent("Predictions for this episode are closed");
  });
});
