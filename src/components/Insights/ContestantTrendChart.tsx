import { CartesianGrid, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { type InsightsResponse } from "../../utils/Constants";

interface ChartPoint {
  episodeNumber: number;
  favoriteAvg: number | null;
  winnerAvg: number | null;
}

interface ContestantTrendChartProps {
  contestantId: string;
  favoriteInsights: InsightsResponse;
  winnerInsights: InsightsResponse;
  contestantCount: number;
  eliminationInfo?: { episodeNumber: number; eliminationType: string } | null;
}

const buildChartData = (
  contestantId: string,
  favoriteInsights: InsightsResponse,
  winnerInsights: InsightsResponse
): ChartPoint[] => {
  const episodeNumbers = [...new Set([
    ...favoriteInsights.episodes.map((w) => w.episodeNumber),
    ...winnerInsights.episodes.map((w) => w.episodeNumber),
  ])].sort((a, b) => a - b);

  return episodeNumbers.map((episodeNumber) => {
    const favEpisode = favoriteInsights.episodes.find((w) => w.episodeNumber === episodeNumber);
    const winEpisode = winnerInsights.episodes.find((w) => w.episodeNumber === episodeNumber);
    const favEntry = favEpisode?.contestantAverages.find((c) => c.contestantId === contestantId);
    const winEntry = winEpisode?.contestantAverages.find((c) => c.contestantId === contestantId);
    return {
      episodeNumber,
      favoriteAvg: favEntry?.averagePosition ?? null,
      winnerAvg: winEntry?.averagePosition ?? null,
    };
  });
};

const ContestantTrendChart = (props: ContestantTrendChartProps) => {
  const chartData = buildChartData(props.contestantId, props.favoriteInsights, props.winnerInsights);

  if (chartData.length === 0) {
    return <p className="insights-placeholder">No ranking submissions yet for this contestant.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={chartData} margin={{ top: 25, right: 20, bottom: 10, left: 5 }}>
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
          formatter={(value: number, name: string) => [value != null ? value.toFixed(2) : "—", name]}
          labelFormatter={(episode) => `Episode ${episode}`}
        />
        <Legend />
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
      </LineChart>
    </ResponsiveContainer>
  );
};

export default ContestantTrendChart;
