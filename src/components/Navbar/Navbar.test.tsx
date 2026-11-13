import { screen } from "@testing-library/react";
import { renderWithProviders } from "../../test/renderWithProviders";
import Navbar from "./Navbar";

const { hideMenu } = vi.hoisted(() => ({ hideMenu: vi.fn() }));
vi.mock("bootstrap/dist/js/bootstrap.bundle.min.js", () => ({
  default: { Collapse: { getOrCreateInstance: vi.fn(() => ({ hide: hideMenu })) } },
}));

describe("Navbar", () => {
  beforeEach(() => hideMenu.mockClear());

  it("collapses the mobile menu once the user is logged out, but not before", () => {
    const { rerender } = renderWithProviders(
      <Navbar loggedIn isAdmin={false} onLoginClick={() => {}} onLogoutClick={() => {}} />
    );
    expect(hideMenu).not.toHaveBeenCalled();
    rerender(<Navbar loggedIn={false} isAdmin={false} onLoginClick={() => {}} onLogoutClick={() => {}} />);
    expect(hideMenu).toHaveBeenCalledTimes(1);
  });

  it("shows Login (not My Rankings/Admin) when logged out", () => {
    renderWithProviders(
      <Navbar loggedIn={false} isAdmin={false} onLoginClick={() => {}} onLogoutClick={() => {}} />
    );
    expect(screen.getByText("Login")).toBeInTheDocument();
    expect(screen.queryByText("My Rankings")).not.toBeInTheDocument();
    expect(screen.queryByText("Admin")).not.toBeInTheDocument();
  });

  it("shows My Rankings and the user's email when logged in", () => {
    renderWithProviders(
      <Navbar loggedIn isAdmin={false} onLoginClick={() => {}} onLogoutClick={() => {}} />,
      { preloadedState: { user: { value: { id: "u1", email: "a@b.com", accountType: "USER" } } } }
    );
    expect(screen.getByText("My Rankings")).toBeInTheDocument();
    expect(screen.getByText("a@b.com")).toBeInTheDocument();
    expect(screen.getByText("Logout")).toBeInTheDocument();
    expect(screen.queryByText("Admin")).not.toBeInTheDocument();
  });

  it("shows the Admin link when isAdmin is true", () => {
    renderWithProviders(
      <Navbar loggedIn isAdmin onLoginClick={() => {}} onLogoutClick={() => {}} />
    );
    expect(screen.getByText("Admin")).toBeInTheDocument();
  });

  it("calls onLoginClick when Login is clicked", async () => {
    const onLoginClick = vi.fn();
    renderWithProviders(
      <Navbar loggedIn={false} isAdmin={false} onLoginClick={onLoginClick} onLogoutClick={() => {}} />
    );
    screen.getByText("Login").click();
    expect(onLoginClick).toHaveBeenCalled();
  });

  it("calls onLogoutClick when Logout is clicked", async () => {
    const onLogoutClick = vi.fn();
    renderWithProviders(
      <Navbar loggedIn isAdmin={false} onLoginClick={() => {}} onLogoutClick={onLogoutClick} />
    );
    screen.getByText("Logout").click();
    expect(onLogoutClick).toHaveBeenCalled();
  });

  it("carries the current show slug from the URL into the tab links", () => {
    renderWithProviders(
      <Navbar loggedIn isAdmin onLoginClick={() => {}} onLogoutClick={() => {}} />,
      { route: "/ranking/survivor" }
    );
    expect(screen.getByText("Insights").closest("a")).toHaveAttribute("href", "/insights/survivor");
    expect(screen.getByText("Admin").closest("a")).toHaveAttribute("href", "/admin/survivor");
  });
});
