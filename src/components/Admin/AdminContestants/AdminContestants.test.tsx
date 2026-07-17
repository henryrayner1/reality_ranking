import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../../test/renderWithProviders";
import AdminContestants from "./AdminContestants";
import * as queries from "../../../hooks/queries";
import * as util from "../../../utils/util";
import type { Show, Season } from "../../../utils/Constants";

// AvatarEditor draws to an HTML <canvas>, which jsdom can't render without
// the separate native `canvas` package — not worth adding for this test, so
// stub the whole library out. This also means the crop/upload pipeline
// (editorRef.current.getImageScaledToCanvas()) is untested here by design.
vi.mock("react-avatar-editor", () => ({
  default: () => <div data-testid="avatar-editor-stub" />,
}));

const show: Show = { id: "s1", name: "Survivor", currSeason: 2 };
const season: Season = {
  id: "se1",
  showId: "s1",
  isCurrent: true,
  seasonNumber: 2,
  contestants: [
    { id: "c1", name: "Active One", seasonId: "se1", status: "ACTIVE" },
    { id: "c2", name: "Gone Already", seasonId: "se1", status: "ELIMINATED" },
  ],
};

describe("AdminContestants", () => {
  beforeEach(() => {
    vi.spyOn(queries, "useShows").mockReturnValue({ data: [show], isLoading: false } as any);
    vi.spyOn(queries, "useSeasons").mockReturnValue({ data: [season], isLoading: false } as any);
    vi.spyOn(util, "addContestant").mockResolvedValue({} as any);
    vi.spyOn(util, "deleteContestant").mockResolvedValue(undefined as any);
  });

  it("lists existing contestants with an Active/Eliminated badge", () => {
    renderWithProviders(<AdminContestants showId="s1" />);
    expect(screen.getByText("Active One")).toBeInTheDocument();
    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.getByText("Eliminated")).toBeInTheDocument();
  });

  it("keeps Add contestant gated on name+season, submitting without a photo when none was chosen", async () => {
    const user = userEvent.setup();
    renderWithProviders(<AdminContestants showId="s1" />);

    await user.click(screen.getByText("Add contestant", { selector: "button" }));
    expect(util.addContestant).not.toHaveBeenCalled();

    await user.selectOptions(screen.getByDisplayValue("Select a season..."), "se1");
    await user.type(screen.getByPlaceholderText("e.g. Tiyana Kaloko"), "New Person");
    await user.click(screen.getByText("Add contestant", { selector: "button" }));

    expect(util.addContestant).toHaveBeenCalledWith(
      expect.objectContaining({ name: "New Person", seasonId: "se1", photoUrl: null }),
      expect.anything()
    );
  });

  it("removes a contestant", async () => {
    const user = userEvent.setup();
    renderWithProviders(<AdminContestants showId="s1" />);
    const removeButtons = screen.getAllByText("Remove");
    await user.click(removeButtons[0]);
    expect(util.deleteContestant).toHaveBeenCalledWith("c1", expect.anything());
  });

  it("picks up a pasted image via the window paste listener", async () => {
    renderWithProviders(<AdminContestants showId="s1" />);

    const file = new File(["img"], "headshot.png", { type: "image/png" });
    const pasteEvent = new Event("paste") as ClipboardEvent & { clipboardData: any };
    Object.defineProperty(pasteEvent, "clipboardData", {
      value: { items: [{ type: "image/png", getAsFile: () => file }] },
    });
    window.dispatchEvent(pasteEvent);

    expect(await screen.findByTestId("avatar-editor-stub")).toBeInTheDocument();
  });
});
