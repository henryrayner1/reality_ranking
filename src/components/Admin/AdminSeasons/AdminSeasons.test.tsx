import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../../test/renderWithProviders";
import AdminSeasons from "./AdminSeasons";
import * as queries from "../../../hooks/queries";
import * as util from "../../../utils/util";
import type { Show, Season } from "../../../utils/Constants";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return { ...actual, useNavigate: () => mockNavigate };
});

const episodeShow: Show = { id: "s1", name: "Survivor", currSeason: 2, rankingMode: "EPISODE" };
const dailyShow: Show = { id: "s2", name: "Big Brother", currSeason: 1, rankingMode: "DAILY" };

const makeSeason = (overrides: Partial<Season> = {}): Season => ({
  id: "se1",
  showId: "s1",
  isCurrent: true,
  contestants: [],
  seasonNumber: 2,
  ...overrides,
});

describe("AdminSeasons", () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    vi.spyOn(util, "addSeason").mockResolvedValue({} as any);
    vi.spyOn(util, "deleteSeason").mockResolvedValue(undefined as any);
    vi.spyOn(util, "updateSeasonPremiereDate").mockResolvedValue({} as any);
    vi.spyOn(util, "changeCurrentSeason").mockResolvedValue({} as any);
    vi.spyOn(window, "confirm").mockReturnValue(true);
  });

  it("navigates to the picked season number", async () => {
    const user = userEvent.setup();
    vi.spyOn(queries, "useShows").mockReturnValue({ data: [episodeShow], isLoading: false } as any);
    vi.spyOn(queries, "useSeasons").mockReturnValue({
      data: [makeSeason({ id: "se1", seasonNumber: 2 }), makeSeason({ id: "se0", seasonNumber: 1, isCurrent: false })],
      isLoading: false,
    } as any);
    renderWithProviders(<AdminSeasons showId="s1" seasonId="se1" />);
    await user.selectOptions(screen.getByLabelText("Season"), "se0");
    expect(mockNavigate).toHaveBeenCalledWith("/admin/survivor/1");
  });

  it("doesn't show a premiere date field for an EPISODE-mode show", async () => {
    const user = userEvent.setup();
    vi.spyOn(queries, "useShows").mockReturnValue({ data: [episodeShow], isLoading: false } as any);
    vi.spyOn(queries, "useSeasons").mockReturnValue({ data: [makeSeason()], isLoading: false } as any);
    renderWithProviders(<AdminSeasons showId="s1" seasonId="se1" />);
    expect(document.querySelector('input[type="date"]')).toBeNull();
    await user.click(screen.getByText("+ New season"));
    expect(screen.queryByText("Premiere date")).not.toBeInTheDocument();
  });

  it("shows the selected DAILY season's premiere date and updates it", async () => {
    const user = userEvent.setup();
    vi.spyOn(queries, "useShows").mockReturnValue({ data: [dailyShow], isLoading: false } as any);
    vi.spyOn(queries, "useSeasons").mockReturnValue({
      data: [makeSeason({ showId: "s2", premiereDate: "2026-01-05T05:00:00.000Z" })],
      isLoading: false,
    } as any);
    renderWithProviders(<AdminSeasons showId="s2" seasonId="se1" />);
    const dateInput = document.querySelector('input[type="date"]') as HTMLInputElement;
    expect(dateInput.value).toBe("2026-01-05");

    await user.click(screen.getByText("+ New season"));
    expect(screen.getByText("Premiere date")).toBeInTheDocument();
  });

  it("adds a new season from the modal and selects it", async () => {
    const user = userEvent.setup();
    vi.spyOn(queries, "useShows").mockReturnValue({ data: [episodeShow], isLoading: false } as any);
    vi.spyOn(queries, "useSeasons").mockReturnValue({ data: [], isLoading: false } as any);
    renderWithProviders(<AdminSeasons showId="s1" />);

    await user.click(screen.getByText("+ New season"));
    await user.type(screen.getByPlaceholderText("47"), "3");
    await user.click(screen.getByText("Add season"));

    expect(util.addSeason).toHaveBeenCalledWith(
      expect.objectContaining({ showId: "s1", seasonNumber: 3 }),
      expect.anything()
    );
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/admin/survivor/3"));
  });

  it("falls back to the next-highest season when deleting the current season", async () => {
    const user = userEvent.setup();
    vi.spyOn(queries, "useShows").mockReturnValue({ data: [episodeShow], isLoading: false } as any);
    vi.spyOn(queries, "useSeasons").mockReturnValue({
      data: [
        makeSeason({ id: "se1", seasonNumber: 2, isCurrent: true }),
        makeSeason({ id: "se0", seasonNumber: 1, isCurrent: false }),
      ],
      isLoading: false,
    } as any);
    renderWithProviders(<AdminSeasons showId="s1" seasonId="se1" />);

    await user.click(screen.getByText("Remove"));

    expect(util.deleteSeason).toHaveBeenCalledWith("se1");
    await waitFor(() => expect(util.changeCurrentSeason).toHaveBeenCalledWith("s1", "se0"));
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/admin/survivor"));
  });
});
