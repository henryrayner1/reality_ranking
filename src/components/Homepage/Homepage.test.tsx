import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../test/renderWithProviders";
import Homepage from "./Homepage";
import * as queries from "../../hooks/queries";
import type { Show } from "../../utils/Constants";

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

  it("renders a fallback gradient tile (first letter) for a show with no known logo", () => {
    vi.spyOn(queries, "useShows").mockReturnValue({ data: [makeShow({ name: "Unknown Show" })], isLoading: false } as any);
    renderWithProviders(<Homepage openAuthModal={() => {}} />);
    expect(screen.getByText("U")).toBeInTheDocument();
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
