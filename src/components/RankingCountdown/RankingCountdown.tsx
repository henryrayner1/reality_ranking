import { useEffect, useMemo, useState } from "react";
import type { Episode } from "../../utils/Constants";
import { formatDuration, getEpisodeRankingOpensAt } from "../../utils/episodeRankability";
import "./RankingCountdown.css";

interface RankingCountdownProps {
  episodes: Episode[];
}

const useNowTick = (intervalMs: number) => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
};

const RankingCountdown = ({ episodes }: RankingCountdownProps) => {
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
