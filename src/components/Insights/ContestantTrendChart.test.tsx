import { render, screen } from "@testing-library/react";
import ContestantTrendChart from "./ContestantTrendChart";
import type { InsightsResponse } from "../../utils/Constants";

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
      />
    );
    expect(container.querySelector(".recharts-responsive-container")).toBeInTheDocument();
    expect(screen.getByText("Favorite")).toBeInTheDocument();
    expect(screen.getByText("Winner")).toBeInTheDocument();
  });
});
