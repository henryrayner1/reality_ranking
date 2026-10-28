import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../../test/renderWithProviders";
import AdminShowLogo from "./AdminShowLogo";
import * as util from "../../../utils/util";
import type { Show } from "../../../utils/Constants";

const makeShow = (overrides: Partial<Show> = {}): Show => ({
  id: "s1",
  name: "Brand New Show",
  currSeason: 1,
  ...overrides,
});

describe("AdminShowLogo", () => {
  beforeEach(() => {
    // jsdom has no object URLs (used for the pre-save preview).
    URL.createObjectURL = vi.fn(() => "blob:preview");
    URL.revokeObjectURL = vi.fn();
    vi.spyOn(util, "uploadShowLogo").mockResolvedValue("/uploads/brand-new-show/logo/logo.png?v=1");
    vi.spyOn(util, "updateShowLogo").mockResolvedValue({} as any);
    vi.spyOn(window, "confirm").mockReturnValue(true);
  });

  it("uploads a picked image and saves it as the show's logo", async () => {
    const user = userEvent.setup();
    renderWithProviders(<AdminShowLogo show={makeShow()} />);

    await user.click(screen.getByRole("button", { name: "Logo" }));
    const save = screen.getByRole("button", { name: "Save logo" });
    expect(save).toBeDisabled();

    const file = new File(["img"], "my logo.png", { type: "image/png" });
    await user.upload(screen.getByTestId("logo-file-input"), file);
    expect(screen.getByAltText("Brand New Show logo preview")).toHaveAttribute("src", "blob:preview");

    await user.click(save);
    await waitFor(() => expect(util.updateShowLogo).toHaveBeenCalledWith("s1", "/uploads/brand-new-show/logo/logo.png?v=1"));
    expect(util.uploadShowLogo).toHaveBeenCalledWith(file, "Brand New Show");
    await waitFor(() => expect(screen.queryByRole("button", { name: "Save logo" })).not.toBeInTheDocument());
  });

  it("removes an uploaded logo after confirming", async () => {
    const user = userEvent.setup();
    renderWithProviders(<AdminShowLogo show={makeShow({ logoUrl: "/uploads/brand-new-show/logo/logo.png" })} />);

    await user.click(screen.getByRole("button", { name: "Logo" }));
    await user.click(screen.getByRole("button", { name: "Remove" }));

    await waitFor(() => expect(util.updateShowLogo).toHaveBeenCalledWith("s1", null));
    expect(util.uploadShowLogo).not.toHaveBeenCalled();
  });

  it("has nothing to remove when the show has no logo", async () => {
    const user = userEvent.setup();
    renderWithProviders(<AdminShowLogo show={makeShow()} />);

    await user.click(screen.getByRole("button", { name: "Logo" }));
    expect(screen.queryByRole("button", { name: "Remove" })).not.toBeInTheDocument();
  });
});
