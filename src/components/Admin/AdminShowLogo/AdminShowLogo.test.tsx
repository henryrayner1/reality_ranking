import { act, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../../test/renderWithProviders";
import AdminShowLogo from "./AdminShowLogo";
import * as util from "../../../utils/util";
import type { Show } from "../../../utils/Constants";
import * as imageCrop from "../../../utils/imageCrop";

// AvatarEditor draws to a <canvas>, which jsdom can't render; the stub
// exposes the one ref method AdminShowLogo calls.
vi.mock("react-avatar-editor", async () => {
  const { forwardRef, useImperativeHandle } = await import("react");
  return {
    default: forwardRef((_props, ref) => {
      useImperativeHandle(ref, () => ({ getImage: () => document.createElement("canvas") }));
      return <div data-testid="logo-editor-stub" />;
    }),
  };
});

const makeShow = (overrides: Partial<Show> = {}): Show => ({
  id: "s1",
  name: "Brand New Show",
  currSeason: 1,
  ...overrides,
});

const croppedFile = new File(["cropped"], "logo.png", { type: "image/png" });

const pasteImage = (file: File) => {
  const pasteEvent = new Event("paste", { bubbles: true }) as ClipboardEvent & { clipboardData: any };
  Object.defineProperty(pasteEvent, "clipboardData", {
    value: { items: [{ type: file.type, getAsFile: () => file }] },
  });
  document.body.dispatchEvent(pasteEvent);
};

describe("AdminShowLogo", () => {
  beforeEach(() => {
    vi.spyOn(imageCrop, "canvasToSquarePng").mockResolvedValue(croppedFile);
    vi.spyOn(util, "uploadShowLogo").mockResolvedValue("/uploads/brand-new-show/logo/logo.png?v=1");
    vi.spyOn(util, "updateShowLogo").mockResolvedValue({} as any);
    vi.spyOn(window, "confirm").mockReturnValue(true);
  });

  it("crops a picked image and saves it as the show's logo", async () => {
    const user = userEvent.setup();
    renderWithProviders(<AdminShowLogo show={makeShow()} />);

    await user.click(screen.getByRole("button", { name: "Logo" }));
    const save = screen.getByRole("button", { name: "Save logo" });
    expect(save).toBeDisabled();

    await user.upload(screen.getByTestId("logo-file-input"), new File(["img"], "my logo.png", { type: "image/png" }));
    expect(screen.getByTestId("logo-editor-stub")).toBeInTheDocument();
    expect(screen.getByRole("slider", { name: "Zoom" })).toBeInTheDocument();

    await user.click(save);
    await waitFor(() => expect(util.updateShowLogo).toHaveBeenCalledWith("s1", "/uploads/brand-new-show/logo/logo.png?v=1"));
    // The cropped export is what gets uploaded, not the original file.
    expect(util.uploadShowLogo).toHaveBeenCalledWith(croppedFile, "Brand New Show");
    await waitFor(() => expect(screen.queryByRole("button", { name: "Save logo" })).not.toBeInTheDocument());
  });

  it("keeps a pasted image to itself while open, so page-level paste listeners behind it never see it", async () => {
    // Stands in for AdminContestants' own window paste listener.
    const pageListener = vi.fn();
    window.addEventListener("paste", pageListener);
    const user = userEvent.setup();
    renderWithProviders(<AdminShowLogo show={makeShow()} />);

    await user.click(screen.getByRole("button", { name: "Logo" }));
    act(() => pasteImage(new File(["img"], "pasted.png", { type: "image/png" })));

    expect(await screen.findByTestId("logo-editor-stub")).toBeInTheDocument();
    expect(pageListener).not.toHaveBeenCalled();
    window.removeEventListener("paste", pageListener);
  });

  it("leaves pastes alone while closed", () => {
    const pageListener = vi.fn();
    window.addEventListener("paste", pageListener);
    renderWithProviders(<AdminShowLogo show={makeShow()} />);

    pasteImage(new File(["img"], "pasted.png", { type: "image/png" }));

    expect(pageListener).toHaveBeenCalledTimes(1);
    window.removeEventListener("paste", pageListener);
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
