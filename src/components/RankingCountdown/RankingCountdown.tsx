import { useEffect, useMemo, useState } from "react";
import type { Episode, RankingMode } from "../../utils/Constants";
import { formatDuration, getDailyResetAt, getEpisodeRankingOpensAt, getFirstAirMs, isPreSeasonOpen, isSeasonEnded } from "../../utils/episodeRankability";
import "./RankingCountdown.css";

interface RankingCountdownProps {
  episodes: Episode[];
  rankingMode?: RankingMode;
  premiereDate?: string | null;
  startDate?: string | null;
  endDate?: string | null;
}

const useNowTick = (intervalMs: number) => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
};

// "Rankings close in …" — only shown while a season has an endDate that
// hasn't passed yet (an ended season shows its own message instead).
// Temporarily hidden (product decision, may come back): flip to true to
// restore it. Only this countdown is hidden; the "season has ended" message
// and every endDate-based lock still apply.
export const SHOW_RANKINGS_CLOSE_COUNTDOWN = false;

const ClosesIn = ({ endAt, now }: { endAt: number | null; now: number }) =>
  SHOW_RANKINGS_CLOSE_COUNTDOWN && endAt !== null && endAt > now
    ? <span>Rankings close in {formatDuration(endAt - now)}</span>
    : null;

// "Pre-season ranking opens in …" before the season's startDate, then
// "Pre-season ranking locks in …" until the first episode airs.
const PreSeasonNote = ({ startDate, premiereDate, episodes, now }: { startDate?: string | null; premiereDate?: string | null; episodes: Episode[]; now: number }) => {
  if (!startDate) return null;
  const startAt = new Date(startDate).getTime();
  const firstAirAt = getFirstAirMs({ premiereDate, episodes });
  if (Number.isNaN(startAt) || startAt >= firstAirAt) return null;
  if (now < startAt) return <span>Pre-season ranking opens in {formatDuration(startAt - now)}</span>;
  if (isPreSeasonOpen({ startDate, premiereDate, episodes }, now) && firstAirAt !== Infinity) {
    return <span>Pre-season ranking locks in {formatDuration(firstAirAt - now)}</span>;
  }
  return null;
};

const DailyCountdown = ({ premiereDate, endAt, now, preSeasonNote }: { premiereDate?: string | null; endAt: number | null; now: number; preSeasonNote: React.ReactNode }) => {
  const premiereAt = premiereDate ? new Date(premiereDate).getTime() : null;

  if (!premiereAt) {
    return <div className="ranking-countdown">{preSeasonNote}<span>Season premiere date not yet announced.</span></div>;
  }
  if (now < premiereAt) {
    return <div className="ranking-countdown">{preSeasonNote}<span>Season premieres in {formatDuration(premiereAt - now)}</span><ClosesIn endAt={endAt} now={now} /></div>;
  }
  const nextResetAt = getDailyResetAt(now);
  return (
    <div className="ranking-countdown">
      {/* No "next day" once the next day would fall after the season's end. */}
      {(endAt === null || nextResetAt < endAt) && <span>Next ranking opens in {formatDuration(nextResetAt - now)}</span>}
      <ClosesIn endAt={endAt} now={now} />
    </div>
  );
};

const RankingCountdown = ({ episodes, rankingMode, premiereDate, startDate, endDate }: RankingCountdownProps) => {
  const now = useNowTick(15_000);
  const endAt = endDate ? new Date(endDate).getTime() : null;
  const preSeasonNote = <PreSeasonNote startDate={startDate} premiereDate={premiereDate} episodes={episodes ?? []} now={now} />;

  const upcoming = useMemo(() => {
    return (episodes ?? [])
      .filter((e) => e.airDate && !e.isPreSeason)
      .map((e) => ({
        episode: e,
        airAt: new Date(e.airDate!).getTime(),
        opensAt: getEpisodeRankingOpensAt(e),
      }))
      .filter((e) => e.opensAt > now)
      // An episode whose ranking window would only open after the season's
      // end never actually becomes rankable — don't count down to it.
      .filter((e) => endAt === null || e.opensAt < endAt)
      .sort((a, b) => a.airAt - b.airAt)[0] ?? null;
  }, [episodes, now, endAt]);

  if (isSeasonEnded({ endDate }, now)) {
    return <div className="ranking-countdown">This season has ended — rankings are closed.</div>;
  }

  if (rankingMode === "DAILY") {
    return <DailyCountdown premiereDate={premiereDate} endAt={endAt} now={now} preSeasonNote={preSeasonNote} />;
  }

  if (!upcoming) {
    return (
      <div className="ranking-countdown">
        {preSeasonNote}
        <span>No upcoming episodes scheduled.</span>
        <ClosesIn endAt={endAt} now={now} />
      </div>
    );
  }

  const hasAired = now >= upcoming.airAt;

  return (
    <div className="ranking-countdown">
      {preSeasonNote}
      {!hasAired && (
        <span>Episode {upcoming.episode.episodeNumber} airs in {formatDuration(upcoming.airAt - now)}</span>
      )}
      <span>Ranking opens in {formatDuration(upcoming.opensAt - now)}</span>
      <ClosesIn endAt={endAt} now={now} />
    </div>
  );
};

export default RankingCountdown;
