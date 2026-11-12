import { render, screen } from "@testing-library/react";
import ContestantChip from "./ContestantChip";
import type { Contestant, Season } from "../../../utils/Constants";

const season = { id: "se1", showId: "s1", isCurrent: true, seasonNumber: 1, contestants: [] } as unknown as Season;

describe("ContestantChip", () => {
  it("shows the photo and only the first name", () => {
    const c: Contestant = { id: "a", name: "Alice Smith", seasonId: "se1" };
    render(<ContestantChip contestant={c} season={season} />);
    expect(screen.getByAltText("Alice Smith")).toBeInTheDocument();
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.queryByText("Alice Smith")).not.toBeInTheDocument();
  });

  it("keeps a two-word first name when firstNameHasSpace is set", () => {
    const c: Contestant = { id: "t", name: "Thien An Nguyen", seasonId: "se1", firstNameHasSpace: true };
    render(<ContestantChip contestant={c} season={season} />);
    expect(screen.getByText("Thien An")).toBeInTheDocument();
  });

  it("uses the nickname, or the full name on a Display full name show", () => {
    const c: Contestant = { id: "a", name: "William Smith", seasonId: "se1", nickname: "Bubba" };
    const { rerender } = render(<ContestantChip contestant={c} season={season} />);
    expect(screen.getByText("Bubba")).toBeInTheDocument();
    rerender(<ContestantChip contestant={{ ...c, nickname: null }} season={season} show={{ id: "s", name: "Drag Race", currSeason: 1, displayFullName: true }} />);
    expect(screen.getByText("William Smith")).toBeInTheDocument();
  });

  it("labels a finale placement under the name", () => {
    const c: Contestant = { id: "a", name: "Alice Smith", seasonId: "se1" };
    render(<ContestantChip contestant={c} season={season} placement={1} />);
    expect(screen.getByText("Winner")).toBeInTheDocument();
  });
});
