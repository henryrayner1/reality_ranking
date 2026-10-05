import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../../test/renderWithProviders";
import AdminEliminations from "./AdminEliminations";
import * as queries from "../../../hooks/queries";
import * as util from "../../../utils/util";
import type { Show, Season } from "../../../utils/Constants";

// currSeason deliberately points at season 1 — the component must follow
// the selected seasonId prop, not the show's current season.
const show: Show = { id: "s1", name: "Survivor", currSeason: 1 };
const otherSeason: Season = {
  id: "se0",
  showId: "s1",
  isCurrent: true,
  seasonNumber: 1,
  contestants: [{ id: "c0", name: "Other Season Person", seasonId: "se0", status: "ACTIVE" }],
  episodes: [{ id: "e0", episodeNumber: 7, seasonId: "se0" }],
};
const season: Season = {
  id: "se1",
  showId: "s1",
  isCurrent: true,
  seasonNumber: 2,
  contestants: [
    { id: "c1", name: "Active One", seasonId: "se1", status: "ACTIVE" },
    { id: "c2", name: "Already Gone", seasonId: "se1", status: "ELIMINATED" },
  ],
  episodes: [{ id: "e1", episodeNumber: 3, seasonId: "se1" }],
};

describe("AdminEliminations", () => {
  beforeEach(() => {
    vi.spyOn(util, "addElimination").mockResolvedValue({} as any);
    vi.spyOn(util, "deleteElimination").mockResolvedValue(undefined as any);
    vi.spyOn(queries, "useShows").mockReturnValue({ data: [show], isLoading: false } as any);
    vi.spyOn(queries, "useSeasons").mockReturnValue({ data: [season, otherSeason], isLoading: false } as any);
    vi.spyOn(queries, "useEliminationsBySeason").mockReturnValue({ data: [], isLoading: false } as any);
  });

  it("only lists ACTIVE contestants as eligible to eliminate", () => {
    renderWithProviders(<AdminEliminations showId="s1" seasonId="se1" />);
    expect(screen.getByText("Active One")).toBeInTheDocument();
    expect(screen.queryByText("Already Gone")).not.toBeInTheDocument();
  });

  it("scopes contestants, episodes and history to the selected season, not the show's current one", () => {
    renderWithProviders(<AdminEliminations showId="s1" seasonId="se1" />);
    expect(screen.queryByText("Other Season Person")).not.toBeInTheDocument();
    expect(screen.getByText("Episode 3")).toBeInTheDocument();
    expect(screen.queryByText("Episode 7")).not.toBeInTheDocument();
    expect(queries.useEliminationsBySeason).toHaveBeenCalledWith("se1");
  });

  it("is a no-op to click Log elimination until both episode and contestant are chosen (button itself isn't disabled)", async () => {
    const user = userEvent.setup();
    renderWithProviders(<AdminEliminations showId="s1" seasonId="se1" />);
    const logButton = screen.getByText("Log elimination", { selector: "button" });

    await user.click(logButton);
    expect(util.addElimination).not.toHaveBeenCalled();

    await user.selectOptions(screen.getByDisplayValue("Select an episode..."), "e1");
    await user.click(logButton);
    expect(util.addElimination).not.toHaveBeenCalled();

    await user.selectOptions(screen.getByDisplayValue("Select a contestant..."), "c1");
    await user.click(logButton);
    expect(util.addElimination).toHaveBeenCalled();
  });

  it("logs an elimination", async () => {
    const user = userEvent.setup();
    renderWithProviders(<AdminEliminations showId="s1" seasonId="se1" />);
    await user.selectOptions(screen.getByDisplayValue("Select an episode..."), "e1");
    await user.selectOptions(screen.getByDisplayValue("Select a contestant..."), "c1");
    await user.click(screen.getByText("Log elimination", { selector: "button" }));
    expect(util.addElimination).toHaveBeenCalled();
  });

  it("shows the right badge label per elimination type and removes an entry", async () => {
    const user = userEvent.setup();
    vi.spyOn(queries, "useEliminationsBySeason").mockReturnValue({
      data: [{ id: "elim1", episodeId: "e1", contestantId: "c2", eliminationType: "MEDICAL" }],
      isLoading: false,
    } as any);
    renderWithProviders(<AdminEliminations showId="s1" seasonId="se1" />);

    // "Medical removal" also appears as a <select> option, so pick the badge
    // specifically (the last match, in the elimination-history list below).
    const matches = screen.getAllByText("Medical removal");
    expect(matches).toHaveLength(2);
    expect(matches[1].tagName).toBe("SPAN");

    await user.click(screen.getByText("Remove"));
    expect(util.deleteElimination).toHaveBeenCalledWith("elim1", expect.anything());
  });
});
