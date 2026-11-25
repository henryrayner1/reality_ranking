import { buildOwnInsights, buildPastRankingColumn, checkUserLoggedIn, createUser, formatPlacement, getEliminatedInEpisode, getEliminations, getFirstName, getIconLabel, getPredictionName, getRankedPositions, normalizeRankedIds, uploadContestantPhoto } from "./util";
import { backendUrl } from "./apiBase";
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
    const column = buildPastRankingColumn({ ...ranking, type: "WINNER" }, 2, eliminations, ids, ids, getName);
    expect(column.map((entry) => [entry.contestantId, entry.eliminated, entry.placement])).toEqual([
      ["c", false, 1],
      ["a", false, 2],
      ["b", false, 3],
      ["d", true, undefined],
      ["e", true, undefined],
    ]);
  });

  it("keeps an unplaced finalist ranked (not greyed) in the finale's Favorite column", () => {
    const column = buildPastRankingColumn(ranking, 2, eliminations, ids, ids, getName);
    expect(column.map((entry) => [entry.contestantId, entry.eliminated, entry.placement])).toEqual([
      ["c", false, 1],
      ["a", false, 2],
      ["b", false, 3],
      ["d", false, undefined],
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

describe("image uploads", () => {
  afterEach(() => vi.restoreAllMocks());

  it("sends the login token with a contestant photo upload", async () => {
    localStorage.setItem("user", JSON.stringify({ id: "u1", email: "a@b.com", accountType: "ADMIN", token: "abc.def" }));
    const fetchSpy = mockFetch({ file: "https://images.example.com/survivor/season_51/contestants/ori.png" });

    const url = await uploadContestantPhoto(new File(["x"], "ori.png", { type: "image/png" }), "Survivor", 51);

    const init = fetchSpy.mock.calls[0][1] as RequestInit;
    expect(new Headers(init.headers).get("Authorization")).toBe("Bearer abc.def");
    expect(url).toMatch(/^https:\/\/images\.example\.com\/survivor\/season_51\/contestants\/ori\.png\?v=\d+$/);
  });

  it("uses absolute image URLs as-is and prefixes backend paths", () => {
    expect(backendUrl("https://images.example.com/a.png")).toBe("https://images.example.com/a.png");
    expect(backendUrl("/uploads/a.png")).toBe("/uploads/a.png");
  });
});

describe("contestant names", () => {
  it("uses the first word, two with firstNameHasSpace, or the nickname over both", () => {
    expect(getFirstName("Thien An Nguyen")).toBe("Thien");
    expect(getFirstName("Thien An Nguyen", true)).toBe("Thien An");
    expect(getFirstName("William Smith", false, "Bubba")).toBe("Bubba");
    expect(getFirstName("William Smith", false, "  ")).toBe("William");
    expect(getIconLabel("William Smith", false, "Bubba")).toBe("BUBBA");
  });

  it("shows the full name on the Predictions page only for displayFullName shows", () => {
    const c = { name: "Moh Dafok", nickname: null };
    expect(getPredictionName(c, { displayFullName: false })).toBe("Moh");
    expect(getPredictionName(c, { displayFullName: true })).toBe("Moh Dafok");
    expect(getPredictionName({ name: "William Smith", nickname: "Bubba" }, null)).toBe("Bubba");
  });
});

describe("eliminations in the episode they happen", () => {
  const names: Record<string, string> = { a: "Ava", b: "Ben", c: "Cal", d: "Dee" };
  const getName = (id: string) => names[id] ?? "";
  const ids = Object.keys(names);
  // Episode 2 is a double elimination (Dee and Ben), episode 1 has none.
  const eliminations: Elimination[] = [
    { episodeId: "ep2", episodeNumber: 2, seasonId: "s", eliminationType: "", contestantIds: ["d", "b"] },
  ];
  const column = (ranking: Ranking, episodeNumber: number) =>
    buildPastRankingColumn(ranking, episodeNumber, eliminations, ids, ids, getName).map((e) => [e.contestantId, e.eliminated]);

  it("lists who went home in an episode A-Z", () => {
    expect(getEliminatedInEpisode(eliminations, 2, getName)).toEqual(["b", "d"]);
    expect(getEliminatedInEpisode(eliminations, 1, getName)).toEqual([]);
  });

  it("FAVORITE ranks anyone leaving who's missing last, and keeps a submitted position", () => {
    expect(normalizeRankedIds(["c", "a"], "FAVORITE", ["b", "d"])).toEqual(["c", "a", "b", "d"]);
    expect(normalizeRankedIds(["d", "c", "a", "b"], "FAVORITE", ["b", "d"])).toEqual(["d", "c", "a", "b"]);
  });

  it("WINNER always ranks anyone leaving last", () => {
    expect(normalizeRankedIds(["d", "c", "a", "b"], "WINNER", ["b", "d"])).toEqual(["c", "a", "b", "d"]);
    expect(normalizeRankedIds(["c", "a"], "WINNER", [])).toEqual(["c", "a"]);
  });

  it("keeps a Favorite ranking's leaving contestants in colour that episode, greyed the next", () => {
    // An old ranking without them: they're ranked last, in colour.
    const old: Ranking = { id: "r", userId: "u", episodeId: "ep2", type: "FAVORITE", contestantIds: ["c", "a"] };
    expect(column(old, 2)).toEqual([["c", false], ["a", false], ["b", false], ["d", false]]);
    // A new ranking that placed Dee first keeps her there.
    const withDee: Ranking = { ...old, contestantIds: ["d", "c", "a", "b"] };
    expect(column(withDee, 2)).toEqual([["d", false], ["c", false], ["a", false], ["b", false]]);
    expect(column({ ...old, episodeId: "ep3" }, 3)).toEqual([["c", false], ["a", false], ["b", true], ["d", true]]);
  });

  it("greys a Winner ranking's leaving contestants the same episode", () => {
    const ranking: Ranking = { id: "r", userId: "u", episodeId: "ep2", type: "WINNER", contestantIds: ["d", "c", "a"] };
    expect(column(ranking, 2)).toEqual([["c", false], ["a", false], ["b", true], ["d", true]]);
  });

  it("applies the rule to a user's own insights", () => {
    const own = buildOwnInsights(
      [{ id: "r", userId: "u", episodeId: "ep2", type: "WINNER", contestantIds: ["d", "c", "a"], episode: { id: "ep2", episodeNumber: 2, seasonId: "s" } as Ranking["episode"] }],
      "WINNER",
      "s",
      (n) => (n === 2 ? ["b", "d"] : [])
    );
    expect(own.episodes[0].contestantAverages).toEqual([
      { contestantId: "c", averagePosition: 1 },
      { contestantId: "a", averagePosition: 2 },
      { contestantId: "b", averagePosition: 4 },
      { contestantId: "d", averagePosition: 4 },
    ]);
  });

  it("ties everyone the rule puts last at last place, but keeps a Favorite leaver's real position", () => {
    expect(getRankedPositions(["c", "a", "b", "d"], "WINNER", ["b", "d"])).toEqual([
      { contestantId: "c", position: 1 },
      { contestantId: "a", position: 2 },
      { contestantId: "b", position: 4 },
      { contestantId: "d", position: 4 },
    ]);
    // Dee was ranked first by the user; Ben was left out, so he's tied last.
    expect(getRankedPositions(["d", "c", "a"], "FAVORITE", ["b", "d"])).toEqual([
      { contestantId: "d", position: 1 },
      { contestantId: "c", position: 2 },
      { contestantId: "a", position: 3 },
      { contestantId: "b", position: 4 },
    ]);
    expect(getRankedPositions(["c", "a"], "FAVORITE", ["b", "d"]).map((p) => p.position)).toEqual([1, 2, 4, 4]);
  });
});
