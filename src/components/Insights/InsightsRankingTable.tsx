import { Fragment } from "react";
import { Tooltip } from "react-tooltip";
import "react-tooltip/dist/react-tooltip.css";
import { type Contestant, type EliminationEntry, type InsightsResponse, type RankType, type Season, type Show } from "../../utils/Constants";
import ContestantIcon from "../ContestantIcon/ContestantIcon";

interface InsightsRankingTableProps {
  currSeason: Season | null;
  currShow: Show | null;
  favoriteInsights: InsightsResponse | null;
  winnerInsights: InsightsResponse | null;
  eliminations: EliminationEntry[];
  rankingType: RankType;
  setRankingType: (type: RankType) => void;
  loadingFlag: boolean;
}

// Sorts contestants by their averaged position (ascending — lower is better)
// into rank-ordered rows, tie-breaking by name for a deterministic order.
// Contestants with no data (no submissions that episode / ever) sort to the
// bottom and render as blank cells rather than being force-placed.
const buildRankColumn = (
  items: { contestantId: string; value: number | null }[],
  contestantsById: Record<string, Contestant>,
  rowCount: number
): (string | null)[] => {
  const withData = items
    .filter((i) => i.value !== null)
    .sort((a, b) => {
      if (a.value !== b.value) return (a.value as number) - (b.value as number);
      const nameA = contestantsById[a.contestantId]?.name ?? "";
      const nameB = contestantsById[b.contestantId]?.name ?? "";
      return nameA.localeCompare(nameB);
    })
    .map((i) => i.contestantId);

  const column: (string | null)[] = [...withData];
  while (column.length < rowCount) column.push(null);
  return column.slice(0, rowCount);
};

const InsightsRankingTable = (props: InsightsRankingTableProps) => {
  const { currSeason, currShow, rankingType, setRankingType, loadingFlag } = props;
  const insights = rankingType === "FAVORITE" ? props.favoriteInsights : props.winnerInsights;

  const contestantsById: Record<string, Contestant> = {};
  (currSeason?.contestants ?? []).forEach((c) => { contestantsById[c.id] = c; });

  const eliminationByContestant = new Map<string, { episodeNumber: number; eliminationType: string }>();
  props.eliminations.forEach((e: any) => {
    eliminationByContestant.set(e.contestantId, {
      episodeNumber: e.episode?.episodeNumber ?? 0,
      eliminationType: e.eliminationType,
    });
  });

  const isEliminatedByEpisode = (contestantId: string, episodeNumber: number) => {
    const elim = eliminationByContestant.get(contestantId);
    return !!elim && episodeNumber > elim.episodeNumber;
  };

  const rankTypeTabs = (
    <div className="insights-tabs">
      <div
        className={`insights-tab${rankingType === "FAVORITE" ? " insights-tab-active" : ""}`}
        onClick={() => setRankingType("FAVORITE")}
        data-tooltip-id="insights-rank-type-tooltip"
        data-tooltip-content="Average of everyone's favorite-to-least-favorite rankings"
      >Favorite</div>
      <div
        className={`insights-tab${rankingType === "WINNER" ? " insights-tab-active" : ""}`}
        onClick={() => setRankingType("WINNER")}
        data-tooltip-id="insights-rank-type-tooltip"
        data-tooltip-content="Average of everyone's predicted-winner rankings"
      >Winner</div>
      <Tooltip id="insights-rank-type-tooltip" positionStrategy="fixed" style={{ maxWidth: "14rem" }} />
    </div>
  );

  if (loadingFlag || !currSeason || !insights) {
    return (
      <div className="insights-panel">
        {rankTypeTabs}
        <div className="insights-grid-loading"><div className="loading-circle" /></div>
      </div>
    );
  }

  const rowCount = currSeason.contestants.length;

  if (rowCount === 0) {
    return (
      <div className="insights-panel">
        {rankTypeTabs}
        <p className="insights-placeholder">No contestants have been added to this season yet.</p>
      </div>
    );
  }

  const sortedEpisodes = [...insights.episodes].sort((a, b) => a.episodeNumber - b.episodeNumber);

  if (sortedEpisodes.length === 0) {
    return (
      <div className="insights-panel">
        {rankTypeTabs}
        <p className="insights-placeholder">No rankings have been submitted for this season yet.</p>
      </div>
    );
  }

  const episodeColumns = sortedEpisodes.map((episode) => ({
    episodeNumber: episode.episodeNumber,
    contestantIds: buildRankColumn(
      episode.contestantAverages.map((ca) => ({ contestantId: ca.contestantId, value: ca.averagePosition })),
      contestantsById,
      rowCount
    ),
  }));

  const overallColumn = buildRankColumn(
    insights.overall.map((o) => ({ contestantId: o.contestantId, value: o.overallAveragePosition })),
    contestantsById,
    rowCount
  );

  return (
    <div className="insights-panel">
      {rankTypeTabs}
      <div
        className="insights-grid"
        style={{
          // An extra fixed-width spacer column sits between the episode
          // columns and AVG. With few episodes, the "Episode"/"Day" title
          // (spanning only the episode columns) has barely 2.5rem to work
          // with and crowds right up against AVG — the title spans into this
          // spacer too, so it always has room to breathe regardless of
          // episode count.
          gridTemplateColumns: `repeat(${sortedEpisodes.length + 1}, 2.5rem) 1.5rem 2.5rem 1fr`,
          gridTemplateRows: `1fr 1.25rem repeat(${rowCount}, 1fr)`,
        }}
      >
        <div className="insights-grid-heading">Rank</div>
        <div className="insights-episode-heading"></div>
        {Array.from({ length: rowCount }, (_, index) => (
          <div key={`rank-${index}`} className="insights-grid-item">{index + 1}</div>
        ))}

        {sortedEpisodes.length > 0 && (
          <div className="insights-grid-heading" style={{ gridColumn: `span ${sortedEpisodes.length + 1}`, justifyContent: "center" }}>{currShow?.rankingMode === "DAILY" ? "Day" : "Episode"}</div>
        )}
        {episodeColumns.map((episode) => (
          <Fragment key={`episode-${episode.episodeNumber}`}>
            <div className="insights-episode-heading">{episode.episodeNumber}</div>
            {episode.contestantIds.map((contestantId, rowIndex) => (
              <div key={`episode-${episode.episodeNumber}-cell-${rowIndex}`} className="insights-cell">
                {contestantId && (
                  <ContestantIcon
                    name={contestantsById[contestantId]?.name ?? ""}
                    photoUrl={contestantsById[contestantId]?.photoUrl}
                    id={contestantId}
                    isActive={false}
                    isEliminated={isEliminatedByEpisode(contestantId, episode.episodeNumber)}
                    season={currSeason}
                    show={currShow}
                  />
                )}
              </div>
            ))}
          </Fragment>
        ))}

        {/* Explicitly claims the spacer column's remaining rows so
            auto-placement can't slot the AVG heading or overall column into
            them instead — same deterministic-count approach as every other
            column here. */}
        <div className="insights-episode-heading"></div>
        {Array.from({ length: rowCount }, (_, index) => (
          <div key={`spacer-cell-${index}`} className="insights-cell" />
        ))}

        <div className="insights-grid-heading insights-overall-heading" style={{ gridColumn: "span 1", justifyContent: "center" }}>AVG</div>
        <div className="insights-episode-heading insights-episode-heading" style={{ gridColumn: "span 2", justifyContent: "center" }}></div>
        {overallColumn.map((contestantId, rowIndex) => (
          <div key={`overall-cell-${rowIndex}`} className="insights-cell insights-overall-cell">
            {contestantId && (
              <ContestantIcon
                name={contestantsById[contestantId]?.name ?? ""}
                photoUrl={contestantsById[contestantId]?.photoUrl}
                id={contestantId}
                isActive={false}
                isEliminated={eliminationByContestant.has(contestantId)}
                season={currSeason}
                show={currShow}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default InsightsRankingTable;
