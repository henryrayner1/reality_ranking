import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../test/renderWithProviders";
import Admin from "./Admin";
import * as queries from "../../hooks/queries";

vi.mock("./AdminShows", () => ({ default: () => <div>shows-page</div> }));
vi.mock("./AdminSeasons", () => ({ default: ({ showId }: { showId?: string }) => <div>seasons-page:{showId}</div> }));
vi.mock("./AdminContestants", () => ({ default: ({ showId }: { showId?: string }) => <div>contestants-page:{showId}</div> }));
vi.mock("./AdminEpisodes", () => ({ default: ({ showId }: { showId?: string }) => <div>episodes-page:{showId}</div> }));
vi.mock("./AdminEliminations", () => ({ default: ({ showId }: { showId?: string }) => <div>eliminations-page:{showId}</div> }));

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return { ...actual, useNavigate: () => mockNavigate };
});

const shows = [
  { id: "s1", name: "Survivor", currSeason: 1 },
  { id: "s2", name: "Big Brother", currSeason: 2 },
];

describe("Admin", () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    vi.spyOn(queries, "useShows").mockReturnValue({ data: shows, isLoading: false } as any);
  });

  it("defaults to the Shows tab", () => {
    renderWithProviders(<Admin />, { route: "/admin", routePath: "/admin" });
    expect(screen.getByText("shows-page")).toBeInTheDocument();
  });

  it("resolves showId from the URL slug for a show-scoped tab", async () => {
    const user = userEvent.setup();
    renderWithProviders(<Admin />, { route: "/admin/survivor", routePath: "/admin/:showSlug" });
    await user.click(screen.getByText("Seasons"));
    expect(screen.getByText("seasons-page:s1")).toBeInTheDocument();
  });

  it("navigates to the first show when switching to a show-scoped tab with none selected", async () => {
    const user = userEvent.setup();
    renderWithProviders(<Admin />, { route: "/admin", routePath: "/admin" });
    await user.click(screen.getByText("Episodes"));
    expect(mockNavigate).toHaveBeenCalledWith("/admin/survivor");
  });

  it("navigates back to /admin when clicking Shows from a show-scoped URL", async () => {
    const user = userEvent.setup();
    renderWithProviders(<Admin />, { route: "/admin/survivor", routePath: "/admin/:showSlug" });
    await user.click(screen.getByText("Shows"));
    expect(mockNavigate).toHaveBeenCalledWith("/admin");
  });
});
