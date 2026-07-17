import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ImageForm from "./ImageForm";

describe("ImageForm", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ json: async () => ({}) })
    );
    vi.stubGlobal("URL", { ...URL, createObjectURL: vi.fn(() => "blob:preview") });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const selectFile = async () => {
    const user = userEvent.setup();
    const file = new File(["hello"], "photo.png", { type: "image/png" });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(input, file);
    return user;
  };

  it("shows no preview before a file is selected", () => {
    render(<ImageForm handleNewImage={() => {}} />);
    expect(screen.queryByAltText("preview")).not.toBeInTheDocument();
  });

  it("shows a preview once a file is selected", async () => {
    render(<ImageForm handleNewImage={() => {}} />);
    await selectFile();
    expect(screen.getByAltText("preview")).toBeInTheDocument();
  });

  it("submitting uploads the file and calls handleNewImage, clearing the preview", async () => {
    const handleNewImage = vi.fn();
    render(<ImageForm handleNewImage={handleNewImage} />);
    const user = await selectFile();

    await user.click(screen.getByText("Submit"));

    expect(fetch).toHaveBeenCalledWith(expect.stringContaining("/api/images/upload"), expect.any(Object));
    expect(handleNewImage).toHaveBeenCalled();
    expect(screen.queryByAltText("preview")).not.toBeInTheDocument();
  });

  it("clicking X clears the preview without submitting", async () => {
    const handleNewImage = vi.fn();
    render(<ImageForm handleNewImage={handleNewImage} />);
    const user = await selectFile();

    await user.click(screen.getByText("X"));

    expect(screen.queryByAltText("preview")).not.toBeInTheDocument();
    expect(handleNewImage).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });
});
