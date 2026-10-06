import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../../test/renderWithProviders";
import AdminEpisodes from "./AdminEpisodes";
import * as queries from "../../../hooks/queries";
import * as util from "../../../utils/util";
import type { Show, Season } from "../../../utils/Constants";

const episodeShow: Show = { id: "s1", name: "Survivor", currSeason: 2, rankingMode: "EPISODE" };
const dailyShow: Show = { id: "s2", name: "Big Brother", currSeason: 1, rankingMode: "DAILY" };
const makeSeasons = (episodes: Season["episodes"] = []): Season[] => [
  { id: "se1", showId: "s1", isCurrent: true, contestants: [], seasonNumber: 2, episodes },
  {
    id: "se0", showId: "s1", isCurrent: false, contestants: [], seasonNumber: 1,
    episodes: [{ id: "old", episodeNumber: 9, seasonId: "se0", airDate: "2025-01-01T20:00:00.000Z" }],
  },
];

describe("AdminEpisodes", () => {
  beforeEach(() => {
    vi.spyOn(util, "addEpisode").mockResolvedValue({} as any);
    vi.spyOn(util, "deleteEpisode").mockResolvedValue(undefined as any);
    vi.spyOn(queries, "useSeasons").mockReturnValue({ data: makeSeasons(), isLoading: false } as any);
  });

  it("shows the auto-generated message (no manual form) for a DAILY show", () => {
    vi.spyOn(queries, "useShows").mockReturnValue({ data: [dailyShow], isLoading: false } as any);
    renderWithProviders(<AdminEpisodes showId="s2" seasonId="se1" />);
    expect(screen.getByText(/created automatically each day/)).toBeInTheDocument();
    expect(screen.queryByText("Add episode", { selector: "button" })).not.toBeInTheDocument();
  });

  it("keeps the create button disabled until an air date is set", async () => {
    const user = userEvent.setup();
    vi.spyOn(queries, "useShows").mockReturnValue({ data: [episodeShow], isLoading: false } as any);
    renderWithProviders(<AdminEpisodes showId="s1" seasonId="se1" />);

    const addButton = screen.getByText("Add episode", { selector: "button" });
    expect(addButton).toBeDisabled();

    const dateInput = document.querySelector('input[type="date"]') as HTMLInputElement;
    await user.type(dateInput, "2026-02-01");
    expect(addButton).not.toBeDisabled();
  });

  it("submits a new episode for the selected season, combining date and time", async () => {
    const user = userEvent.setup();
    vi.spyOn(queries, "useShows").mockReturnValue({ data: [episodeShow], isLoading: false } as any);
    renderWithProviders(<AdminEpisodes showId="s1" seasonId="se1" />);

    const dateInput = document.querySelector('input[type="date"]') as HTMLInputElement;
    await user.type(dateInput, "2026-02-01");
    await user.click(screen.getByText("Add episode", { selector: "button" }));

    expect(util.addEpisode).toHaveBeenCalledWith(
      expect.objectContaining({ seasonId: "se1", airDate: expect.any(String) })
    );
  });

  it("lists only the selected season's episodes, with formatted air dates", () => {
    vi.spyOn(queries, "useShows").mockReturnValue({ data: [episodeShow], isLoading: false } as any);
    vi.spyOn(queries, "useSeasons").mockReturnValue({
      data: makeSeasons([{ id: "e1", episodeNumber: 1, seasonId: "se1", airDate: "2026-02-01T20:00:00.000Z" }]),
      isLoading: false,
    } as any);
    renderWithProviders(<AdminEpisodes showId="s1" seasonId="se1" />);
    expect(screen.getByText(/Season 2 · Feb 1, 2026/)).toBeInTheDocument();
    expect(screen.queryByText("Episode 9")).not.toBeInTheDocument();
  });

  it("removes an episode", async () => {
    const user = userEvent.setup();
    vi.spyOn(queries, "useShows").mockReturnValue({ data: [episodeShow], isLoading: false } as any);
    vi.spyOn(queries, "useSeasons").mockReturnValue({
      data: makeSeasons([{ id: "e1", episodeNumber: 1, seasonId: "se1", airDate: "2026-02-01T20:00:00.000Z" }]),
      isLoading: false,
    } as any);
    renderWithProviders(<AdminEpisodes showId="s1" seasonId="se1" />);
    await user.click(screen.getByText("Remove"));
    expect(util.deleteEpisode).toHaveBeenCalledWith("e1");
  });

  it("blocks adding an episode that airs after the season's end date", async () => {
    const user = userEvent.setup();
    vi.spyOn(queries, "useShows").mockReturnValue({ data: [episodeShow], isLoading: false } as any);
    const seasons = makeSeasons();
    seasons[0] = { ...seasons[0], endDate: "2999-02-01T12:00:00.000Z" };
    vi.spyOn(queries, "useSeasons").mockReturnValue({ data: seasons, isLoading: false } as any);
    renderWithProviders(<AdminEpisodes showId="s1" seasonId="se1" />);

    const dateInput = document.querySelector('input[type="date"]') as HTMLInputElement;
    await user.type(dateInput, "2999-03-01");
    expect(screen.getByText("Add episode", { selector: "button" })).toBeDisabled();
    expect(screen.getByText(/after the season's end date/)).toBeInTheDocument();
  });

  it("blocks adding any episode once the season has ended", () => {
    vi.spyOn(queries, "useShows").mockReturnValue({ data: [episodeShow], isLoading: false } as any);
    const seasons = makeSeasons();
    seasons[0] = { ...seasons[0], endDate: "2020-01-01T00:00:00.000Z" };
    vi.spyOn(queries, "useSeasons").mockReturnValue({ data: seasons, isLoading: false } as any);
    renderWithProviders(<AdminEpisodes showId="s1" seasonId="se1" />);
    expect(screen.getByText(/season has ended/)).toBeInTheDocument();
    expect(screen.getByText("Add episode", { selector: "button" })).toBeDisabled();
  });
});
