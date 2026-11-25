import { useId, useState } from "react";
import { Area, CartesianGrid, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { type EliminationEntry, type InsightsResponse } from "../../../utils/Constants";
import { PRE_SEASON_EPISODE_NUMBER, formatEpisodeHeading } from "../../../utils/episodeRankability";
import { formatPlacement } from "../../../utils/util";
import "./ContestantTrendChart.css";

interface ChartPoint {
  episodeNumber: number;
  favoriteAvg: number | null;
  winnerAvg: number | null;
  // Prediction rank (1 = most predicted to go home; finale: to win).
  predictionRank: number | null;
  fieldSize: number;
}

interface ContestantTrendChartProps {
  contestantId: string;
  favoriteInsights: InsightsResponse;
  winnerInsights: InsightsResponse;
  contestantCount: number;
  eliminations: EliminationEntry[];
  eliminationInfo?: { episodeNumber: number; eliminationType: string; placement?: number | null } | null;
  // episodeNumber -> prediction rank (see getPredictionStandings). Omitted or
  // empty hides the predictions line.
  predictionRanks?: Map<number, number>;
  // The finale's point means "predicted to win", so its tooltip says so.
  finaleEpisodeNumber?: number;
}

// Rankings only contain contestants still in, so the worst possible rank
// shrinks with every elimination — a contestant ranked last every episode
// would otherwise look like they're climbing. Field size at episode N is
// everyone still in going into it, including whoever goes home in it: they're
// still ranked in that episode's Favorite ranking, ranked last in Winner
// (normalizeRankedIds), and in the field the predictions were made against.
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
      rosterSize - eliminationEpisodes.filter((n) => n < episodeNumber).length,
    ])
  );
};

const FIELD_SIZE_SERIES_NAME = "Number of Contestants";
const PREDICTION_SERIES_NAME = "Predicted to go home";

// Recharts sorts tooltip rows by name by default; keep that for
// Favorite/Winner but always list the contestant count last.
const fieldSizeLastSortKey = (name: unknown) => `${name === FIELD_SIZE_SERIES_NAME ? 1 : 0}${name}`;

// Plot height; the toggle row below takes the rest of the 300px.
const CHART_HEIGHT = 270;

type SeriesKey = "favoriteAvg" | "winnerAvg" | "predictionRank" | "fieldSize";

// The chart's legend, as toggle buttons. Every line shows by default; a
// click hides it (and shows it again). The field-size toggle also hides
// the shaded "no longer exists" area.
const SERIES: { key: SeriesKey; name: string; color: string }[] = [
  { key: "favoriteAvg", name: "Favorite", color: "#e0489f" },
  { key: "winnerAvg", name: "Winner", color: "#2b7fb8" },
  { key: "predictionRank", name: PREDICTION_SERIES_NAME, color: "#e8833a" },
  { key: "fieldSize", name: FIELD_SIZE_SERIES_NAME, color: "#9ca3af" },
];

const buildChartData = (
  contestantId: string,
  favoriteInsights: InsightsResponse,
  winnerInsights: InsightsResponse,
  contestantCount: number,
  eliminations: EliminationEntry[],
  predictionRanks: Map<number, number> = new Map()
): ChartPoint[] => {
  const episodeNumbers = [...new Set([
    ...favoriteInsights.episodes.map((w) => w.episodeNumber),
    ...winnerInsights.episodes.map((w) => w.episodeNumber),
    ...predictionRanks.keys(),
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
      predictionRank: predictionRanks.get(episodeNumber) ?? null,
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
    props.eliminations,
    props.predictionRanks
  );
  const hasPredictions = !!props.predictionRanks && props.predictionRanks.size > 0;
  // Kept across contestant switches, so a user comparing one line across
  // contestants doesn't have to re-hide the others each time.
  const legendLabelId = useId();
  const [hidden, setHidden] = useState<Set<SeriesKey>>(() => new Set());
  const isHidden = (key: SeriesKey) => hidden.has(key);
  const toggle = (key: SeriesKey) =>
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  const visibleSeries = SERIES.filter((s) => s.key !== "predictionRank" || hasPredictions);

  if (chartData.length === 0) {
    return <p className="insights-placeholder">No ranking submissions yet for this contestant.</p>;
  }

  return (
    <div className="trend-chart">
      {/* 300px in all, as before the toggle row existed: recharts' own legend
          used to sit inside these 300px, so the plot keeps its size and the
          detail panel its height. */}
      <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
        <ComposedChart data={chartData} margin={{ top: 25, right: 30, bottom: 10, left: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="episodeNumber" tickFormatter={(n: number) => formatEpisodeHeading(n)} label={{ value: "Episode", position: "insideBottom", offset: -5 }} />
          {/* Lower position = better rank, so the axis is reversed to put rank 1 at the top. */}
          <YAxis
            reversed
            allowDecimals
            domain={[1, props.contestantCount]}
            label={{ value: hasPredictions ? "Rank" : "Avg. Rank", angle: -90, position: "insideLeft" }}
          />
          <Tooltip
            formatter={(value: number, name: string, item: { payload?: ChartPoint }) => {
              if (name === FIELD_SIZE_SERIES_NAME) return [value, name];
              if (name === PREDICTION_SERIES_NAME) {
                const isFinale = item?.payload?.episodeNumber === props.finaleEpisodeNumber;
                return [value != null ? `#${value}` : "—", isFinale ? "Predicted to win" : name];
              }
              return [value != null ? value.toFixed(2) : "—", name];
            }}
            labelFormatter={(episode) => episode === PRE_SEASON_EPISODE_NUMBER ? "Pre-season" : `Episode ${episode}`}
            itemSorter={(item) => fieldSizeLastSortKey(item.name)}
          />
          {/* Shades rank positions that no longer exist once contestants are eliminated. */}
          <Area
            dataKey={(d: ChartPoint) => [d.fieldSize, props.contestantCount]}
            type="linear"
            fill="#9ca3af"
            fillOpacity={0.15}
            stroke="none"
            legendType="none"
            tooltipType="none"
            // A range area's hover dot would land on its lower edge (the x-axis);
            // the dashed field-size Line below already marks the top.
            activeDot={false}
            isAnimationActive={false}
            hide={isHidden("fieldSize")}
          />
          <Line
            type="linear"
            dataKey="fieldSize"
            name={FIELD_SIZE_SERIES_NAME}
            stroke="#9ca3af"
            strokeDasharray="5 3"
            dot={false}
            isAnimationActive={false}
            hide={isHidden("fieldSize")}
          />
          {/* Straight segments, like the contestant-count line and shaded area:
              a curved (monotone) line overshoots between points, so a contestant
              ranked last every episode appeared to dip past the field-size line. */}
          <Line type="linear" dataKey="favoriteAvg" name="Favorite" stroke="#e0489f" connectNulls dot hide={isHidden("favoriteAvg")} />
          <Line type="linear" dataKey="winnerAvg" name="Winner" stroke="#2b7fb8" connectNulls dot hide={isHidden("winnerAvg")} />
          {hasPredictions && (
            <Line type="linear" dataKey="predictionRank" name={PREDICTION_SERIES_NAME} stroke="#e8833a" strokeWidth={2} connectNulls dot hide={isHidden("predictionRank")} />
          )}
          {props.eliminationInfo && (
            <ReferenceLine
              x={props.eliminationInfo.episodeNumber}
              stroke={props.eliminationInfo.placement != null ? "#7F77DD" : "red"}
              strokeDasharray="4 4"
              label={{
                value: props.eliminationInfo.placement != null ? formatPlacement(props.eliminationInfo.placement) : "Eliminated",
                position: "top",
                fill: props.eliminationInfo.placement != null ? "#7F77DD" : "red",
                fontSize: 11,
              }}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
      <div className="trend-chart-legend" role="group" aria-labelledby={legendLabelId}>
        <span className="trend-chart-legend-label" id={legendLabelId}>Show:</span>
        {visibleSeries.map((series) => {
          const on = !isHidden(series.key);
          return (
            <button
              key={series.key}
              type="button"
              className={`trend-chart-toggle${on ? "" : " trend-chart-toggle-off"}`}
              style={{ "--series-color": series.color } as React.CSSProperties}
              aria-pressed={on}
              title={on ? `Hide ${series.name}` : `Show ${series.name}`}
              onClick={() => toggle(series.key)}
            >
              {/* Checkbox in the line's colour (doubles as the legend key):
                  ticked = shown. */}
              <span className="trend-chart-check" aria-hidden="true">
                <svg viewBox="0 0 12 12">
                  <path d="M2.5 6.2 5 8.6 9.5 3.6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              {series.name}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default ContestantTrendChart;
