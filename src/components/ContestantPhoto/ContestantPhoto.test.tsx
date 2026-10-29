import { render, screen } from "@testing-library/react";
import ContestantPhoto from "./ContestantPhoto";
import type { Season, Show } from "../../utils/Constants";

const show: Show = { id: "show1", name: "Survivor", currSeason: 51 };
const season: Season = { id: "se1", showId: "show1", isCurrent: true, seasonNumber: 51, contestants: [] };

describe("ContestantPhoto", () => {
  it("shows the stored photo with no name label", () => {
    render(<ContestantPhoto name="Ori Jean-Charles" photoUrl="https://images.example.com/ori.png" season={season} show={show} />);
    const img = screen.getByRole("img", { name: "Ori Jean-Charles" });
    expect(img).toHaveAttribute("src", "https://images.example.com/ori.png");
    expect(screen.queryByText("ORI")).not.toBeInTheDocument();
  });

  it("falls back to the naming convention without a photoUrl", () => {
    render(<ContestantPhoto name="Ana Sani" season={season} show={show} />);
    expect(screen.getByRole("img")).toHaveAttribute("src", "/uploads/survivor/season_51/contestants/ana_sani.png");
  });

  it("marks eliminated contestants and finalists' placement tier", () => {
    const { rerender } = render(<ContestantPhoto name="Ana Sani" season={season} show={show} isEliminated />);
    expect(screen.getByRole("img")).toHaveClass("contestant-photo-eliminated");

    rerender(<ContestantPhoto name="Ana Sani" season={season} show={show} placement={1} />);
    expect(screen.getByRole("img")).toHaveClass("contestant-photo-placed", "placement-gold");
  });
});
