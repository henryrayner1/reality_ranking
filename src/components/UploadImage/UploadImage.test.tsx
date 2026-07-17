import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import UploadImage from "./UploadImage";

vi.mock("../ImageContainer/ImageContainer", () => ({
  default: ({ newImage }: { newImage: string[] }) => (
    <div data-testid="image-container">{newImage.length}</div>
  ),
}));

vi.mock("../ImageForm/ImageForm", () => ({
  default: ({ handleNewImage }: { handleNewImage: () => void }) => (
    <button onClick={handleNewImage}>trigger-new-image</button>
  ),
}));

describe("UploadImage", () => {
  it("renders both child components", () => {
    render(<UploadImage />);
    expect(screen.getByTestId("image-container")).toBeInTheDocument();
    expect(screen.getByText("trigger-new-image")).toBeInTheDocument();
  });

  it("passes handleNewImage down so ImageForm can append to the newImage list ImageContainer receives", async () => {
    const user = userEvent.setup();
    render(<UploadImage />);
    expect(screen.getByTestId("image-container")).toHaveTextContent("0");

    await user.click(screen.getByText("trigger-new-image"));

    expect(screen.getByTestId("image-container")).toHaveTextContent("1");
  });
});
