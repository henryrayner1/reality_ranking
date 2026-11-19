import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
    expect(screen.queryByText("Predicted to go home")).not.toBeInTheDocument();
  });

  it("adds the prediction rank line when ranks are given, even with no ranking data", () => {
    render(
      <ContestantTrendChart
        contestantId="c1"
        favoriteInsights={emptyInsights}
        winnerInsights={emptyInsights}
        contestantCount={10}
        eliminations={[]}
        predictionRanks={new Map([[1, 3], [2, 1]])}
      />
    );
    expect(screen.getByText("Predicted to go home")).toBeInTheDocument();
  });

  it("toggles each line from its legend button, all on by default", async () => {
    const user = userEvent.setup();
    const favoriteInsights = insightsWithData([{ episodeNumber: 1, averagePosition: 2 }, { episodeNumber: 2, averagePosition: 3 }]);
    const { container } = render(
      <ContestantTrendChart
        contestantId="c1"
        favoriteInsights={favoriteInsights}
        winnerInsights={emptyInsights}
        contestantCount={10}
        eliminations={[]}
        predictionRanks={new Map([[1, 3]])}
      />
    );
    const buttons = screen.getAllByRole("button");
    expect(buttons.map((b) => b.textContent)).toEqual(["Favorite", "Winner", "Predicted to go home", "Number of Contestants"]);
    buttons.forEach((b) => expect(b).toHaveAttribute("aria-pressed", "true"));
    const lineCount = () => container.querySelectorAll(".recharts-line").length;
    const before = lineCount();

    const favorite = screen.getByRole("button", { name: "Favorite" });
    await user.click(favorite);
    expect(favorite).toHaveAttribute("aria-pressed", "false");
    expect(lineCount()).toBe(before - 1);

    await user.click(favorite);
    expect(favorite).toHaveAttribute("aria-pressed", "true");
    expect(lineCount()).toBe(before);
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
