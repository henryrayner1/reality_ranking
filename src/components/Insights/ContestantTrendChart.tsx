import { CartesianGrid, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { type InsightsResponse } from "../../utils/Constants";

interface ChartPoint {
  weekNumber: number;
  favoriteAvg: number | null;
  winnerAvg: number | null;
}

interface ContestantTrendChartProps {
  contestantId: string;
  favoriteInsights: InsightsResponse;
  winnerInsights: InsightsResponse;
  contestantCount: number;
  eliminationInfo?: { weekNumber: number; eliminationType: string } | null;
}

const buildChartData = (
  contestantId: string,
  favoriteInsights: InsightsResponse,
  winnerInsights: InsightsResponse
): ChartPoint[] => {
  const weekNumbers = [...new Set([
    ...favoriteInsights.weeks.map((w) => w.weekNumber),
    ...winnerInsights.weeks.map((w) => w.weekNumber),
  ])].sort((a, b) => a - b);

  return weekNumbers.map((weekNumber) => {
    const favWeek = favoriteInsights.weeks.find((w) => w.weekNumber === weekNumber);
    const winWeek = winnerInsights.weeks.find((w) => w.weekNumber === weekNumber);
    const favEntry = favWeek?.contestantAverages.find((c) => c.contestantId === contestantId);
    const winEntry = winWeek?.contestantAverages.find((c) => c.contestantId === contestantId);
    return {
      weekNumber,
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
      <LineChart data={chartData} margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="weekNumber" label={{ value: "Week", position: "insideBottom", offset: -5 }} />
        {/* Lower position = better rank, so the axis is reversed to put rank 1 at the top. */}
        <YAxis
          reversed
          allowDecimals
          domain={[1, props.contestantCount]}
          label={{ value: "Avg. Rank", angle: -90, position: "insideLeft" }}
        />
        <Tooltip
          formatter={(value: number, name: string) => [value != null ? value.toFixed(2) : "—", name]}
          labelFormatter={(week) => `Week ${week}`}
        />
        <Legend />
        <Line type="monotone" dataKey="favoriteAvg" name="Favorite" stroke="#e0489f" connectNulls dot />
        <Line type="monotone" dataKey="winnerAvg" name="Winner" stroke="#2b7fb8" connectNulls dot />
        {props.eliminationInfo && (
          <ReferenceLine
            x={props.eliminationInfo.weekNumber}
            stroke="red"
            strokeDasharray="4 4"
            label={{ value: `Eliminated (${props.eliminationInfo.eliminationType})`, position: "top", fill: "red", fontSize: 11 }}
          />
        )}
      </LineChart>
    </ResponsiveContainer>
  );
};

export default ContestantTrendChart;
