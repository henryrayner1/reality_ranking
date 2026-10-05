import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../../test/renderWithProviders";
import AdminShows from "./AdminShows";
import * as queries from "../../../hooks/queries";
import * as util from "../../../utils/util";
import type { Show } from "../../../utils/Constants";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return { ...actual, useNavigate: () => mockNavigate };
});

const shows: Show[] = [
  { id: "s1", name: "Survivor", currSeason: 47, network: "CBS", rankingMode: "EPISODE" },
  { id: "s2", name: "Big Brother", currSeason: 27, network: "CBS", rankingMode: "DAILY" },
];

describe("AdminShows", () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    vi.spyOn(queries, "useShows").mockReturnValue({ data: shows, isLoading: false } as any);
    vi.spyOn(util, "addShow").mockResolvedValue({} as any);
    vi.spyOn(util, "deleteShow").mockResolvedValue(undefined as any);
    vi.spyOn(util, "updateShowRankingMode").mockResolvedValue({} as any);
    vi.spyOn(window, "confirm").mockReturnValue(true);
  });

  it("navigates to the picked show's slug", async () => {
    const user = userEvent.setup();
    renderWithProviders(<AdminShows />);
    await user.selectOptions(screen.getByLabelText("Show"), "s2");
    expect(mockNavigate).toHaveBeenCalledWith("/admin/big-brother");
  });

  it("hides show settings until a show is selected", () => {
    renderWithProviders(<AdminShows />);
    expect(screen.queryByRole("switch")).not.toBeInTheDocument();
    expect(screen.queryByText("Remove")).not.toBeInTheDocument();
  });

  it("adds a show from the New show modal and selects it", async () => {
    const user = userEvent.setup();
    renderWithProviders(<AdminShows />);
    await user.click(screen.getByText("+ New show"));
    await user.type(screen.getByPlaceholderText("e.g. Survivor"), "Amazing Race");
    await user.click(screen.getByText("Add show"));
    expect(util.addShow).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Amazing Race" }),
      expect.anything()
    );
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/admin/amazing-race"));
    expect(screen.queryByPlaceholderText("e.g. Survivor")).not.toBeInTheDocument();
  });

  it("does not submit when the show name is blank", async () => {
    const user = userEvent.setup();
    renderWithProviders(<AdminShows />);
    await user.click(screen.getByText("+ New show"));
    await user.click(screen.getByText("Add show"));
    expect(util.addShow).not.toHaveBeenCalled();
  });

  it("toggles the selected show's ranking mode", async () => {
    const user = userEvent.setup();
    renderWithProviders(<AdminShows showId="s1" />);
    await user.click(screen.getByRole("switch"));
    expect(util.updateShowRankingMode).toHaveBeenCalledWith("s1", "DAILY");
  });

  it("removes the selected show after confirming and returns to /admin", async () => {
    const user = userEvent.setup();
    renderWithProviders(<AdminShows showId="s1" />);
    await user.click(screen.getByText("Remove"));
    expect(util.deleteShow).toHaveBeenCalledWith("s1");
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/admin"));
  });

  it("does not remove the show when the confirm is cancelled", async () => {
    const user = userEvent.setup();
    vi.spyOn(window, "confirm").mockReturnValue(false);
    renderWithProviders(<AdminShows showId="s1" />);
    await user.click(screen.getByText("Remove"));
    expect(util.deleteShow).not.toHaveBeenCalled();
  });
});
