import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LogoutConfirmModal from "./LogoutConfirmModal";

describe("LogoutConfirmModal", () => {
  it("calls onConfirm when 'Log out' is clicked", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(<LogoutConfirmModal displayFlag setDisplayFlag={() => {}} onConfirm={onConfirm} />);
    await user.click(screen.getByText("Log out"));
    expect(onConfirm).toHaveBeenCalled();
  });

  it("calls setDisplayFlag(false) when 'Cancel' is clicked", async () => {
    const user = userEvent.setup();
    const setDisplayFlag = vi.fn();
    render(<LogoutConfirmModal displayFlag setDisplayFlag={setDisplayFlag} onConfirm={() => {}} />);
    await user.click(screen.getByText("Cancel"));
    expect(setDisplayFlag).toHaveBeenCalledWith(false);
  });

  it("calls setDisplayFlag(false) when the X close is clicked", async () => {
    const user = userEvent.setup();
    const setDisplayFlag = vi.fn();
    render(<LogoutConfirmModal displayFlag setDisplayFlag={setDisplayFlag} onConfirm={() => {}} />);
    await user.click(screen.getByText("X"));
    expect(setDisplayFlag).toHaveBeenCalledWith(false);
  });
});
