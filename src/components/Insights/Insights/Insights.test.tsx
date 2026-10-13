import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../../test/renderWithProviders";
import Insights from "./Insights";
import * as queries from "../../../hooks/queries";
import type { Show } from "../../../utils/Constants";

vi.mock("../InsightsRankingTable/InsightsRankingTable", () => ({ default: () => <div>ranking-table</div> }));
vi.mock("../ContestantDetailPanel/ContestantDetailPanel", () => ({ default: () => <div>contestant-panel</div> }));

const show: Show = { id: "s1", name: "Survivor", currSeason: 1 };
const showTree = {
  ...show,
  seasons: [{ id: "se1", showId: "s1", isCurrent: true, contestants: [], seasonNumber: 1 }],
};

const emptyQuery = { data: undefined, isLoading: false, isError: false } as any;

describe("Insights", () => {
  beforeEach(() => {
    vi.spyOn(queries, "useShows").mockReturnValue({ data: [show], isLoading: false } as any);
    vi.spyOn(queries, "useShowTree").mockReturnValue({ data: showTree, isLoading: false } as any);
    vi.spyOn(queries, "useRankingsInsights").mockReturnValue(emptyQuery);
    vi.spyOn(queries, "useEliminationsBySeason").mockReturnValue(emptyQuery);
    vi.spyOn(queries, "useUserRankings").mockReturnValue(emptyQuery);
  });

  it("shows the placeholder when no show is selected", () => {
    vi.spyOn(queries, "useShowTree").mockReturnValue({ data: null, isLoading: false } as any);
    renderWithProviders(<Insights />, { route: "/insights", routePath: "/insights" });
    expect(screen.getByText("Please select a show.")).toBeInTheDocument();
  });

  it("defaults to the Rankings Table page mode", () => {
    renderWithProviders(<Insights />, { route: "/insights/survivor", routePath: "/insights/:showSlug" });
    expect(screen.getByText("ranking-table")).toBeInTheDocument();
  });

  it("switches to the By Contestant page mode", async () => {
    const user = userEvent.setup();
    renderWithProviders(<Insights />, { route: "/insights/survivor", routePath: "/insights/:showSlug" });
    await user.click(screen.getByText("By Contestant"));
    expect(screen.getByText("contestant-panel")).toBeInTheDocument();
  });

  it("shows the current season number for a show with seasons", () => {
    renderWithProviders(<Insights />, { route: "/insights/survivor", routePath: "/insights/:showSlug" });
    expect(screen.getByRole("heading", { name: "Current Season: 1" })).toBeInTheDocument();
    // Single-season show: nothing else to pick, so no picker.
    expect(screen.queryByText("Viewing:")).not.toBeInTheDocument();
  });

  it("omits the current-season heading for a show with no seasons", () => {
    vi.spyOn(queries, "useShowTree").mockReturnValue({ data: { ...show, seasons: [] }, isLoading: false } as any);
    renderWithProviders(<Insights />, { route: "/insights/survivor", routePath: "/insights/:showSlug" });
    expect(screen.queryByText(/Current Season:/)).not.toBeInTheDocument();
  });

  it("offers a season picker, defaulting to the current season, when the show has past seasons", () => {
    vi.spyOn(queries, "useShowTree").mockReturnValue({
      data: {
        ...show,
        currSeason: 2,
        seasons: [
          { id: "se1", showId: "s1", isCurrent: false, contestants: [], seasonNumber: 1 },
          { id: "se2", showId: "s1", isCurrent: true, contestants: [], seasonNumber: 2 },
        ],
      },
      isLoading: false,
    } as any);
    renderWithProviders(<Insights />, { route: "/insights/survivor", routePath: "/insights/:showSlug" });
    expect(screen.getByRole("heading", { name: "Current Season: 2" })).toBeInTheDocument();
    expect(screen.getByText("Viewing:")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Season 2" })).toBeInTheDocument();
  });

  it("hides the data-scope toggle when logged out", () => {
    renderWithProviders(<Insights />, { route: "/insights/survivor", routePath: "/insights/:showSlug" });
    expect(screen.queryByText("My Submissions")).not.toBeInTheDocument();
  });

  it("shows the data-scope toggle when logged in, defaulting to All User Data", () => {
    renderWithProviders(<Insights />, {
      route: "/insights/survivor",
      routePath: "/insights/:showSlug",
      preloadedState: { user: { value: { id: "u1", email: "a@b.com", accountType: "USER" } } },
    });
    const allDataRadio = screen.getByLabelText("All User Data") as HTMLInputElement;
    expect(allDataRadio.checked).toBe(true);
  });

  it("lets a logged-in user switch to My Submissions", async () => {
    const user = userEvent.setup();
    renderWithProviders(<Insights />, {
      route: "/insights/survivor",
      routePath: "/insights/:showSlug",
      preloadedState: { user: { value: { id: "u1", email: "a@b.com", accountType: "USER" } } },
    });
    await user.click(screen.getByLabelText("My Submissions"));
    expect((screen.getByLabelText("My Submissions") as HTMLInputElement).checked).toBe(true);
  });
});
