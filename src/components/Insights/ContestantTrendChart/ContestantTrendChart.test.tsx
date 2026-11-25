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
    expect(screen.getByText("Contestants")).toBeInTheDocument();
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

  it("draws the finale's predicted placement as one marker with its own toggle", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <ContestantTrendChart
        contestantId="c1"
        favoriteInsights={insightsWithData([{ episodeNumber: 1, averagePosition: 2 }])}
        winnerInsights={emptyInsights}
        contestantCount={10}
        eliminations={[]}
        predictionRanks={new Map([[1, 3]])}
        predictedPlacement={{ episodeNumber: 2, averagePlacement: 1.4, position: 1 }}
        eliminationInfo={{ episodeNumber: 2, eliminationType: "WINNER", placement: 1 }}
      />
    );
    expect(screen.getAllByRole("button").map((b) => b.textContent)).toEqual([
      "Favorite", "Winner", "Predicted to go home", "Predicted finish", "Contestants",
    ]);
    expect(container.querySelectorAll(".trend-chart-placement-marker")).toHaveLength(1);
    await user.click(screen.getByRole("button", { name: "Predicted finish" }));
    expect(container.querySelectorAll(".trend-chart-placement-marker")).toHaveLength(0);
  });

  it("draws the Winner line dotted into the elimination episode, and only there", async () => {
    const user = userEvent.setup();
    const winnerInsights: InsightsResponse = { ...insightsWithData([
      { episodeNumber: 1, averagePosition: 2 },
      { episodeNumber: 2, averagePosition: 3 },
      { episodeNumber: 3, averagePosition: 8 },
    ]), type: "WINNER" };
    const renderFor = (eliminationInfo: { episodeNumber: number; eliminationType: string; placement?: number | null }) =>
      render(
        <ContestantTrendChart
          contestantId="c1"
          favoriteInsights={emptyInsights}
          winnerInsights={winnerInsights}
          contestantCount={10}
          eliminations={[]}
          eliminationInfo={eliminationInfo}
        />
      );
    const winnerPath = (container: HTMLElement) =>
      [...container.querySelectorAll("path.recharts-line-curve")].find((path) => path.getAttribute("stroke") === "#2b7fb8");

    // Eliminated in episode 3: the Winner line is masked so its last segment
    // (episode 2 -> 3) shows dotted.
    const eliminated = renderFor({ episodeNumber: 3, eliminationType: "ELIMINATED" });
    const maskRef = winnerPath(eliminated.container)?.getAttribute("mask");
    expect(maskRef).toMatch(/^url\(#winner-tail-/);
    const mask = eliminated.container.querySelector(`mask#${maskRef!.slice(5, -1)}`);
    expect(mask).toBeInTheDocument();
    // The masked strip spans exactly the gap between episodes 2 and 3.
    const strip = mask!.querySelectorAll("rect")[1];
    expect(Number(strip.getAttribute("width"))).toBeGreaterThan(0);
    // The Winner toggle hides the (masked) line along with everything else.
    await user.click(screen.getByRole("button", { name: "Winner" }));
    expect(winnerPath(eliminated.container)).toBeUndefined();
    eliminated.unmount();

    // A finalist's last point is a real average, so the line isn't masked.
    const finalist = renderFor({ episodeNumber: 3, eliminationType: "WINNER", placement: 1 });
    expect(winnerPath(finalist.container)?.getAttribute("mask")).toBeNull();
    expect(finalist.container.querySelector("mask")).not.toBeInTheDocument();
  });

  it("keeps the finale on the X axis for everyone, without plotting anything there", () => {
    const { container } = render(
      <ContestantTrendChart
        contestantId="c1"
        favoriteInsights={insightsWithData([{ episodeNumber: 1, averagePosition: 2 }, { episodeNumber: 2, averagePosition: 3 }])}
        winnerInsights={emptyInsights}
        contestantCount={10}
        eliminations={[]}
        finaleEpisodeNumber={4}
      />
    );
    // jsdom's stubbed sizes make recharts drop overlapping labels, so only
    // check the axis ends at the finale.
    const ticks = [...container.querySelectorAll(".recharts-xAxis-tick-labels text")].map((t) => t.textContent);
    expect(ticks.at(-1)).toBe("4");
  });

  it("still shows the empty state when the finale is the only episode", () => {
    render(
      <ContestantTrendChart
        contestantId="c1"
        favoriteInsights={emptyInsights}
        winnerInsights={emptyInsights}
        contestantCount={10}
        eliminations={[]}
        finaleEpisodeNumber={4}
      />
    );
    expect(screen.getByText("No ranking submissions yet for this contestant.")).toBeInTheDocument();
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
    expect(buttons.map((b) => b.textContent)).toEqual(["Favorite", "Winner", "Predicted to go home", "Contestants"]);
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

  it("still counts a contestant in the episode they go home, and shrinks from the next one", () => {
    expect([...getFieldSizeByEpisode(10, [elim("a", 2)], [1, 2, 3]).values()]).toEqual([10, 10, 9]);
  });

  it("counts a duplicate elimination entry for one contestant only once", () => {
    expect([...getFieldSizeByEpisode(10, [elim("a", 2), elim("a", 2)], [1, 2, 3]).values()]).toEqual([10, 10, 9]);
  });

  it("drops by two for a double elimination", () => {
    expect([...getFieldSizeByEpisode(10, [elim("a", 2), elim("b", 2), elim("c", 3)], [1, 2, 3, 4]).values()]).toEqual([10, 10, 8, 7]);
  });
});
