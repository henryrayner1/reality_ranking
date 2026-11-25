import {
  formatNameList,
  getPredictedPlacementFor,
  getPredictionRanksFor,
  getFinaleStandings,
  getPredictionStandings,
  getAiredEpisodes,
  getNextPredictableEpisode,
  getRemainingContestantIds,
  isPredictionOpen,
} from "./predictions";
import type { Season } from "./Constants";

const NOW = new Date("2026-11-12T12:00:00Z").getTime();
const future = new Date(NOW + 60 * 60 * 1000).toISOString();
const past = new Date(NOW - 60 * 60 * 1000).toISOString();

describe("isPredictionOpen", () => {
  const season = { endDate: null };

  it("is open before air time and closed from air time on", () => {
    expect(isPredictionOpen({ airDate: future }, season, "EPISODE", NOW)).toBe(true);
    expect(isPredictionOpen({ airDate: past }, season, "EPISODE", NOW)).toBe(false);
    expect(isPredictionOpen({ airDate: new Date(NOW).toISOString() }, season, "EPISODE", NOW)).toBe(false);
  });

  it("is closed for DAILY shows, pre-season rows and unscheduled episodes", () => {
    expect(isPredictionOpen({ airDate: future }, season, "DAILY", NOW)).toBe(false);
    expect(isPredictionOpen({ airDate: future, isPreSeason: true }, season, "EPISODE", NOW)).toBe(false);
    expect(isPredictionOpen({ airDate: undefined }, season, "EPISODE", NOW)).toBe(false);
  });

  it("is closed for a no-elimination episode unless it's the finale", () => {
    expect(isPredictionOpen({ airDate: future, eliminationCount: 0 }, season, "EPISODE", NOW)).toBe(false);
    expect(isPredictionOpen({ airDate: future, eliminationCount: 0, isFinale: true }, season, "EPISODE", NOW)).toBe(true);
  });

  it("is closed once the season has ended", () => {
    expect(isPredictionOpen({ airDate: future }, { endDate: past }, "EPISODE", NOW)).toBe(false);
  });
});

describe("getRemainingContestantIds", () => {
  it("drops contestants eliminated in earlier episodes only", () => {
    const elims = [
      { contestantId: "a", episodeNumber: 1 },
      { contestantId: "b", episodeNumber: 2 },
    ];
    expect(getRemainingContestantIds(["a", "b", "c"], elims, 2)).toEqual(["b", "c"]);
    expect(getRemainingContestantIds(["a", "b", "c"], elims, 3)).toEqual(["c"]);
  });
});

describe("next and aired episodes", () => {
  const season = {
    id: "se1",
    showId: "s1",
    isCurrent: true,
    seasonNumber: 1,
    contestants: [],
    episodes: [
      { id: "pre", episodeNumber: 0, seasonId: "se1", isPreSeason: true },
      { id: "e1", episodeNumber: 1, seasonId: "se1", airDate: past },
      { id: "e2", episodeNumber: 2, seasonId: "se1", airDate: future, eliminationCount: 0 },
      { id: "e3", episodeNumber: 3, seasonId: "se1", airDate: new Date(NOW + 7 * 86400000).toISOString() },
    ],
  } as Season;

  it("skips no-elimination episodes when finding the next one", () => {
    expect(getNextPredictableEpisode(season, "EPISODE", NOW)?.id).toBe("e3");
  });

  it("lists aired real episodes newest first", () => {
    expect(getAiredEpisodes(season, NOW).map((e) => e.id)).toEqual(["e1"]);
  });
});

describe("formatNameList", () => {
  it("joins names in plain English", () => {
    expect(formatNameList(["A"])).toBe("A");
    expect(formatNameList(["A", "B"])).toBe("A and B");
    expect(formatNameList(["A", "B", "C"])).toBe("A, B and C");
  });
});

describe("getPredictionStandings", () => {
  const roster = [
    { id: "a", name: "Ann" },
    { id: "b", name: "Bea" },
    { id: "c", name: "Cal" },
    { id: "d", name: "Dee" },
    { id: "e", name: "Eve" },
  ];

  it("ranks by votes, shares percent of predictors, and puts everyone tied for last at the bottom rank", () => {
    const s = getPredictionStandings({ predictorCount: 10, votes: { b: 6, a: 3, c: 1 } }, roster);
    expect(s.map((x) => [x.contestantId, x.rank, x.percent])).toEqual([
      ["b", 1, 0.6],
      ["a", 2, 0.3],
      ["c", 3, 0.1],
      ["d", 5, 0],
      ["e", 5, 0],
    ]);
  });

  it("uses competition ranking for ties above last place", () => {
    const s = getPredictionStandings({ predictorCount: 4, votes: { a: 2, b: 2, c: 1 } }, roster);
    expect(s.map((x) => x.rank)).toEqual([1, 1, 3, 5, 5]);
  });

  it("lets percentages pass 100% in total when each person picks several", () => {
    const s = getPredictionStandings({ predictorCount: 2, votes: { a: 2, b: 2 } }, roster.slice(0, 3));
    expect(s.map((x) => x.percent)).toEqual([1, 1, 0]);
  });

  it("treats an all-way tie as tied for first, not last", () => {
    const s = getPredictionStandings({ predictorCount: 3, votes: { a: 1, b: 1, c: 1 } }, roster.slice(0, 3));
    expect(s.map((x) => x.rank)).toEqual([1, 1, 1]);
  });
});

describe("getFinaleStandings", () => {
  const roster = [{ id: "a", name: "Ann" }, { id: "b", name: "Bea" }, { id: "c", name: "Cal" }, { id: "d", name: "Dee" }];

  it("orders by average predicted placement with per-placement shares", () => {
    // 4 predictions: a a b b winners; d placed 4th by everyone.
    const s = getFinaleStandings(
      { predictorCount: 4, votes: { a: 2, b: 2 }, placementVotes: { a: [2, 1, 1], b: [2, 2], c: [0, 1, 3], d: [0, 0, 0, 4] } },
      roster
    );
    expect(s.map((x) => x.contestantId)).toEqual(["b", "a", "c", "d"]);
    expect(s[0].averagePlacement).toBe(1.5);
    expect(s[1].averagePlacement).toBe(1.75);
    expect(s[1].shares).toEqual([0.5, 0.25, 0.25, 0]);
    expect(s[3].shares).toEqual([0, 0, 0, 1]);
  });

  it("breaks average ties by winner picks, then name, and puts unplaced contestants last", () => {
    const s = getFinaleStandings({ predictorCount: 2, votes: { b: 1 }, placementVotes: { b: [1, 0, 1], c: [0, 2] } }, roster);
    expect(s.map((x) => x.contestantId)).toEqual(["b", "c", "a", "d"]);
    expect(s[2].averagePlacement).toBeNull();
  });

  it("falls back to winner picks when placementVotes is missing", () => {
    const s = getFinaleStandings({ predictorCount: 3, votes: { c: 2, a: 1 } }, roster);
    expect(s.map((x) => x.contestantId)).toEqual(["c", "a", "b", "d"]);
    expect(s[0].shares).toEqual([2 / 3, 0, 0, 0]);
  });
});

describe("getPredictionRanksFor", () => {
  it("ranks a contestant among those still in at each episode", () => {
    const season = {
      id: "se1", showId: "s1", isCurrent: true, seasonNumber: 1,
      contestants: [
        { id: "a", name: "Ann", seasonId: "se1" },
        { id: "b", name: "Bea", seasonId: "se1" },
        { id: "c", name: "Cal", seasonId: "se1" },
      ],
      episodes: [
        { id: "e1", episodeNumber: 1, seasonId: "se1", eliminations: [{ contestantId: "a" }] },
        { id: "e2", episodeNumber: 2, seasonId: "se1", eliminations: [] },
      ],
    } as unknown as Season;
    const ranks = getPredictionRanksFor("c", season, [
      { episodeId: "e1", episodeNumber: 1, isFinale: false, predictorCount: 2, votes: { a: 2 } },
      { episodeId: "e2", episodeNumber: 2, isFinale: false, predictorCount: 2, votes: { c: 2 } },
    ]);
    // Episode 1: three still in, c tied for last with b -> 3. Episode 2: a gone, c most predicted -> 1.
    expect([...ranks]).toEqual([[1, 3], [2, 1]]);
  });
  it("leaves out the finale, whose rank means predicted to win", () => {
    const season = {
      id: "se1", showId: "s1", isCurrent: true, seasonNumber: 1,
      contestants: [{ id: "a", name: "Ann", seasonId: "se1" }, { id: "b", name: "Bea", seasonId: "se1" }],
      episodes: [{ id: "e1", episodeNumber: 1, seasonId: "se1", eliminations: [] }],
    } as unknown as Season;
    const ranks = getPredictionRanksFor("a", season, [
      { episodeId: "e1", episodeNumber: 1, isFinale: true, predictorCount: 2, votes: { a: 2 } },
    ]);
    expect(ranks.size).toBe(0);
  });
});

describe("getPredictedPlacementFor", () => {
  const season = {
    id: "se1", showId: "s1", isCurrent: true, seasonNumber: 1,
    contestants: [
      { id: "a", name: "Ann", seasonId: "se1" },
      { id: "b", name: "Bea", seasonId: "se1" },
      { id: "c", name: "Cal", seasonId: "se1" },
    ],
    episodes: [
      { id: "e1", episodeNumber: 1, seasonId: "se1", eliminations: [{ contestantId: "c" }] },
      { id: "e2", episodeNumber: 2, seasonId: "se1", isFinale: true, eliminations: [] },
    ],
  } as unknown as Season;
  const insights = [
    { episodeId: "e1", episodeNumber: 1, isFinale: false, predictorCount: 2, votes: { c: 2 } },
    // Two finale predictions: a, b and b, a; then a third a, b.
    { episodeId: "e2", episodeNumber: 2, isFinale: true, predictorCount: 3, votes: { a: 2, b: 1 }, placementVotes: { a: [2, 1], b: [1, 2] } },
  ];

  it("gives a finalist's average predicted placement and consensus spot", () => {
    expect(getPredictedPlacementFor("a", season, insights)).toEqual({ episodeNumber: 2, averagePlacement: 4 / 3, position: 1 });
    expect(getPredictedPlacementFor("b", season, insights)).toEqual({ episodeNumber: 2, averagePlacement: 5 / 3, position: 2 });
  });

  it("is null for someone not in the finale, or with no finale predictions", () => {
    expect(getPredictedPlacementFor("c", season, insights)).toBeNull();
    expect(getPredictedPlacementFor("a", season, insights.slice(0, 1))).toBeNull();
  });
});
