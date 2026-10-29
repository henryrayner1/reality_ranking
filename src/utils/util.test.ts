import { checkUserLoggedIn, createUser, getEliminations } from "./util";

const mockFetch = (body: unknown, status = 200) =>
  vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } })
  );

describe("login tokens", () => {
  afterEach(() => vi.restoreAllMocks());

  it("sends the stored token as a Bearer header", async () => {
    localStorage.setItem("user", JSON.stringify({ id: "u1", email: "a@b.com", accountType: "ADMIN", token: "abc.def" }));
    const fetchSpy = mockFetch([]);

    await getEliminations();

    const init = fetchSpy.mock.calls[0][1] as RequestInit;
    expect(new Headers(init.headers).get("Authorization")).toBe("Bearer abc.def");
  });

  it("sends no Authorization header when logged out", async () => {
    const fetchSpy = mockFetch([]);

    await getEliminations();

    const init = fetchSpy.mock.calls[0][1] as RequestInit | undefined;
    expect(new Headers(init?.headers).has("Authorization")).toBe(false);
  });

  it("treats a session saved without a token as logged out and clears it", () => {
    localStorage.setItem("user", JSON.stringify({ id: "u1", email: "a@b.com", accountType: "ADMIN" }));

    expect(checkUserLoggedIn()).toBeNull();
    expect(localStorage.getItem("user")).toBeNull();
  });

  it("rejects signup for an existing email instead of storing the error as a user", async () => {
    mockFetch({ error: "An account with this email already exists" }, 409);

    await expect(createUser("a@b.com", "pw")).rejects.toThrow("An account with this email already exists");
    expect(localStorage.getItem("user")).toBeNull();
  });
});
