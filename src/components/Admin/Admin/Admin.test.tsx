import { screen } from "@testing-library/react";
import { renderWithProviders } from "../../../test/renderWithProviders";
import Admin from "./Admin";
import * as queries from "../../../hooks/queries";

vi.mock("../AdminShows/AdminShows", () => ({ default: ({ showId }: { showId?: string }) => <div>show-bar:{showId ?? "none"}</div> }));
vi.mock("../AdminSeasons/AdminSeasons", () => ({ default: ({ showId, seasonId }: { showId: string; seasonId?: string }) => <div>season-bar:{showId}:{seasonId ?? "none"}</div> }));
vi.mock("../AdminContestants/AdminContestants", () => ({ default: ({ seasonId }: { seasonId: string }) => <div>contestants:{seasonId}</div> }));
vi.mock("../AdminEpisodes/AdminEpisodes", () => ({ default: ({ seasonId }: { seasonId: string }) => <div>episodes:{seasonId}</div> }));
vi.mock("../AdminEliminations/AdminEliminations", () => ({ default: ({ seasonId }: { seasonId: string }) => <div>eliminations:{seasonId}</div> }));

const survivorSeasons = [
  { id: "se1", showId: "s1", seasonNumber: 1, isCurrent: false, contestants: [] },
  { id: "se2", showId: "s1", seasonNumber: 2, isCurrent: true, contestants: [] },
  { id: "se3", showId: "s1", seasonNumber: 3, isCurrent: false, contestants: [] },
];
const shows = [
  { id: "s1", name: "Survivor", currSeason: 2, seasons: survivorSeasons },
  { id: "s2", name: "Big Brother", currSeason: 1, seasons: [] },
];

describe("Admin", () => {
  beforeEach(() => {
    vi.spyOn(queries, "useShows").mockReturnValue({ data: shows, isLoading: false } as any);
    vi.spyOn(queries, "useSeasons").mockImplementation((showId) => ({
      data: shows.find(s => s.id === showId)?.seasons ?? [],
      isLoading: false,
      isError: false,
    }) as any);
  });

  it("shows only the show bar and an empty state on a bare /admin", () => {
    renderWithProviders(<Admin />, { route: "/admin", routePath: "/admin" });
    expect(screen.getByText("show-bar:none")).toBeInTheDocument();
    expect(screen.queryByText(/season-bar/)).not.toBeInTheDocument();
    expect(screen.getByText(/Select or add a show/)).toBeInTheDocument();
  });

  it("resolves the show from the slug and defaults to its current season", () => {
    renderWithProviders(<Admin />, { route: "/admin/survivor", routePath: "/admin/:showSlug" });
    expect(screen.getByText("show-bar:s1")).toBeInTheDocument();
    expect(screen.getByText("season-bar:s1:se2")).toBeInTheDocument();
    expect(screen.getByText("contestants:se2")).toBeInTheDocument();
    expect(screen.getByText("episodes:se2")).toBeInTheDocument();
    expect(screen.getByText("eliminations:se2")).toBeInTheDocument();
  });

  it("uses the season number from the URL when present", () => {
    renderWithProviders(<Admin />, { route: "/admin/survivor/3", routePath: "/admin/:showSlug/:seasonNumber" });
    expect(screen.getByText("season-bar:s1:se3")).toBeInTheDocument();
    expect(screen.getByText("contestants:se3")).toBeInTheDocument();
  });

  it("falls back to the current season when the URL's season doesn't exist", () => {
    renderWithProviders(<Admin />, { route: "/admin/survivor/99", routePath: "/admin/:showSlug/:seasonNumber" });
    expect(screen.getByText("contestants:se2")).toBeInTheDocument();
  });

  it("prompts to add a season when the show has none", () => {
    renderWithProviders(<Admin />, { route: "/admin/big-brother", routePath: "/admin/:showSlug" });
    expect(screen.getByText("season-bar:s2:none")).toBeInTheDocument();
    expect(screen.getByText(/Add a season to start editing/)).toBeInTheDocument();
    expect(screen.queryByText(/contestants:/)).not.toBeInTheDocument();
  });
});
