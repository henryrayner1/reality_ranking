// Drag-and-drop reordering itself is not covered here — @dnd-kit's
// pointer-sensor pipeline isn't meaningfully simulatable under jsdom (every
// element reports a zero-size getBoundingClientRect, so closestCenter
// collision detection has nothing real to compute against), and
// handleDragEnd/arrayMove aren't exported from this component to unit-test
// directly. Only the activate/render surface is tested here; the
// onReorder/onActivate callback wiring itself is exercised indirectly in
// RankingComponent2.test.tsx by invoking those callbacks directly.
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import EpisodeComponent from "./Episode";
import type { Contestant, Season } from "../../utils/Constants";

const contestants: Contestant[] = [
  { id: "c1", name: "Alice", seasonId: "se1" },
  { id: "c2", name: "Bob", seasonId: "se1" },
];

const season: Season = {
  id: "se1",
  showId: "show1",
  isCurrent: true,
  contestants,
  seasonNumber: 1,
};

const show = { id: "show1", name: "Survivor", currSeason: 1 };

const baseProps = {
  currEpisode: { id: "e1", episodeNumber: 3 },
  eliminatedContestants: [] as string[],
  onReorder: () => {},
  onActivate: () => {},
  contestants,
  season,
  show,
};

describe("EpisodeComponent", () => {
  it("renders an activate button when inactive", () => {
    render(<EpisodeComponent {...baseProps} isActive={false} activeContestants={[]} />);
    expect(screen.getByAltText("Activate Episode")).toBeInTheDocument();
  });

  it("calls onActivate when the inactive cell is clicked", async () => {
    const user = userEvent.setup();
    const onActivate = vi.fn();
    render(<EpisodeComponent {...baseProps} isActive={false} activeContestants={[]} onActivate={onActivate} />);
    await user.click(screen.getByAltText("Activate Episode"));
    expect(onActivate).toHaveBeenCalled();
  });

  it("renders one active cell per activeContestants id when active", () => {
    const { container } = render(
      <EpisodeComponent {...baseProps} isActive activeContestants={["c1", "c2"]} />
    );
    expect(container.querySelectorAll(".cell.active-episode")).toHaveLength(2);
    expect(screen.getByText("ALICE")).toBeInTheDocument();
    expect(screen.getByText("BOB")).toBeInTheDocument();
  });

  it("renders eliminated contestants in the eliminated bucket, separate from active cells", () => {
    const { container } = render(
      <EpisodeComponent
        {...baseProps}
        isActive
        activeContestants={["c1"]}
        eliminatedContestants={["c2"]}
      />
    );
    expect(container.querySelectorAll(".cell.active-episode")).toHaveLength(1);
    expect(container.querySelectorAll(".cell.eliminated-episode")).toHaveLength(1);
  });

  it("shows the episode number heading", () => {
    render(<EpisodeComponent {...baseProps} isActive={false} activeContestants={[]} />);
    expect(screen.getByText("3")).toBeInTheDocument();
  });
});
