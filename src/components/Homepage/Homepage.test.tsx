import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../test/renderWithProviders";
import Homepage from "./Homepage";
import * as queries from "../../hooks/queries";
import type { Season, Show } from "../../utils/Constants";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return { ...actual, useNavigate: () => mockNavigate };
});

const makeShow = (overrides: Partial<Show> = {}): Show => ({
  id: "s1",
  name: "Survivor",
  currSeason: 1,
  ...overrides,
});

describe("Homepage", () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  it("shows PageLoading while shows are loading", () => {
    vi.spyOn(queries, "useShows").mockReturnValue({ data: undefined, isLoading: true } as any);
    const { container } = renderWithProviders(<Homepage openAuthModal={() => {}} />);
    expect(container.querySelector(".page-loading")).toBeInTheDocument();
  });

  it("shows the empty state when there are no shows", () => {
    vi.spyOn(queries, "useShows").mockReturnValue({ data: [], isLoading: false } as any);
    renderWithProviders(<Homepage openAuthModal={() => {}} />);
    expect(screen.getByText("No shows have been added yet.")).toBeInTheDocument();
  });

  it("renders a fallback gradient tile (first letter) for a show with no logo", () => {
    vi.spyOn(queries, "useShows").mockReturnValue({ data: [makeShow({ name: "Unknown Show" })], isLoading: false } as any);
    renderWithProviders(<Homepage openAuthModal={() => {}} />);
    expect(screen.getByText("U")).toBeInTheDocument();
  });

  it("renders a show's uploaded logo on its card", () => {
    vi.spyOn(queries, "useShows").mockReturnValue({ data: [makeShow({ logoUrl: "/uploads/survivor/logo/logo.jpeg" })], isLoading: false } as any);
    renderWithProviders(<Homepage openAuthModal={() => {}} />);
    expect(screen.getByAltText("Survivor")).toHaveAttribute("src", "/uploads/survivor/logo/logo.jpeg");
  });

  it("groups shows into airing and not airing, each sorted alphabetically", () => {
    const season = (overrides: Partial<Season>) => ({ id: "x", showId: "x", isCurrent: true, seasonNumber: 1, ...overrides }) as Season;
    const ended = [season({ endDate: "2020-01-01T00:00:00.000Z" })];
    const airing = [season({ endDate: null })];
    const shows = [
      makeShow({ id: "a", name: "Survivor", seasons: airing }),
      makeShow({ id: "b", name: "Big Brother", seasons: ended }),
      makeShow({ id: "c", name: "Dancing with the Stars", seasons: airing }),
      makeShow({ id: "d", name: "Amazing Race", seasons: ended }),
      // Only a past (non-current) season, so nothing is airing.
      makeShow({ id: "e", name: "Canada's Drag Race", seasons: [season({ isCurrent: false })] }),
    ];
    vi.spyOn(queries, "useShows").mockReturnValue({ data: shows, isLoading: false } as any);
    renderWithProviders(<Homepage openAuthModal={() => {}} />);

    const titles = (heading: string) =>
      Array.from(screen.getByText(heading).closest(".homepage-show-group")!.querySelectorAll(".show-card-title")).map((el) => el.textContent);
    expect(titles("Currently airing")).toEqual(["Dancing with the Stars", "Survivor"]);
    expect(titles("Not currently airing")).toEqual(["Amazing Race", "Big Brother", "Canada's Drag Race"]);
  });

  it("leaves out a group with no shows in it", () => {
    vi.spyOn(queries, "useShows").mockReturnValue({ data: [makeShow({ seasons: [] })], isLoading: false } as any);
    renderWithProviders(<Homepage openAuthModal={() => {}} />);
    expect(screen.getByText("Not currently airing")).toBeInTheDocument();
    expect(screen.queryByText("Currently airing")).not.toBeInTheDocument();
  });

  it("shows Log in / Create account buttons when logged out", () => {
    vi.spyOn(queries, "useShows").mockReturnValue({ data: [], isLoading: false } as any);
    renderWithProviders(<Homepage openAuthModal={() => {}} />);
    expect(screen.getByText("Log in")).toBeInTheDocument();
    expect(screen.getByText("Create account")).toBeInTheDocument();
  });

  it("hides the auth buttons when logged in", () => {
    vi.spyOn(queries, "useShows").mockReturnValue({ data: [], isLoading: false } as any);
    renderWithProviders(<Homepage openAuthModal={() => {}} />, {
      preloadedState: { user: { value: { id: "u1", email: "a@b.com", accountType: "USER" } } },
    });
    expect(screen.queryByText("Log in")).not.toBeInTheDocument();
  });

  it("navigates to /ranking/:slug when a show is clicked while logged in", async () => {
    const user = userEvent.setup();
    vi.spyOn(queries, "useShows").mockReturnValue({ data: [makeShow()], isLoading: false } as any);
    renderWithProviders(<Homepage openAuthModal={() => {}} />, {
      preloadedState: { user: { value: { id: "u1", email: "a@b.com", accountType: "USER" } } },
    });
    await user.click(screen.getByText("Survivor"));
    expect(mockNavigate).toHaveBeenCalledWith("/ranking/survivor");
  });

  it("navigates to /insights/:slug when a show is clicked while logged out", async () => {
    const user = userEvent.setup();
    vi.spyOn(queries, "useShows").mockReturnValue({ data: [makeShow()], isLoading: false } as any);
    renderWithProviders(<Homepage openAuthModal={() => {}} />);
    await user.click(screen.getByText("Survivor"));
    expect(mockNavigate).toHaveBeenCalledWith("/insights/survivor");
  });
});
