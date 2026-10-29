import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ContestantDetailPanel from "./ContestantDetailPanel";
import type { Contestant, EliminationEntry, InsightsResponse, Season, Show } from "../../../utils/Constants";

const show: Show = { id: "show1", name: "Survivor", currSeason: 1 };

const makeContestant = (id: string, name: string): Contestant => ({ id, name, seasonId: "se1" });

const season: Season = {
  id: "se1",
  showId: "show1",
  isCurrent: true,
  seasonNumber: 1,
  contestants: [makeContestant("c2", "Bob"), makeContestant("c1", "Alice")],
};

const insights: InsightsResponse = { seasonId: "se1", type: "FAVORITE", episodes: [], overall: [] };

const baseProps = {
  currShow: show,
  currSeason: season,
  favoriteInsights: insights,
  winnerInsights: insights,
  eliminations: [] as EliminationEntry[],
  selectedContestantId: null,
  setSelectedContestantId: () => {},
  loadingFlag: false,
};

describe("ContestantDetailPanel", () => {
  it("shows a loading state while loadingFlag is set", () => {
    const { container } = render(<ContestantDetailPanel {...baseProps} loadingFlag />);
    expect(container.querySelector(".page-loading")).toBeInTheDocument();
  });

  it("shows a placeholder, not a spinner, when the show has no seasons", () => {
    const { container } = render(<ContestantDetailPanel {...baseProps} currSeason={null} />);
    expect(container.querySelector(".page-loading")).not.toBeInTheDocument();
    expect(screen.getByText("No contestants have been added to this season yet.")).toBeInTheDocument();
  });

  it("shows a placeholder when the season has no contestants", () => {
    render(<ContestantDetailPanel {...baseProps} currSeason={{ ...season, contestants: [] }} />);
    expect(screen.getByText("No contestants have been added to this season yet.")).toBeInTheDocument();
  });

  it("lists contestants alphabetically regardless of roster order", () => {
    render(<ContestantDetailPanel {...baseProps} />);
    const names = screen.getAllByText(/^(Alice|Bob)$/, { selector: "span" }).map((el) => el.textContent);
    expect(names).toEqual(["Alice", "Bob"]);
  });

  it("shows a placeholder until a contestant is selected", () => {
    render(<ContestantDetailPanel {...baseProps} />);
    expect(screen.getByText("Select a contestant to view their insights.")).toBeInTheDocument();
  });

  it("selecting a contestant calls setSelectedContestantId", async () => {
    const user = userEvent.setup();
    const setSelectedContestantId = vi.fn();
    render(<ContestantDetailPanel {...baseProps} setSelectedContestantId={setSelectedContestantId} />);
    await user.click(screen.getByText("Alice"));
    expect(setSelectedContestantId).toHaveBeenCalledWith("c1");
  });

  it("the mobile dropdown shows the selected contestant and selects another", async () => {
    const user = userEvent.setup();
    const setSelectedContestantId = vi.fn();
    render(<ContestantDetailPanel {...baseProps} selectedContestantId="c1" setSelectedContestantId={setSelectedContestantId} />);
    const toggle = screen.getByRole("button", { name: /Alice/ });
    expect(toggle).toHaveClass("contestant-dropdown-toggle");

    await user.click(toggle);
    const bobItem = screen.getAllByText("Bob").find((el) => el.closest(".contestant-dropdown-item"))!;
    await user.click(bobItem);
    expect(setSelectedContestantId).toHaveBeenCalledWith("c2");
  });

  it("shows the elimination badge for an eliminated selected contestant", () => {
    const eliminations: EliminationEntry[] = [
      { id: "el1", episodeId: "e1", contestantId: "c1", eliminationType: "ELIMINATED", episode: { id: "e1", episodeNumber: 4, seasonId: "se1" } } as any,
    ];
    render(<ContestantDetailPanel {...baseProps} selectedContestantId="c1" eliminations={eliminations} />);
    expect(screen.getByText("Eliminated Episode 4")).toBeInTheDocument();
  });

  it("shows no elimination badge for an active selected contestant", () => {
    render(<ContestantDetailPanel {...baseProps} selectedContestantId="c2" />);
    expect(screen.queryByText(/Eliminated Episode/)).not.toBeInTheDocument();
  });
});
