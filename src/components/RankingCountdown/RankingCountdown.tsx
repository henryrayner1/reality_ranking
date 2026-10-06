import { useEffect, useMemo, useState } from "react";
import type { Episode, RankingMode } from "../../utils/Constants";
import { formatDuration, getDailyResetAt, getEpisodeRankingOpensAt, isSeasonEnded } from "../../utils/episodeRankability";
import "./RankingCountdown.css";

interface RankingCountdownProps {
  episodes: Episode[];
  rankingMode?: RankingMode;
  premiereDate?: string | null;
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
const ClosesIn = ({ endAt, now }: { endAt: number | null; now: number }) =>
  endAt !== null && endAt > now ? <span>Rankings close in {formatDuration(endAt - now)}</span> : null;

const DailyCountdown = ({ premiereDate, endAt, now }: { premiereDate?: string | null; endAt: number | null; now: number }) => {
  const premiereAt = premiereDate ? new Date(premiereDate).getTime() : null;

  if (!premiereAt) {
    return <div className="ranking-countdown">Season premiere date not yet announced.</div>;
  }
  if (now < premiereAt) {
    return <div className="ranking-countdown"><span>Season premieres in {formatDuration(premiereAt - now)}</span><ClosesIn endAt={endAt} now={now} /></div>;
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

const RankingCountdown = ({ episodes, rankingMode, premiereDate, endDate }: RankingCountdownProps) => {
  const now = useNowTick(15_000);
  const endAt = endDate ? new Date(endDate).getTime() : null;

  const upcoming = useMemo(() => {
    return (episodes ?? [])
      .filter((e) => e.airDate)
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
    return <DailyCountdown premiereDate={premiereDate} endAt={endAt} now={now} />;
  }

  if (!upcoming) {
    return (
      <div className="ranking-countdown">
        <span>No upcoming episodes scheduled.</span>
        <ClosesIn endAt={endAt} now={now} />
      </div>
    );
  }

  const hasAired = now >= upcoming.airAt;

  return (
    <div className="ranking-countdown">
      {!hasAired && (
        <span>Episode {upcoming.episode.episodeNumber} airs in {formatDuration(upcoming.airAt - now)}</span>
      )}
      <span>Ranking opens in {formatDuration(upcoming.opensAt - now)}</span>
      <ClosesIn endAt={endAt} now={now} />
    </div>
  );
};

export default RankingCountdown;
