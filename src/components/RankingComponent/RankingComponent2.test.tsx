import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../test/renderWithProviders";
import RankingComponent2 from "./RankingComponent2";
import * as queries from "../../hooks/queries";
import * as util from "../../utils/util";
import type { Show, Season, Episode, Contestant, Ranking } from "../../utils/Constants";

// EpisodeComponent's own render/drag surface is covered by Episode.test.tsx;
// mocking it here isolates RankingComponent2's own state logic
// (activate/reorder/tab-switch/submit) from Episode's rendering and from
// @dnd-kit's pointer pipeline entirely.
vi.mock("../Episode/Episode", () => ({
  default: (props: any) => (
    <div data-testid={`episode-${props.currEpisode.episodeNumber}`}>
      <span data-testid={`active-${props.currEpisode.episodeNumber}`}>
        {props.isActive ? "active" : "inactive"}
      </span>
      <span data-testid={`order-${props.currEpisode.episodeNumber}`}>
        {props.activeContestants.join(",")}
      </span>
      <button onClick={props.onActivate}>activate-{props.currEpisode.episodeNumber}</button>
      <button onClick={() => props.onReorder([...props.activeContestants].reverse())}>
        reorder-{props.currEpisode.episodeNumber}
      </button>
    </div>
  ),
}));

const contestants: Contestant[] = [
  { id: "c1", name: "Alice", seasonId: "se1" },
  { id: "c2", name: "Bob", seasonId: "se1" },
];

const episode1: Episode = { id: "e1", episodeNumber: 1, seasonId: "se1", airDate: "2020-01-01T00:00:00.000Z" };

const season: Season = {
  id: "se1",
  showId: "s1",
  isCurrent: true,
  seasonNumber: 1,
  contestants,
  episodes: [episode1],
};

const show: Show = { id: "s1", name: "Survivor", currSeason: 1, rankingMode: "EPISODE" };
const showTree = { ...show, seasons: [season] };

const loggedInUser = { id: "u1", email: "a@b.com", accountType: "USER" as const };

const emptyQuery = { data: [], isLoading: false, isError: false } as any;

describe("RankingComponent2", () => {
  beforeEach(() => {
    vi.spyOn(queries, "useShows").mockReturnValue({ data: [show], isLoading: false } as any);
    vi.spyOn(queries, "useShowTree").mockReturnValue({ data: showTree, isLoading: false } as any);
    vi.spyOn(queries, "useUserRankings").mockReturnValue(emptyQuery);
    vi.spyOn(queries, "useEliminations").mockReturnValue(emptyQuery);
    vi.spyOn(util, "submitRankings").mockResolvedValue({} as any);
  });

  const renderPage = (preloadedState: any = { user: { value: loggedInUser } }) =>
    renderWithProviders(<RankingComponent2 />, {
      route: "/ranking/survivor",
      routePath: "/ranking/:showSlug",
      preloadedState,
    });

  it("shows the placeholder when not logged in (rankingContainer is gated on user)", () => {
    renderPage({ user: { value: null } });
    expect(screen.queryByTestId("episode-1")).not.toBeInTheDocument();
  });

  it("renders the rankable episode as an inactive slot initially", () => {
    renderPage();
    expect(screen.getByTestId("active-1")).toHaveTextContent("inactive");
  });

  it("shows a placeholder when the season has no contestants", () => {
    vi.spyOn(queries, "useShowTree").mockReturnValue({
      data: { ...showTree, seasons: [{ ...season, contestants: [] }] },
      isLoading: false,
    } as any);
    renderPage();
    expect(screen.getByText("No contestants have been added to this season yet.")).toBeInTheDocument();
  });

  it("shows a placeholder when the season has no rankable episodes", () => {
    vi.spyOn(queries, "useShowTree").mockReturnValue({
      data: { ...showTree, seasons: [{ ...season, episodes: [] }] },
      isLoading: false,
    } as any);
    renderPage();
    expect(screen.getByText("No episodes have been added to this season yet.")).toBeInTheDocument();
  });

  it("activating an episode seeds its order alphabetically (no prior ranking) and adds a remove chip", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByText("activate-1"));
    expect(screen.getByTestId("active-1")).toHaveTextContent("active");
    expect(screen.getByTestId("order-1")).toHaveTextContent("c1,c2");
    expect(screen.getByText(/X Episode 1/)).toBeInTheDocument();
  });

  it("reordering updates the order the mocked EpisodeComponent receives", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByText("activate-1"));
    await user.click(screen.getByText("reorder-1"));
    expect(screen.getByTestId("order-1")).toHaveTextContent("c2,c1");
  });

  it("preserves an active episode's order across Favorite/Winner tab switches", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByText("activate-1"));
    await user.click(screen.getByText("reorder-1"));
    expect(screen.getByTestId("order-1")).toHaveTextContent("c2,c1");

    await user.click(screen.getByText("Winner"));
    // Winner tab has its own independent active set — episode 1 starts
    // inactive there since only Favorite was activated.
    expect(screen.getByTestId("active-1")).toHaveTextContent("inactive");

    await user.click(screen.getByText("Favorite"));
    expect(screen.getByTestId("active-1")).toHaveTextContent("active");
    expect(screen.getByTestId("order-1")).toHaveTextContent("c2,c1");
  });

  it("removing an active episode via its chip clears its active state and order", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByText("activate-1"));
    await user.click(screen.getByText(/X Episode 1/));
    expect(screen.getByTestId("active-1")).toHaveTextContent("inactive");
    expect(screen.queryByText(/X Episode 1/)).not.toBeInTheDocument();
  });

  it("keeps Submit Rankings disabled until an episode is activated", async () => {
    const user = userEvent.setup();
    renderPage();
    const submitButton = screen.getByText("Submit Rankings");
    expect(submitButton.className).toContain("button-inactive");

    await user.click(screen.getByText("activate-1"));
    expect(submitButton.className).not.toContain("button-inactive");
  });

  it("submitting flattens active episodes across both rank types and clears active state on success", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByText("activate-1"));
    await user.click(screen.getByText("Submit Rankings"));
    await user.click(await screen.findByText("Confirm"));

    expect(util.submitRankings).toHaveBeenCalledWith(
      [{ userId: "u1", episodeId: "e1", rankings: ["c1", "c2"], type: "FAVORITE" }],
      expect.anything()
    );

    expect(await screen.findByText("Your rankings have been successfully submitted!")).toBeInTheDocument();
    await user.click(screen.getByText("Close"));
    expect(screen.getByTestId("active-1")).toHaveTextContent("inactive");
  });

  it("renders an already-submitted episode as a past-rankings column instead of the (mocked) EpisodeComponent", () => {
    const pastRanking: Ranking = {
      id: "r1",
      userId: "u1",
      episodeId: "e1",
      type: "FAVORITE",
      contestantIds: ["c2", "c1"],
      episode: { ...episode1 },
    };
    vi.spyOn(queries, "useUserRankings").mockReturnValue({ data: [pastRanking], isLoading: false } as any);
    renderPage();
    expect(screen.queryByTestId("episode-1")).not.toBeInTheDocument();
    expect(screen.getByText("BOB")).toBeInTheDocument();
    expect(screen.getByText("ALICE")).toBeInTheDocument();
  });
});
