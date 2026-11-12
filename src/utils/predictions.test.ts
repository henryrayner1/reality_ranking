import {
  formatNameList,
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
