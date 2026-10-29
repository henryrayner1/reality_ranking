import { FINALE_RESULTS_PENDING_MS, formatEpisodeHeading, getFinaleEpisode, getFirstAirMs, isFinaleResultsPending, isPreSeasonOpen, isPreSeasonVisible } from "./episodeRankability";
import type { Episode } from "./Constants";

const START = "2026-01-01T00:00:00.000Z";
const FIRST_AIR = "2026-02-01T00:00:00.000Z";
const ms = (iso: string) => new Date(iso).getTime();
const preSeason = { airDate: undefined, isPreSeason: true };

describe("pre-season rankability", () => {
  const season = {
    startDate: START,
    episodes: [preSeason, { airDate: "2026-03-01T00:00:00.000Z" }, { airDate: FIRST_AIR }],
  };

  it("has no pre-season without a startDate", () => {
    expect(isPreSeasonVisible({ episodes: [] }, ms(FIRST_AIR))).toBe(false);
    expect(isPreSeasonOpen({ episodes: [] }, ms(FIRST_AIR))).toBe(false);
  });

  it("is hidden and closed before the startDate", () => {
    const before = ms(START) - 1;
    expect(isPreSeasonVisible(season, before)).toBe(false);
    expect(isPreSeasonOpen(season, before)).toBe(false);
  });

  it("is open from the startDate until the earliest real episode airs", () => {
    expect(isPreSeasonOpen(season, ms(START))).toBe(true);
    expect(isPreSeasonOpen(season, ms(FIRST_AIR) - 1)).toBe(true);
  });

  it("locks, but stays visible, once the first episode airs", () => {
    expect(isPreSeasonOpen(season, ms(FIRST_AIR))).toBe(false);
    expect(isPreSeasonVisible(season, ms(FIRST_AIR))).toBe(true);
  });

  it("locks at the premiere date when that comes before any episode row (DAILY)", () => {
    const daily = { startDate: START, premiereDate: "2026-01-15T05:00:00.000Z", episodes: [preSeason] };
    expect(getFirstAirMs(daily)).toBe(ms("2026-01-15T05:00:00.000Z"));
    expect(isPreSeasonOpen(daily, ms("2026-01-15T05:00:00.000Z"))).toBe(false);
  });

  it("stays open with nothing scheduled yet", () => {
    expect(getFirstAirMs({ episodes: [preSeason] })).toBe(Infinity);
    expect(isPreSeasonOpen({ startDate: START, episodes: [preSeason] }, ms("2030-01-01T00:00:00.000Z"))).toBe(true);
  });

  it("labels the pre-season column 'Pre'", () => {
    expect(formatEpisodeHeading(0)).toBe("Pre");
    expect(formatEpisodeHeading(3)).toBe("3");
  });
});

describe("isFinaleResultsPending", () => {
  const FINALE_AIR = "2026-11-25T01:00:00.000Z";
  const episodes: Episode[] = [
    { id: "pre", episodeNumber: 0, seasonId: "s", isPreSeason: true },
    { id: "e10", episodeNumber: 10, seasonId: "s", airDate: "2026-11-18T01:00:00.000Z", eliminations: [{} as never] },
    { id: "e11", episodeNumber: 11, seasonId: "s", airDate: FINALE_AIR, eliminations: [] },
  ];
  const season = { endDate: FINALE_AIR, episodes };

  it("is pending from the finale's start until results are logged", () => {
    expect(isFinaleResultsPending(season, ms(FINALE_AIR) - 1)).toBe(false);
    expect(isFinaleResultsPending(season, ms(FINALE_AIR))).toBe(true);
    expect(isFinaleResultsPending(season, ms(FINALE_AIR) + 3 * 60 * 60 * 1000)).toBe(true);
  });

  it("stops once any finale result is logged", () => {
    const withResults = { ...season, episodes: episodes.map((e) => (e.id === "e11" ? { ...e, eliminations: [{} as never] } : e)) };
    expect(isFinaleResultsPending(withResults, ms(FINALE_AIR) + 1000)).toBe(false);
  });

  it("gives up after a week, so old seasons without results aren't pending forever", () => {
    expect(isFinaleResultsPending(season, ms(FINALE_AIR) + FINALE_RESULTS_PENDING_MS)).toBe(false);
  });

  it("needs an end date to know which episode is the finale", () => {
    expect(isFinaleResultsPending({ episodes }, ms(FINALE_AIR) + 1000)).toBe(false);
  });
});

describe("getFinaleEpisode", () => {
  const episodes: Episode[] = [
    { id: "e1", episodeNumber: 1, seasonId: "s" },
    { id: "e2", episodeNumber: 2, seasonId: "s", isFinale: true },
    { id: "e3", episodeNumber: 3, seasonId: "s" },
  ];

  it("uses the episode marked as the finale, even without an end date", () => {
    expect(getFinaleEpisode({ episodes })?.id).toBe("e2");
  });

  it("falls back to the last episode of a season with an end date", () => {
    const unmarked = episodes.map((e) => ({ ...e, isFinale: false }));
    expect(getFinaleEpisode({ episodes: unmarked, endDate: "2026-01-01T00:00:00.000Z" })?.id).toBe("e3");
    expect(getFinaleEpisode({ episodes: unmarked })).toBeNull();
  });
});
