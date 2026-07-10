import { useEffect, useMemo, useState } from "react";
import type { Episode, RankingMode } from "../../utils/Constants";
import { formatDuration, getDailyResetAt, getEpisodeRankingOpensAt } from "../../utils/episodeRankability";
import "./RankingCountdown.css";

interface RankingCountdownProps {
  episodes: Episode[];
  rankingMode?: RankingMode;
  premiereDate?: string | null;
}

const useNowTick = (intervalMs: number) => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
};

const DailyCountdown = ({ premiereDate, now }: { premiereDate?: string | null; now: number }) => {
  const premiereAt = premiereDate ? new Date(premiereDate).getTime() : null;

  if (!premiereAt) {
    return <div className="ranking-countdown">Season premiere date not yet announced.</div>;
  }
  if (now < premiereAt) {
    return <div className="ranking-countdown"><span>Season premieres in {formatDuration(premiereAt - now)}</span></div>;
  }
  return <div className="ranking-countdown"><span>Next ranking opens in {formatDuration(getDailyResetAt(now) - now)}</span></div>;
};

const RankingCountdown = ({ episodes, rankingMode, premiereDate }: RankingCountdownProps) => {
  const now = useNowTick(15_000);

  const upcoming = useMemo(() => {
    return (episodes ?? [])
      .filter((e) => e.airDate)
      .map((e) => ({
        episode: e,
        airAt: new Date(e.airDate!).getTime(),
        opensAt: getEpisodeRankingOpensAt(e),
      }))
      .filter((e) => e.opensAt > now)
      .sort((a, b) => a.airAt - b.airAt)[0] ?? null;
  }, [episodes, now]);

  if (rankingMode === "DAILY") {
    return <DailyCountdown premiereDate={premiereDate} now={now} />;
  }

  if (!upcoming) {
    return <div className="ranking-countdown">No upcoming episodes scheduled.</div>;
  }

  const hasAired = now >= upcoming.airAt;

  return (
    <div className="ranking-countdown">
      {!hasAired && (
        <span>Episode {upcoming.episode.episodeNumber} airs in {formatDuration(upcoming.airAt - now)}</span>
      )}
      <span>Ranking opens in {formatDuration(upcoming.opensAt - now)}</span>
    </div>
  );
};

export default RankingCountdown;
