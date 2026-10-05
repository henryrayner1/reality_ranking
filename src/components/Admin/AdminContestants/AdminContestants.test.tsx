import { screen, within } from "@testing-library/react";
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
const otherSeason: Season = {
  id: "se0",
  showId: "s1",
  isCurrent: false,
  seasonNumber: 1,
  contestants: [{ id: "c0", name: "Old Timer", seasonId: "se0", status: "ACTIVE" }],
};
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
    vi.spyOn(queries, "useSeasons").mockReturnValue({ data: [season, otherSeason], isLoading: false } as any);
    vi.spyOn(util, "addContestant").mockResolvedValue({} as any);
    vi.spyOn(util, "deleteContestant").mockResolvedValue(undefined as any);
    vi.spyOn(util, "updateContestant").mockResolvedValue({} as any);
  });

  it("lists only the selected season's contestants with an Active/Eliminated badge", () => {
    renderWithProviders(<AdminContestants showId="s1" seasonId="se1" />);
    expect(screen.getByText("Active One")).toBeInTheDocument();
    expect(screen.queryByText("Old Timer")).not.toBeInTheDocument();
    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.getByText("Eliminated")).toBeInTheDocument();
  });

  it("keeps Add contestant gated on a name, submitting to the selected season without a photo when none was chosen", async () => {
    const user = userEvent.setup();
    renderWithProviders(<AdminContestants showId="s1" seasonId="se1" />);

    await user.click(screen.getByText("Add contestant", { selector: "button" }));
    expect(util.addContestant).not.toHaveBeenCalled();

    await user.type(screen.getByPlaceholderText("e.g. Tiyana Kaloko"), "New Person");
    await user.click(screen.getByText("Add contestant", { selector: "button" }));

    expect(util.addContestant).toHaveBeenCalledWith(
      expect.objectContaining({ name: "New Person", seasonId: "se1", photoUrl: null }),
      expect.anything()
    );
  });

  it("removes a contestant", async () => {
    const user = userEvent.setup();
    renderWithProviders(<AdminContestants showId="s1" seasonId="se1" />);
    const removeButtons = screen.getAllByText("Remove");
    await user.click(removeButtons[0]);
    expect(util.deleteContestant).toHaveBeenCalledWith("c1", expect.anything());
  });

  it("picks up a pasted image via the window paste listener", async () => {
    renderWithProviders(<AdminContestants showId="s1" seasonId="se1" />);

    const file = new File(["img"], "headshot.png", { type: "image/png" });
    const pasteEvent = new Event("paste") as ClipboardEvent & { clipboardData: any };
    Object.defineProperty(pasteEvent, "clipboardData", {
      value: { items: [{ type: "image/png", getAsFile: () => file }] },
    });
    window.dispatchEvent(pasteEvent);

    expect(await screen.findByTestId("avatar-editor-stub")).toBeInTheDocument();
  });

  it("switches the card to Edit mode with the name pre-filled, and Cancel switches back", async () => {
    const user = userEvent.setup();
    renderWithProviders(<AdminContestants showId="s1" seasonId="se1" />);

    await user.click(screen.getAllByText("Edit")[0]);
    expect(screen.getByText("Edit contestant")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("e.g. Tiyana Kaloko")).toHaveValue("Active One");
    expect(screen.getByText(/paste to replace photo/)).toBeInTheDocument();

    await user.click(screen.getByText("Cancel"));
    expect(screen.getByText("Add contestant", { selector: "button" })).toBeInTheDocument();
    expect(screen.getByPlaceholderText("e.g. Tiyana Kaloko")).toHaveValue("");
  });

  it("saves a renamed contestant without a new photo", async () => {
    const user = userEvent.setup();
    renderWithProviders(<AdminContestants showId="s1" seasonId="se1" />);

    await user.click(screen.getAllByText("Edit")[0]);
    const nameInput = screen.getByPlaceholderText("e.g. Tiyana Kaloko");
    await user.clear(nameInput);
    await user.type(nameInput, "New Name");
    await user.click(screen.getByText("Save changes"));

    expect(util.updateContestant).toHaveBeenCalledWith("c1", { name: "New Name" });
    expect(await screen.findByText("Add contestant", { selector: "button" })).toBeInTheDocument();
  });

  it("doesn't call the API when saving an edit with nothing changed", async () => {
    const user = userEvent.setup();
    renderWithProviders(<AdminContestants showId="s1" seasonId="se1" />);
    await user.click(screen.getAllByText("Edit")[0]);
    await user.click(screen.getByText("Save changes"));
    expect(util.updateContestant).not.toHaveBeenCalled();
    expect(screen.getByText("Add contestant", { selector: "button" })).toBeInTheDocument();
  });

  it("accepts a pasted replacement photo while editing", async () => {
    const user = userEvent.setup();
    renderWithProviders(<AdminContestants showId="s1" seasonId="se1" />);
    await user.click(screen.getAllByText("Edit")[0]);

    const file = new File(["img"], "headshot.png", { type: "image/png" });
    const pasteEvent = new Event("paste") as ClipboardEvent & { clipboardData: any };
    Object.defineProperty(pasteEvent, "clipboardData", {
      value: { items: [{ type: "image/png", getAsFile: () => file }] },
    });
    window.dispatchEvent(pasteEvent);

    expect(await screen.findByTestId("avatar-editor-stub")).toBeInTheDocument();
    expect(screen.getByText("Edit contestant")).toBeInTheDocument();
  });

  it("lists contestants alphabetically by first name", () => {
    vi.spyOn(queries, "useSeasons").mockReturnValue({
      data: [{
        ...season,
        contestants: [
          { id: "z", name: "Zoe Adams", seasonId: "se1", status: "ACTIVE" },
          { id: "a", name: "amy Zhou", seasonId: "se1", status: "ACTIVE" },
          { id: "m", name: "Mike Brown", seasonId: "se1", status: "ACTIVE" },
        ],
      }],
      isLoading: false,
    } as any);
    renderWithProviders(<AdminContestants showId="s1" seasonId="se1" />);
    const names = within(screen.getByTestId("contestant-list"))
      .getAllByText(/^(Zoe Adams|amy Zhou|Mike Brown)$/)
      .map((el) => el.textContent);
    expect(names).toEqual(["amy Zhou", "Mike Brown", "Zoe Adams"]);
  });
});
