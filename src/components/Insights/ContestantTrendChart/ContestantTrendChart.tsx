import { Area, CartesianGrid, ComposedChart, Legend, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { type EliminationEntry, type InsightsResponse } from "../../../utils/Constants";

interface ChartPoint {
  episodeNumber: number;
  favoriteAvg: number | null;
  winnerAvg: number | null;
  fieldSize: number;
}

interface ContestantTrendChartProps {
  contestantId: string;
  favoriteInsights: InsightsResponse;
  winnerInsights: InsightsResponse;
  contestantCount: number;
  eliminations: EliminationEntry[];
  eliminationInfo?: { episodeNumber: number; eliminationType: string } | null;
}

// Submitted rankings only contain still-active contestants, so the worst
// possible rank shrinks with every elimination — a contestant ranked last every
// episode would otherwise look like they're climbing. Field size at episode N
// excludes anyone eliminated in episode N itself, matching getEliminationOrder's
// "out of the ranked list starting the same episode" rule.
export const getFieldSizeByEpisode = (
  rosterSize: number,
  eliminations: EliminationEntry[],
  episodeNumbers: number[]
): Map<number, number> => {
  // Deduped per contestant, same as getEliminationOrder: a duplicate admin
  // elimination entry must not shrink the field twice.
  const eliminationEpisodeByContestant = new Map<string, number>();
  eliminations.forEach((e) => {
    const episodeNumber = e.episode?.episodeNumber;
    if (episodeNumber == null) return;
    const existing = eliminationEpisodeByContestant.get(e.contestantId);
    if (existing == null || episodeNumber < existing) {
      eliminationEpisodeByContestant.set(e.contestantId, episodeNumber);
    }
  });
  const eliminationEpisodes = [...eliminationEpisodeByContestant.values()];

  return new Map(
    episodeNumbers.map((episodeNumber) => [
      episodeNumber,
      rosterSize - eliminationEpisodes.filter((n) => n <= episodeNumber).length,
    ])
  );
};

const FIELD_SIZE_SERIES_NAME = "Number of Contestants";

// Recharts sorts tooltip and legend rows by name by default; keep that for
// Favorite/Winner but always list the contestant count last.
const fieldSizeLastSortKey = (name: unknown) => `${name === FIELD_SIZE_SERIES_NAME ? 1 : 0}${name}`;

const buildChartData = (
  contestantId: string,
  favoriteInsights: InsightsResponse,
  winnerInsights: InsightsResponse,
  contestantCount: number,
  eliminations: EliminationEntry[]
): ChartPoint[] => {
  const episodeNumbers = [...new Set([
    ...favoriteInsights.episodes.map((w) => w.episodeNumber),
    ...winnerInsights.episodes.map((w) => w.episodeNumber),
  ])].sort((a, b) => a - b);
  const fieldSizeByEpisode = getFieldSizeByEpisode(contestantCount, eliminations, episodeNumbers);

  return episodeNumbers.map((episodeNumber) => {
    const favEpisode = favoriteInsights.episodes.find((w) => w.episodeNumber === episodeNumber);
    const winEpisode = winnerInsights.episodes.find((w) => w.episodeNumber === episodeNumber);
    const favEntry = favEpisode?.contestantAverages.find((c) => c.contestantId === contestantId);
    const winEntry = winEpisode?.contestantAverages.find((c) => c.contestantId === contestantId);
    return {
      episodeNumber,
      favoriteAvg: favEntry?.averagePosition ?? null,
      winnerAvg: winEntry?.averagePosition ?? null,
      fieldSize: fieldSizeByEpisode.get(episodeNumber) ?? contestantCount,
    };
  });
};

const ContestantTrendChart = (props: ContestantTrendChartProps) => {
  const chartData = buildChartData(
    props.contestantId,
    props.favoriteInsights,
    props.winnerInsights,
    props.contestantCount,
    props.eliminations
  );

  if (chartData.length === 0) {
    return <p className="insights-placeholder">No ranking submissions yet for this contestant.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <ComposedChart data={chartData} margin={{ top: 25, right: 20, bottom: 10, left: 5 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="episodeNumber" label={{ value: "Episode", position: "insideBottom", offset: -5 }} />
        {/* Lower position = better rank, so the axis is reversed to put rank 1 at the top. */}
        <YAxis
          reversed
          allowDecimals
          domain={[1, props.contestantCount]}
          label={{ value: "Avg. Rank", angle: -90, position: "insideLeft" }}
        />
        <Tooltip
          formatter={(value: number, name: string) => {
            if (name === FIELD_SIZE_SERIES_NAME) return [value, name];
            return [value != null ? value.toFixed(2) : "—", name];
          }}
          labelFormatter={(episode) => `Episode ${episode}`}
          itemSorter={(item) => fieldSizeLastSortKey(item.name)}
        />
        <Legend wrapperStyle={{ paddingTop: 16 }} itemSorter={(item) => fieldSizeLastSortKey(item.value)} />
        {/* Shades rank positions that no longer exist once contestants are eliminated. */}
        <Area
          dataKey={(d: ChartPoint) => [d.fieldSize, props.contestantCount]}
          type="linear"
          fill="#9ca3af"
          fillOpacity={0.15}
          stroke="none"
          legendType="none"
          tooltipType="none"
          isAnimationActive={false}
        />
        <Line
          type="linear"
          dataKey="fieldSize"
          name={FIELD_SIZE_SERIES_NAME}
          stroke="#9ca3af"
          strokeDasharray="5 3"
          dot={false}
          isAnimationActive={false}
        />
        <Line type="monotone" dataKey="favoriteAvg" name="Favorite" stroke="#e0489f" connectNulls dot />
        <Line type="monotone" dataKey="winnerAvg" name="Winner" stroke="#2b7fb8" connectNulls dot />
        {props.eliminationInfo && (
          <ReferenceLine
            x={props.eliminationInfo.episodeNumber}
            stroke="red"
            strokeDasharray="4 4"
            label={{ value: `Eliminated`, position: "top", fill: "red", fontSize: 11 }}
          />
        )}
      </ComposedChart>
    </ResponsiveContainer>
  );
};

export default ContestantTrendChart;
