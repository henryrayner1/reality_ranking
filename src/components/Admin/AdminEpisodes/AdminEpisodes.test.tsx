import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../../test/renderWithProviders";
import AdminEpisodes from "./AdminEpisodes";
import * as queries from "../../../hooks/queries";
import * as util from "../../../utils/util";
import type { Show, Season } from "../../../utils/Constants";

const episodeShow: Show = { id: "s1", name: "Survivor", currSeason: 2, rankingMode: "EPISODE" };
const dailyShow: Show = { id: "s2", name: "Big Brother", currSeason: 1, rankingMode: "DAILY" };
const season: Season = { id: "se1", showId: "s1", isCurrent: true, contestants: [], seasonNumber: 2 };

describe("AdminEpisodes", () => {
  beforeEach(() => {
    vi.spyOn(util, "addEpisode").mockResolvedValue({} as any);
    vi.spyOn(util, "deleteEpisode").mockResolvedValue(undefined as any);
    vi.spyOn(queries, "useSeasons").mockReturnValue({ data: [season], isLoading: false } as any);
    vi.spyOn(queries, "useEpisodesByShow").mockReturnValue({ data: [], isLoading: false } as any);
  });

  it("shows the auto-generated message (no manual form) for a DAILY show", () => {
    vi.spyOn(queries, "useShows").mockReturnValue({ data: [dailyShow], isLoading: false } as any);
    renderWithProviders(<AdminEpisodes showId="s2" />);
    expect(screen.getByText(/created automatically each day/)).toBeInTheDocument();
    expect(screen.queryByText("Add episode", { selector: "button" })).not.toBeInTheDocument();
  });

  it("keeps the create button disabled until both season and air date are set", async () => {
    const user = userEvent.setup();
    vi.spyOn(queries, "useShows").mockReturnValue({ data: [episodeShow], isLoading: false } as any);
    renderWithProviders(<AdminEpisodes showId="s1" />);

    const addButton = screen.getByText("Add episode", { selector: "button" });
    expect(addButton).toBeDisabled();

    await user.selectOptions(screen.getByDisplayValue("Select a season..."), "se1");
    expect(addButton).toBeDisabled();

    const dateInput = document.querySelector('input[type="date"]') as HTMLInputElement;
    await user.type(dateInput, "2026-02-01");
    expect(addButton).not.toBeDisabled();
  });

  it("submits a new episode combining the date and time inputs", async () => {
    const user = userEvent.setup();
    vi.spyOn(queries, "useShows").mockReturnValue({ data: [episodeShow], isLoading: false } as any);
    renderWithProviders(<AdminEpisodes showId="s1" />);

    await user.selectOptions(screen.getByDisplayValue("Select a season..."), "se1");
    const dateInput = document.querySelector('input[type="date"]') as HTMLInputElement;
    await user.type(dateInput, "2026-02-01");
    await user.click(screen.getByText("Add episode", { selector: "button" }));

    expect(util.addEpisode).toHaveBeenCalledWith(
      expect.objectContaining({ seasonId: "se1", airDate: expect.any(String) })
    );
  });

  it("shows formatted air dates for existing episodes", () => {
    vi.spyOn(queries, "useShows").mockReturnValue({ data: [episodeShow], isLoading: false } as any);
    vi.spyOn(queries, "useEpisodesByShow").mockReturnValue({
      data: [{ id: "e1", episodeNumber: 1, seasonId: "se1", airDate: "2026-02-01T20:00:00.000Z" }],
      isLoading: false,
    } as any);
    renderWithProviders(<AdminEpisodes showId="s1" />);
    expect(screen.getByText(/Season 2 · Feb 1, 2026/)).toBeInTheDocument();
  });

  it("removes an episode", async () => {
    const user = userEvent.setup();
    vi.spyOn(queries, "useShows").mockReturnValue({ data: [episodeShow], isLoading: false } as any);
    vi.spyOn(queries, "useEpisodesByShow").mockReturnValue({
      data: [{ id: "e1", episodeNumber: 1, seasonId: "se1", airDate: "2026-02-01T20:00:00.000Z" }],
      isLoading: false,
    } as any);
    renderWithProviders(<AdminEpisodes showId="s1" />);
    await user.click(screen.getByText("Remove"));
    expect(util.deleteEpisode).toHaveBeenCalledWith("e1");
  });
});
