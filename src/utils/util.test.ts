import { buildPastRankingColumn, checkUserLoggedIn, createUser, formatPlacement, getEliminations } from "./util";
import type { Elimination, Ranking } from "./Constants";

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

describe("finale placements", () => {
  const names: Record<string, string> = { a: "Ava", b: "Ben", c: "Cal", d: "Dee", e: "Eve" };
  const getName = (id: string) => names[id] ?? "";
  const ids = Object.keys(names);
  const eliminations: Elimination[] = [
    { episodeId: "ep1", episodeNumber: 1, seasonId: "s", eliminationType: "", contestantIds: ["e"] },
    // Finale: Cal wins, Ava 2nd, Ben 3rd, Dee eliminated with no placement.
    { episodeId: "ep2", episodeNumber: 2, seasonId: "s", eliminationType: "", contestantIds: ["a", "b", "c", "d"], placements: { c: 1, a: 2, b: 3 } },
  ];
  const ranking: Ranking = { id: "r", userId: "u", episodeId: "ep2", type: "FAVORITE", contestantIds: ["a", "b", "c", "d", "e"] };

  it("puts placed finalists at the top of the finale column, in placement order, and not eliminated", () => {
    const column = buildPastRankingColumn(ranking, 2, eliminations, ids, ids, getName);
    expect(column.map((entry) => [entry.contestantId, entry.eliminated, entry.placement])).toEqual([
      ["c", false, 1],
      ["a", false, 2],
      ["b", false, 3],
      ["d", true, undefined],
      ["e", true, undefined],
    ]);
  });

  it("leaves earlier columns alone", () => {
    const column = buildPastRankingColumn({ ...ranking, episodeId: "ep1" }, 1, eliminations, ids, ids, getName);
    expect(column.some((entry) => entry.placement !== undefined)).toBe(false);
  });

  it("formats placements", () => {
    expect([1, 2, 3, 4, 11, 12, 13, 21, 22].map(formatPlacement)).toEqual(["Winner", "2nd", "3rd", "4th", "11th", "12th", "13th", "21st", "22nd"]);
  });
});
