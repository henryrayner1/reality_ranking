import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AddShowModal from "./AddShowModal";

describe("AddShowModal", () => {
  it("updates the input value as the user types", async () => {
    const user = userEvent.setup();
    render(<AddShowModal displayFlag setDisplayFlag={() => {}} handleAddShow={async () => {}} />);
    const input = screen.getByPlaceholderText("Show Name") as HTMLInputElement;
    await user.type(input, "Big Brother");
    expect(input.value).toBe("Big Brother");
  });

  it("calls handleAddShow with the typed name and shows the success message", async () => {
    const user = userEvent.setup();
    const handleAddShow = vi.fn().mockResolvedValue(undefined);
    render(<AddShowModal displayFlag setDisplayFlag={() => {}} handleAddShow={handleAddShow} />);

    await user.type(screen.getByPlaceholderText("Show Name"), "Big Brother");
    await user.click(screen.getByText("Confirm"));

    expect(handleAddShow).toHaveBeenCalledWith("Big Brother");
    expect(await screen.findByText("Big Brother has been added!")).toBeInTheDocument();
  });

  it("still shows the success state even when handleAddShow rejects", async () => {
    const user = userEvent.setup();
    const handleAddShow = vi.fn().mockRejectedValue(new Error("boom"));
    render(<AddShowModal displayFlag setDisplayFlag={() => {}} handleAddShow={handleAddShow} />);

    await user.type(screen.getByPlaceholderText("Show Name"), "Big Brother");
    await user.click(screen.getByText("Confirm"));

    expect(await screen.findByText("Big Brother has been added!")).toBeInTheDocument();
  });

  it("calls setDisplayFlag(false) on Cancel before submitting", async () => {
    const user = userEvent.setup();
    const setDisplayFlag = vi.fn();
    render(<AddShowModal displayFlag setDisplayFlag={setDisplayFlag} handleAddShow={async () => {}} />);
    await user.click(screen.getByText("Cancel"));
    expect(setDisplayFlag).toHaveBeenCalledWith(false);
  });

  it("calls setDisplayFlag(false) on Close after submitting", async () => {
    const user = userEvent.setup();
    const setDisplayFlag = vi.fn();
    render(
      <AddShowModal displayFlag setDisplayFlag={setDisplayFlag} handleAddShow={async () => {}} />
    );
    await user.click(screen.getByText("Confirm"));
    await screen.findByText("has been added!", { exact: false });
    await user.click(screen.getByText("Close"));
    expect(setDisplayFlag).toHaveBeenCalledWith(false);
  });
});
