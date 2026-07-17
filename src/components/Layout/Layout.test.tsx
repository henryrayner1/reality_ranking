import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../test/renderWithProviders";
import Layout from "./Layout";

vi.mock("../../utils/util", () => ({
  checkUserLoggedIn: vi.fn(() => null),
  userLogout: vi.fn(),
}));

describe("Layout", () => {
  it("shows Login when logged out", () => {
    renderWithProviders(<Layout />, { routePath: "/", route: "/" });
    expect(screen.getByText("Login")).toBeInTheDocument();
  });

  it("opens the login modal when Login is clicked", async () => {
    const user = userEvent.setup();
    renderWithProviders(<Layout />);
    await user.click(screen.getByText("Login"));
    expect(screen.getByText("Login", { selector: "h2" })).toBeInTheDocument();
  });

  it("shows the account dropdown and logs out on click", async () => {
    const user = userEvent.setup();
    const { store } = renderWithProviders(<Layout />, {
      preloadedState: { user: { value: { id: "u1", email: "a@b.com", accountType: "USER" } } },
    });

    await user.click(screen.getByText("My Account"));
    expect(screen.getByText("a@b.com")).toBeInTheDocument();

    await user.click(screen.getByText("Logout"));
    expect(store.getState().user.value).toBeNull();
  });
});
