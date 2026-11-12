import { render, screen, within } from "@testing-library/react";
import PredictionHistory from "./PredictionHistory";
import type { Contestant, Episode, Prediction, Season } from "../../../utils/Constants";

const contestants: Contestant[] = [
  { id: "a", name: "Alice Smith", seasonId: "se1" },
  { id: "b", name: "Bob Jones", seasonId: "se1" },
  { id: "c", name: "Cara Lee", seasonId: "se1" },
];
const season = { id: "se1", showId: "s1", isCurrent: true, seasonNumber: 1, contestants } as Season;
const elim = (contestantId: string, placement: number | null = null) => ({ id: contestantId, episodeId: "", contestantId, eliminationType: "ELIMINATED", placement });

const episodes = [
  { id: "e4", episodeNumber: 4, seasonId: "se1", isFinale: true, eliminations: [elim("b", 1), elim("c", 2)] },
  { id: "e3", episodeNumber: 3, seasonId: "se1", eliminationCount: 0, eliminations: [] },
  { id: "e2", episodeNumber: 2, seasonId: "se1", eliminations: [] },
  { id: "e1", episodeNumber: 1, seasonId: "se1", eliminations: [elim("a")] },
] as unknown as Episode[];

const predictions = new Map<string, Prediction>([
  ["e1", { id: "p1", episodeId: "e1", contestantIds: ["b"], updatedAt: "" }],
  ["e4", { id: "p4", episodeId: "e4", contestantIds: ["b", "c"], updatedAt: "" }],
]);

const rowFor = (heading: string) => screen.getByText(heading).closest("li") as HTMLElement;

describe("PredictionHistory", () => {
  it("marks a wrong pick and shows who actually left", () => {
    render(<PredictionHistory episodes={episodes} predictionsByEpisode={predictions} season={season} loggedIn />);
    const row = rowFor("Episode 1");
    expect(within(row).getByLabelText("Wrong")).toBeInTheDocument();
    expect(within(row).getByAltText("Alice Smith")).toBeInTheDocument();
  });

  it("shows pending, no-elimination and missing-prediction states", () => {
    render(<PredictionHistory episodes={episodes} predictionsByEpisode={predictions} season={season} loggedIn />);
    expect(within(rowFor("Episode 2")).getByText("Results pending")).toBeInTheDocument();
    expect(within(rowFor("Episode 2")).getByText("No prediction")).toBeInTheDocument();
    expect(within(rowFor("Episode 3")).getByText("No elimination")).toBeInTheDocument();
  });

  it("scores a finale prediction by placement and names the winner", () => {
    render(<PredictionHistory episodes={episodes} predictionsByEpisode={predictions} season={season} loggedIn />);
    const row = rowFor("Episode 4");
    expect(within(row).getAllByLabelText("Correct")).toHaveLength(2);
    expect(within(row).getByText("Winner: Bob Jones")).toBeInTheDocument();
  });

  it("hides the user's picks when logged out", () => {
    render(<PredictionHistory episodes={episodes} predictionsByEpisode={new Map()} season={season} loggedIn={false} />);
    expect(screen.queryByText("Your pick")).not.toBeInTheDocument();
    expect(screen.getAllByText("Eliminated").length).toBeGreaterThan(0);
  });
});
