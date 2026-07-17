import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../../test/renderWithProviders";
import AdminEliminations from "./AdminEliminations";
import * as queries from "../../../hooks/queries";
import * as util from "../../../utils/util";
import type { Show, Season, Episode } from "../../../utils/Constants";

const show: Show = { id: "s1", name: "Survivor", currSeason: 2 };
const season: Season = {
  id: "se1",
  showId: "s1",
  isCurrent: true,
  seasonNumber: 2,
  contestants: [
    { id: "c1", name: "Active One", seasonId: "se1", status: "ACTIVE" },
    { id: "c2", name: "Already Gone", seasonId: "se1", status: "ELIMINATED" },
  ],
};
const episode: Episode = { id: "e1", episodeNumber: 3, seasonId: "se1" };

describe("AdminEliminations", () => {
  beforeEach(() => {
    vi.spyOn(util, "addElimination").mockResolvedValue({} as any);
    vi.spyOn(util, "deleteElimination").mockResolvedValue(undefined as any);
    vi.spyOn(queries, "useShows").mockReturnValue({ data: [show], isLoading: false } as any);
    vi.spyOn(queries, "useSeasons").mockReturnValue({ data: [season], isLoading: false } as any);
    vi.spyOn(queries, "useEpisodesByShow").mockReturnValue({ data: [episode], isLoading: false } as any);
    vi.spyOn(queries, "useEliminationsBySeason").mockReturnValue({ data: [], isLoading: false } as any);
  });

  it("only lists ACTIVE contestants as eligible to eliminate", () => {
    renderWithProviders(<AdminEliminations showId="s1" />);
    expect(screen.getByText("Active One")).toBeInTheDocument();
    expect(screen.queryByText("Already Gone")).not.toBeInTheDocument();
  });

  it("is a no-op to click Log elimination until both episode and contestant are chosen (button itself isn't disabled)", async () => {
    const user = userEvent.setup();
    renderWithProviders(<AdminEliminations showId="s1" />);
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
    renderWithProviders(<AdminEliminations showId="s1" />);
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
    renderWithProviders(<AdminEliminations showId="s1" />);

    // "Medical removal" also appears as a <select> option, so pick the badge
    // specifically (the last match, in the elimination-history list below).
    const matches = screen.getAllByText("Medical removal");
    expect(matches).toHaveLength(2);
    expect(matches[1].tagName).toBe("SPAN");

    await user.click(screen.getByText("Remove"));
    expect(util.deleteElimination).toHaveBeenCalledWith("elim1", expect.anything());
  });
});
