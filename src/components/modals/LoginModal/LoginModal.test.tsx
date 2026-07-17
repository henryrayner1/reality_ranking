import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../../test/renderWithProviders";
import LoginModal from "./LoginModal";
import * as util from "../../../utils/util";

// Email/Password <label>s aren't actually wired to their <input>s (no
// matching id/htmlFor pair, no nesting), so getByLabelText can't be used —
// query the raw <input> elements directly instead.
describe("LoginModal", () => {
  it("logs in and dispatches the user on success", async () => {
    const user = userEvent.setup();
    vi.spyOn(util, "userLogin").mockResolvedValue({ id: "u1", email: "a@b.com", accountType: "USER" } as any);
    const setDisplayFlag = vi.fn();
    const { store, container } = renderWithProviders(
      <LoginModal displayFlag setDisplayFlag={setDisplayFlag} initialIsLogin />
    );

    await user.type(container.querySelector('input[type="email"]')!, "a@b.com");
    await user.type(container.querySelector('input[type="password"]')!, "pw123");
    await user.click(screen.getByRole("button", { name: "Login" }));

    expect(util.userLogin).toHaveBeenCalledWith("a@b.com", "pw123");
    expect(setDisplayFlag).toHaveBeenCalledWith(false);
    expect(store.getState().user.value).toEqual({ id: "u1", email: "a@b.com", accountType: "USER" });
  });

  it("shows an error message when login fails", async () => {
    const user = userEvent.setup();
    vi.spyOn(util, "userLogin").mockRejectedValue(new Error("Invalid credentials"));
    const { container } = renderWithProviders(
      <LoginModal displayFlag setDisplayFlag={() => {}} initialIsLogin />
    );

    await user.type(container.querySelector('input[type="email"]')!, "a@b.com");
    await user.type(container.querySelector('input[type="password"]')!, "wrong");
    await user.click(screen.getByRole("button", { name: "Login" }));

    expect(await screen.findByText("Invalid credentials")).toBeInTheDocument();
  });

  it("switches to the Create Account form and back", async () => {
    const user = userEvent.setup();
    renderWithProviders(<LoginModal displayFlag setDisplayFlag={() => {}} initialIsLogin />);
    await user.click(screen.getByText("Create One"));
    expect(screen.getByText("Create Account", { selector: "h2" })).toBeInTheDocument();
    await user.click(screen.getByText("Login", { selector: "p" }));
    expect(screen.getByText("Login", { selector: "h2" })).toBeInTheDocument();
  });

  it("shows a mismatch warning on Create Account when passwords differ, and it clears once they match", async () => {
    const user = userEvent.setup();
    const { container } = renderWithProviders(
      <LoginModal displayFlag setDisplayFlag={() => {}} initialIsLogin={false} />
    );

    const [password, confirmPassword] = container.querySelectorAll('input[type="password"]');
    await user.type(password, "pw123");
    await user.type(confirmPassword, "pw456");
    expect(await screen.findByText("Passwords do not match")).toBeInTheDocument();

    await user.clear(confirmPassword);
    await user.type(confirmPassword, "pw123");
    expect(screen.queryByText("Passwords do not match")).not.toBeInTheDocument();
  });
});
