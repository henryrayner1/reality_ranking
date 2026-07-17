import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../../test/renderWithProviders";
import AdminShows from "./AdminShows";
import * as queries from "../../../hooks/queries";
import * as util from "../../../utils/util";
import type { Show } from "../../../utils/Constants";

const shows: Show[] = [
  { id: "s1", name: "Survivor", currSeason: 47, network: "CBS", rankingMode: "EPISODE" },
  { id: "s2", name: "Big Brother", currSeason: 27, network: "CBS", rankingMode: "DAILY" },
];

describe("AdminShows", () => {
  beforeEach(() => {
    vi.spyOn(queries, "useShows").mockReturnValue({ data: shows, isLoading: false } as any);
    vi.spyOn(util, "addShow").mockResolvedValue({} as any);
    vi.spyOn(util, "deleteShow").mockResolvedValue(undefined as any);
    vi.spyOn(util, "updateShowRankingMode").mockResolvedValue({} as any);
  });

  it("shows stat cards computed from the shows list", () => {
    renderWithProviders(<AdminShows />);
    expect(screen.getByText("2")).toBeInTheDocument(); // total shows
    expect(screen.getByText("1")).toBeInTheDocument(); // distinct networks (both CBS)
  });

  it("submits the add-show form", async () => {
    const user = userEvent.setup();
    renderWithProviders(<AdminShows />);
    await user.type(screen.getByPlaceholderText("e.g. Survivor"), "Amazing Race");
    await user.click(screen.getByText("Add show"));
    expect(util.addShow).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Amazing Race" }),
      expect.anything()
    );
  });

  it("does not submit when the show name is blank", async () => {
    const user = userEvent.setup();
    renderWithProviders(<AdminShows />);
    await user.click(screen.getByText("Add show"));
    expect(util.addShow).not.toHaveBeenCalled();
  });

  it("toggles a show's ranking mode", async () => {
    const user = userEvent.setup();
    renderWithProviders(<AdminShows />);
    // Index 0 is the "add new show" form's own ranking-mode toggle — the
    // per-show toggles in the list start at index 1.
    const toggles = screen.getAllByRole("switch");
    await user.click(toggles[1]);
    expect(util.updateShowRankingMode).toHaveBeenCalledWith("s1", "DAILY");
  });

  it("removes a show", async () => {
    const user = userEvent.setup();
    renderWithProviders(<AdminShows />);
    const removeButtons = screen.getAllByText("Remove");
    await user.click(removeButtons[0]);
    expect(util.deleteShow).toHaveBeenCalledWith("s1");
  });
});
