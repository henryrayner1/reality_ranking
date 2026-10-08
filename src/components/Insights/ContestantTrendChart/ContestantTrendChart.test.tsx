import { render, screen } from "@testing-library/react";
import ContestantTrendChart, { getFieldSizeByEpisode } from "./ContestantTrendChart";
import type { EliminationEntry, InsightsResponse } from "../../../utils/Constants";

const emptyInsights: InsightsResponse = { seasonId: "s1", type: "FAVORITE", episodes: [], overall: [] };

const insightsWithData = (avgs: { episodeNumber: number; averagePosition: number }[]): InsightsResponse => ({
  seasonId: "s1",
  type: "FAVORITE",
  episodes: avgs.map((a) => ({
    episodeId: `e${a.episodeNumber}`,
    episodeNumber: a.episodeNumber,
    contestantAverages: [{ contestantId: "c1", averagePosition: a.averagePosition }],
  })),
  overall: [],
});

describe("ContestantTrendChart", () => {
  it("shows an empty-state message when there's no data for either rank type", () => {
    render(
      <ContestantTrendChart
        contestantId="c1"
        favoriteInsights={emptyInsights}
        winnerInsights={emptyInsights}
        contestantCount={10}
        eliminations={[]}
      />
    );
    expect(screen.getByText("No ranking submissions yet for this contestant.")).toBeInTheDocument();
  });

  it("renders the chart with both series' legend labels when data exists", () => {
    const favoriteInsights = insightsWithData([{ episodeNumber: 1, averagePosition: 2 }]);
    const { container } = render(
      <ContestantTrendChart
        contestantId="c1"
        favoriteInsights={favoriteInsights}
        winnerInsights={emptyInsights}
        contestantCount={10}
        eliminations={[]}
      />
    );
    expect(container.querySelector(".recharts-responsive-container")).toBeInTheDocument();
    expect(screen.getByText("Favorite")).toBeInTheDocument();
    expect(screen.getByText("Winner")).toBeInTheDocument();
    expect(screen.getByText("Number of Contestants")).toBeInTheDocument();
  });
});

const elim = (contestantId: string, episodeNumber: number): EliminationEntry => ({
  id: `${contestantId}-${episodeNumber}`,
  episodeId: `e${episodeNumber}`,
  contestantId,
  eliminationType: "ELIMINATED" as EliminationEntry["eliminationType"],
  episode: { episodeNumber },
});

describe("getFieldSizeByEpisode", () => {
  it("is the full roster every episode with no eliminations", () => {
    expect([...getFieldSizeByEpisode(10, [], [1, 2, 3]).values()]).toEqual([10, 10, 10]);
  });

  it("shrinks starting the same episode a contestant is eliminated", () => {
    expect([...getFieldSizeByEpisode(10, [elim("a", 2)], [1, 2, 3]).values()]).toEqual([10, 9, 9]);
  });

  it("counts a duplicate elimination entry for one contestant only once", () => {
    expect([...getFieldSizeByEpisode(10, [elim("a", 2), elim("a", 2)], [1, 2, 3]).values()]).toEqual([10, 9, 9]);
  });

  it("drops by two for a double elimination", () => {
    expect([...getFieldSizeByEpisode(10, [elim("a", 2), elim("b", 2), elim("c", 3)], [1, 2, 3]).values()]).toEqual([10, 8, 7]);
  });
});
