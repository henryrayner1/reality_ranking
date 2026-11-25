import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PredictionInsights from "./PredictionInsights";
import type { PredictionInsightsEpisode, Season, Show } from "../../../utils/Constants";

const past = (days: number) => new Date(Date.now() - days * 86400000).toISOString();
const elim = (contestantId: string, placement: number | null = null) => ({ id: contestantId, episodeId: "", contestantId, eliminationType: "ELIMINATED", placement });

const contestants = ["Ann Ash", "Bea Bell", "Cal Cole", "Dee Dunn", "Eve Eng"].map((name, i) => ({
  id: "abcde"[i],
  name,
  seasonId: "se1",
}));

const season = {
  id: "se1", showId: "s1", isCurrent: true, seasonNumber: 1, contestants,
  episodes: [
    { id: "e1", episodeNumber: 1, seasonId: "se1", airDate: past(14), eliminations: [elim("a")] },
    { id: "e2", episodeNumber: 2, seasonId: "se1", airDate: past(7), eliminationCount: 0, eliminations: [] },
    { id: "e3", episodeNumber: 3, seasonId: "se1", airDate: past(1), isFinale: true, eliminations: [elim("c", 1), elim("b", 2)] },
  ],
} as unknown as Season;
const show: Show = { id: "s1", name: "Survivor", currSeason: 1 };

const insights: PredictionInsightsEpisode[] = [
  { episodeId: "e1", episodeNumber: 1, isFinale: false, predictorCount: 4, votes: { a: 2, b: 2 } },
  { episodeId: "e3", episodeNumber: 3, isFinale: true, predictorCount: 2, votes: { c: 2 }, placementVotes: { c: [2], b: [0, 1, 1], d: [0, 1, 0, 1], e: [0, 0, 1, 1] } },
];

const rowFor = (heading: string) => screen.getByText(heading).closest("li") as HTMLElement;

const renderView = (data = insights) =>
  render(<PredictionInsights currSeason={season} currShow={show} insights={data} loadingFlag={false} />);

describe("PredictionInsights", () => {
  it("shows every contestant tied for most predicted with their percentage", () => {
    renderView();
    const row = rowFor("Episode 1");
    const most = within(row).getByText("Most predicted to go home").parentElement as HTMLElement;
    expect(within(most).getByText("Ann")).toBeInTheDocument();
    expect(within(most).getByText("Bea")).toBeInTheDocument();
    expect(within(most).getAllByText("50%")).toHaveLength(2);
  });

  it("shows the top three bars and the rest in the View all modal", async () => {
    const user = userEvent.setup();
    renderView();
    const row = rowFor("Episode 1");
    expect(within(row).getAllByRole("meter")).toHaveLength(3);
    await user.click(within(row).getByRole("button", { name: "View all" }));
    expect(screen.getByText("Episode 1: predicted to go home")).toBeInTheDocument();
    // All five contestants were still in going into episode 1.
    const modalBody = document.querySelector(".insights-view-all-body") as HTMLElement;
    expect(within(modalBody).getAllByRole("meter")).toHaveLength(5);
  });

  it("labels the finale as predicted to win and counts predictors", () => {
    renderView();
    const row = rowFor("Episode 3");
    expect(within(row).getByText("Most predicted to win")).toBeInTheDocument();
    expect(within(row).getByText("Final results")).toBeInTheDocument();
    expect(within(row).getByText("2 predictions")).toBeInTheDocument();
  });

  it("shows the finale's consensus predicted order, with everyone in View all", async () => {
    const user = userEvent.setup();
    renderView();
    const row = rowFor("Episode 3");
    const order = within(row).getByText("Predicted final order").parentElement as HTMLElement;
    // c avg 1, b avg 2.5, d avg 3, e avg 3.5 (only top three shown).
    expect(within(order).getByText("1. Cal")).toBeInTheDocument();
    expect(within(order).getByText("2. Bea")).toBeInTheDocument();
    expect(within(order).getByText("avg 2.5")).toBeInTheDocument();
    expect(within(order).getByText("3. Dee")).toBeInTheDocument();
    expect(within(order).queryByText("4. Eve")).not.toBeInTheDocument();
    await user.click(within(row).getByRole("button", { name: "View all" }));
    expect(screen.getByText("Episode 3: predicted final order")).toBeInTheDocument();
    const modalBody = document.querySelector(".insights-view-all-body") as HTMLElement;
    expect(within(modalBody).getByText("4. Eve")).toBeInTheDocument();
  });

  it("marks aired episodes nobody predicted, and no-elimination episodes", () => {
    renderView();
    const row = rowFor("Episode 2");
    expect(within(row).getAllByText("No predictions")).toHaveLength(2);
    expect(within(row).getByText("No elimination")).toBeInTheDocument();
  });

  it("shows an empty state with no predictions at all", () => {
    renderView([]);
    expect(screen.getByText(/No predictions yet/)).toBeInTheDocument();
  });

  it("uses full names on Display full name shows", () => {
    render(<PredictionInsights currSeason={season} currShow={{ ...show, displayFullName: true }} insights={insights} loadingFlag={false} />);
    expect(within(rowFor("Episode 1")).getAllByText("Ann Ash").length).toBeGreaterThan(0);
  });
});
