import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import InsightsRankingTable from "./InsightsRankingTable";
import type { Contestant, EliminationEntry, InsightsResponse, Season, Show } from "../../../utils/Constants";

const show: Show = { id: "show1", name: "Survivor", currSeason: 1 };

const makeContestant = (id: string, name: string, status: Contestant["status"] = "ACTIVE"): Contestant => ({
  id,
  name,
  seasonId: "se1",
  status,
});

const season: Season = {
  id: "se1",
  showId: "show1",
  isCurrent: true,
  seasonNumber: 1,
  contestants: [
    makeContestant("c1", "Alice"),
    makeContestant("c2", "Bob"),
    makeContestant("c3", "Carol", "ELIMINATED"),
  ],
};

const emptyInsights: InsightsResponse = { seasonId: "se1", type: "FAVORITE", episodes: [], overall: [] };

const baseProps = {
  currShow: show,
  eliminations: [] as EliminationEntry[],
  rankingType: "FAVORITE" as const,
  setRankingType: () => {},
  loadingFlag: false,
};

describe("InsightsRankingTable", () => {
  it("shows a loading state while loadingFlag is set", () => {
    const { container } = render(
      <InsightsRankingTable {...baseProps} currSeason={season} favoriteInsights={emptyInsights} winnerInsights={emptyInsights} loadingFlag />
    );
    expect(container.querySelector(".page-loading")).toBeInTheDocument();
  });

  it("shows a loading state when there's no current season", () => {
    const { container } = render(
      <InsightsRankingTable {...baseProps} currSeason={null} favoriteInsights={null} winnerInsights={null} />
    );
    expect(container.querySelector(".page-loading")).toBeInTheDocument();
  });

  it("shows a placeholder when the season has no contestants", () => {
    render(
      <InsightsRankingTable
        {...baseProps}
        currSeason={{ ...season, contestants: [] }}
        favoriteInsights={emptyInsights}
        winnerInsights={emptyInsights}
      />
    );
    expect(screen.getByText("No contestants have been added to this season yet.")).toBeInTheDocument();
  });

  it("shows a placeholder when no rankings have been submitted yet", () => {
    render(
      <InsightsRankingTable {...baseProps} currSeason={season} favoriteInsights={emptyInsights} winnerInsights={emptyInsights} />
    );
    expect(screen.getByText("No rankings have been submitted for this season yet.")).toBeInTheDocument();
  });

  it("orders contestants by average position ascending, appends eliminated-with-no-data, then blanks", () => {
    const favoriteInsights: InsightsResponse = {
      seasonId: "se1",
      type: "FAVORITE",
      episodes: [
        {
          episodeId: "e1",
          episodeNumber: 1,
          contestantAverages: [
            { contestantId: "c2", averagePosition: 1 },
            { contestantId: "c1", averagePosition: 2 },
          ],
        },
      ],
      overall: [],
    };
    const eliminations: EliminationEntry[] = [
      { id: "el1", episodeId: "e1", contestantId: "c3", eliminationType: "ELIMINATED", episode: { id: "e1", episodeNumber: 1, seasonId: "se1" } } as any,
    ];

    const { container } = render(
      <InsightsRankingTable
        {...baseProps}
        currSeason={season}
        eliminations={eliminations}
        favoriteInsights={favoriteInsights}
        winnerInsights={emptyInsights}
      />
    );

    // Only the first 3 ".insights-cell" divs belong to the single episode
    // column — the rest belong to the (blank) spacer and overall columns.
    const episodeColumnCells = Array.from(container.querySelectorAll(".insights-cell")).slice(0, 3);
    const names = episodeColumnCells.map((cell) => cell.textContent);
    // Bob (avg 1) first, Alice (avg 2) second, Carol (eliminated, no data,
    // backfilled) third — matches rowCount=3 with no blank cells needed.
    expect(names).toEqual(["BOB", "ALICE", "CAROL"]);
  });

  it("switches rank type tabs", async () => {
    const user = userEvent.setup();
    const setRankingType = vi.fn();
    render(
      <InsightsRankingTable
        {...baseProps}
        currSeason={season}
        favoriteInsights={emptyInsights}
        winnerInsights={emptyInsights}
        setRankingType={setRankingType}
      />
    );
    await user.click(screen.getByText("Winner"));
    expect(setRankingType).toHaveBeenCalledWith("WINNER");
  });
});
