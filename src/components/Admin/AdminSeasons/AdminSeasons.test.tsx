import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../../test/renderWithProviders";
import AdminSeasons from "./AdminSeasons";
import * as queries from "../../../hooks/queries";
import * as util from "../../../utils/util";
import type { Show, Season } from "../../../utils/Constants";

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
    vi.spyOn(util, "addSeason").mockResolvedValue({} as any);
    vi.spyOn(util, "deleteSeason").mockResolvedValue(undefined as any);
    vi.spyOn(util, "updateSeasonPremiereDate").mockResolvedValue({} as any);
    vi.spyOn(util, "changeCurrentSeason").mockResolvedValue({} as any);
  });

  it("renders nothing but the show selector until a show is chosen", () => {
    vi.spyOn(queries, "useShows").mockReturnValue({ data: [episodeShow], isLoading: false } as any);
    vi.spyOn(queries, "useSeasons").mockReturnValue({ data: [], isLoading: false } as any);
    renderWithProviders(<AdminSeasons showId={undefined} />);
    expect(screen.queryByText("Add new season")).not.toBeInTheDocument();
  });

  it("doesn't show a premiere date field for an EPISODE-mode show", () => {
    vi.spyOn(queries, "useShows").mockReturnValue({ data: [episodeShow], isLoading: false } as any);
    vi.spyOn(queries, "useSeasons").mockReturnValue({ data: [], isLoading: false } as any);
    renderWithProviders(<AdminSeasons showId="s1" />);
    expect(screen.getByText("Add new season")).toBeInTheDocument();
    expect(screen.queryByText("Premiere date")).not.toBeInTheDocument();
  });

  it("shows a premiere date field for a DAILY-mode show and round-trips the date value", () => {
    vi.spyOn(queries, "useShows").mockReturnValue({ data: [dailyShow], isLoading: false } as any);
    vi.spyOn(queries, "useSeasons").mockReturnValue({
      data: [makeSeason({ showId: "s2", premiereDate: "2026-01-05T05:00:00.000Z" })],
      isLoading: false,
    } as any);
    renderWithProviders(<AdminSeasons showId="s2" />);
    expect(screen.getByText("Premiere date")).toBeInTheDocument();
    const dateInputs = document.querySelectorAll('input[type="date"]');
    expect((dateInputs[1] as HTMLInputElement).value).toBe("2026-01-05");
  });

  it("submits a new season for the current show", async () => {
    const user = userEvent.setup();
    vi.spyOn(queries, "useShows").mockReturnValue({ data: [episodeShow], isLoading: false } as any);
    vi.spyOn(queries, "useSeasons").mockReturnValue({ data: [], isLoading: false } as any);
    renderWithProviders(<AdminSeasons showId="s1" />);

    await user.type(screen.getByPlaceholderText("47"), "3");
    await user.click(screen.getByText("Add season"));

    expect(util.addSeason).toHaveBeenCalledWith(
      expect.objectContaining({ showId: "s1", seasonNumber: 3 }),
      expect.anything()
    );
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
    renderWithProviders(<AdminSeasons showId="s1" />);

    const removeButtons = screen.getAllByText("Remove");
    await user.click(removeButtons[0]);

    expect(util.deleteSeason).toHaveBeenCalledWith("se1");
    expect(util.changeCurrentSeason).toHaveBeenCalledWith("s1", "se0");
  });
});
