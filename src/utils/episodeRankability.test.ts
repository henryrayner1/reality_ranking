import { formatEpisodeHeading, getFirstAirMs, isPreSeasonOpen, isPreSeasonVisible } from "./episodeRankability";

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
