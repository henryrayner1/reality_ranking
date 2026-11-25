import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../../test/renderWithProviders";
import Predictions from "./Predictions";
import * as util from "../../../utils/util";

const loggedInUser = { id: "u1", email: "u@example.com", accountType: "USER" };
const future = () => new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();
const past = () => new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();

const makeShows = (overrides: Record<string, unknown> = {}, episodes?: unknown[]) => [
  {
    id: "s1",
    name: "Survivor",
    currSeason: 1,
    rankingMode: "EPISODE",
    ...overrides,
    seasons: [
      {
        id: "se1",
        showId: "s1",
        isCurrent: true,
        seasonNumber: 1,
        contestants: [
          { id: "a", name: "Alice Smith", seasonId: "se1" },
          { id: "b", name: "Bob Jones", seasonId: "se1" },
        ],
        episodes: episodes ?? [
          { id: "e1", episodeNumber: 1, seasonId: "se1", airDate: past(), eliminationCount: 1, eliminations: [] },
          { id: "e2", episodeNumber: 2, seasonId: "se1", airDate: future(), eliminationCount: 1, eliminations: [] },
        ],
      },
    ],
  },
];

const renderPage = (route = "/predictions/survivor", preloadedState: any = { user: { value: loggedInUser } }) =>
  renderWithProviders(<Predictions />, {
    route,
    routePath: route === "/predictions" ? "/predictions" : "/predictions/:showSlug",
    preloadedState,
  });

describe("Predictions", () => {
  beforeEach(() => {
    vi.spyOn(util, "getShows").mockResolvedValue(makeShows() as any);
    vi.spyOn(util, "getMyPredictions").mockResolvedValue([]);
  });

  afterEach(() => vi.restoreAllMocks());

  it("shows the loading circle, not an empty show dropdown, while the show list loads", () => {
    // Never resolves, like a backend still cold-starting.
    vi.spyOn(util, "getShows").mockReturnValue(new Promise(() => {}));
    for (const route of ["/predictions", "/predictions/survivor"]) {
      const { container, unmount } = renderPage(route);
      expect(container.querySelector(".loading-circle")).toBeInTheDocument();
      expect(screen.queryByText("Show:")).not.toBeInTheDocument();
      expect(screen.queryByText("Please select a show.")).not.toBeInTheDocument();
      unmount();
    }
  });

  it("asks for a show when none is selected", async () => {
    renderPage("/predictions");
    expect(await screen.findByText("Please select a show.")).toBeInTheDocument();
  });

  it("lets a user pick and submit for the next episode", async () => {
    const user = userEvent.setup();
    const save = vi.spyOn(util, "savePrediction").mockResolvedValue({ id: "p", episodeId: "e2", contestantIds: ["a"], updatedAt: "x" });
    renderPage();
    expect(await screen.findByText("Episode 2")).toBeInTheDocument();
    await user.click(await screen.findByRole("button", { name: "Alice Smith" }));
    await user.click(screen.getByRole("button", { name: "Submit Prediction" }));
    await waitFor(() => expect(save).toHaveBeenCalledWith("e2", ["a"]));
    // Episode 1 already aired, so it's in the history instead.
    expect(screen.getByText("Episode 1")).toBeInTheDocument();
  });

  it("lists the contestants alphabetically by displayed name", async () => {
    const shows = makeShows();
    shows[0].seasons[0].contestants = [
      { id: "z", name: "zoe Park", seasonId: "se1" },
      { id: "b", name: "Bob Jones", seasonId: "se1" },
      { id: "a", name: "Zed Smith", nickname: "Al", seasonId: "se1" } as any,
    ];
    vi.spyOn(util, "getShows").mockResolvedValue(shows as any);
    renderPage();
    await screen.findByRole("button", { name: "Bob Jones" });
    const names = screen.getAllByRole("button", { pressed: false }).map((b) => b.getAttribute("aria-label"));
    expect(names).toEqual(["Zed Smith", "Bob Jones", "zoe Park"]);
  });

  it("shows a saved prediction as a summary instead of the picker", async () => {
    vi.spyOn(util, "getMyPredictions").mockResolvedValue([{ id: "p", episodeId: "e2", contestantIds: ["b"], updatedAt: "x" }]);
    renderPage();
    expect(await screen.findByText(/You have predicted/)).toHaveTextContent("Bob will go home this episode.");
    expect(screen.getByRole("button", { name: "Update Prediction" })).toBeEnabled();
  });

  it("asks logged-out users to log in", async () => {
    renderPage("/predictions/survivor", { user: { value: null } });
    expect(await screen.findByText("Log in to make predictions.")).toBeInTheDocument();
  });

  it("shows the finale predictor when the next episode is the finale", async () => {
    vi.spyOn(util, "getShows").mockResolvedValue(
      makeShows({}, [{ id: "e9", episodeNumber: 9, seasonId: "se1", airDate: future(), isFinale: true, eliminations: [] }]) as any
    );
    renderPage();
    expect(await screen.findByText(/It's the finale!/)).toBeInTheDocument();
  });

  it("explains that daily shows aren't supported", async () => {
    vi.spyOn(util, "getShows").mockResolvedValue(makeShows({ rankingMode: "DAILY" }) as any);
    renderPage();
    expect(await screen.findByText("Predictions aren't available for daily shows yet.")).toBeInTheDocument();
  });

  it("says when no next episode is scheduled", async () => {
    vi.spyOn(util, "getShows").mockResolvedValue(
      makeShows({}, [{ id: "e1", episodeNumber: 1, seasonId: "se1", airDate: past(), eliminations: [] }]) as any
    );
    renderPage();
    expect(await screen.findByText(/hasn't been scheduled yet/)).toBeInTheDocument();
  });
});
