import { Fragment, useEffect, useRef } from "react";
import { Tooltip } from "react-tooltip";
import "react-tooltip/dist/react-tooltip.css";
import { type Contestant, type EliminationEntry, type InsightsResponse, type RankType, type Season, type Show } from "../../../utils/Constants";
import ContestantIcon from "../../ContestantIcon/ContestantIcon";
import PageLoading from "../../PageLoading/PageLoading";

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
// Contestants with no data for an unrelated reason (no submissions that
// episode / ever) sort to the bottom and render as blank cells rather than
// being force-placed. Contestants missing only because they were eliminated
// before anyone had a chance to rank them (eliminationBackfillIds, already
// ordered most-recently-eliminated first) are appended below that instead of
// vanishing from the table entirely.
const buildRankColumn = (
  items: { contestantId: string; value: number | null }[],
  contestantsById: Record<string, Contestant>,
  rowCount: number,
  eliminationBackfillIds: string[] = []
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

  const column: (string | null)[] = [...withData, ...eliminationBackfillIds];
  while (column.length < rowCount) column.push(null);
  return column.slice(0, rowCount);
};

// Contestants eliminated as of a given episode who don't already have an
// entry in `presentIds` — most-recently-eliminated first, tie-broken by name,
// matching the elimination-bucket ordering convention used elsewhere (e.g.
// buildPastRankingColumn on the Ranking page).
const getEliminationBackfillIds = (
  eliminationByContestant: Map<string, { episodeNumber: number; eliminationType: string }>,
  contestantsById: Record<string, Contestant>,
  presentIds: Set<string>,
  asOfEpisodeNumber: number
): string[] =>
  Array.from(eliminationByContestant.entries())
    .filter(([id, elim]) => elim.episodeNumber <= asOfEpisodeNumber && !presentIds.has(id))
    .sort(([idA, elimA], [idB, elimB]) => {
      if (elimA.episodeNumber !== elimB.episodeNumber) return elimB.episodeNumber - elimA.episodeNumber;
      const nameA = contestantsById[idA]?.name ?? "";
      const nameB = contestantsById[idB]?.name ?? "";
      return nameA.localeCompare(nameB);
    })
    .map(([id]) => id);

const InsightsRankingTable = (props: InsightsRankingTableProps) => {
  const { currSeason, currShow, rankingType, setRankingType, loadingFlag } = props;
  const insights = rankingType === "FAVORITE" ? props.favoriteInsights : props.winnerInsights;

  // Scrolled to the far right on load/whenever the episode columns change,
  // matching RankingComponent2's .ranking-grid behavior — an overflowing
  // grid defaults to showing the most recent episode/day instead of the
  // first. Declared unconditionally (before the loading/placeholder early
  // returns below) since hooks can't be called conditionally; a no-op via
  // the gridRef null-check on renders where the grid itself isn't mounted.
  const gridRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (loadingFlag) return;
    const grid = gridRef.current;
    if (!grid) return;
    grid.scrollLeft = grid.scrollWidth;
  }, [loadingFlag, currSeason?.id, insights?.episodes?.length, currSeason?.contestants?.length]);

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
        <PageLoading />
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

  const episodeColumns = sortedEpisodes.map((episode) => {
    const presentIds = new Set(episode.contestantAverages.map((ca) => ca.contestantId));
    const backfillIds = getEliminationBackfillIds(eliminationByContestant, contestantsById, presentIds, episode.episodeNumber);
    return {
      episodeNumber: episode.episodeNumber,
      // Backfilled entries have no real ranking data for this episode — they're
      // shown only because the contestant was already eliminated by this point —
      // so they should always render grayed, regardless of isEliminatedByEpisode's
      // usual "next episode onward" threshold for contestants with real data.
      backfillIds: new Set(backfillIds),
      contestantIds: buildRankColumn(
        episode.contestantAverages.map((ca) => ({ contestantId: ca.contestantId, value: ca.averagePosition })),
        contestantsById,
        rowCount,
        backfillIds
      ),
    };
  });

  // Unlike per-episode contestantAverages (which omits a contestant entirely
  // if they have no submissions that episode), the backend's overall array
  // has one entry per roster contestant always, with overallAveragePosition
  // left null for anyone with no data at all — so "present" here means having
  // a non-null value, not just an entry.
  const overallPresentIds = new Set(
    insights.overall.filter((o) => o.overallAveragePosition !== null).map((o) => o.contestantId)
  );
  const overallColumn = buildRankColumn(
    insights.overall.map((o) => ({ contestantId: o.contestantId, value: o.overallAveragePosition })),
    contestantsById,
    rowCount,
    getEliminationBackfillIds(eliminationByContestant, contestantsById, overallPresentIds, Infinity)
  );

  return (
    <div className="insights-panel">
      {rankTypeTabs}
      <div className="insights-grid-wrapper">
        {/* Overlaid on top of the scrolling grid (not part of its scroll
            content), so it stays centered within whatever's currently
            visible without tracking scroll position — same trick as
            RankingComponent2's .episode-title-overlay. The in-grid heading
            below is left empty on purpose; this is the only place the
            label's text actually renders. */}
        <div className="insights-episode-title-overlay">{currShow?.rankingMode === "DAILY" ? "Day" : "Episode"}</div>
        <div
          className="insights-grid"
          ref={gridRef}
          style={{
            // An extra spacer column sits between the episode columns and AVG.
            // With few episodes, the "Episode"/"Day" title (spanning only the
            // episode columns) has barely 2.5rem to work with and crowds
            // right up against AVG — the title spans into this spacer too, so
            // it always has room to breathe regardless of episode count. It's
            // a minmax(1.5rem, 1fr) rather than a fixed 1.5rem so it also
            // absorbs whatever width .insights-panel's align-items: stretch
            // forces onto this grid beyond its own natural content width
            // (e.g. from the Favorite/Winner tab row above being wider than a
            // 1-2 episode grid) — without a flexible track to soak that up,
            // it used to render as dead space to the right of AVG instead.
            gridTemplateColumns: `repeat(${sortedEpisodes.length + 1}, 2.5rem) minmax(1.5rem, 1fr) 2.5rem`,
            gridTemplateRows: `1fr 1.25rem repeat(${rowCount}, 1fr)`,
          }}
        >
          <div className="insights-grid-heading rank-column-cell">Rank</div>
          <div className="insights-episode-heading rank-column-cell rank-spacer"></div>
          {Array.from({ length: rowCount }, (_, index) => (
            <div key={`rank-${index}`} className="insights-grid-item rank-column-cell">{index + 1}</div>
          ))}

          {sortedEpisodes.length > 0 && (
            <div className="insights-grid-heading" style={{ gridColumn: `span ${sortedEpisodes.length + 1}` }}></div>
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
                      isEliminated={episode.backfillIds.has(contestantId) || isEliminatedByEpisode(contestantId, episode.episodeNumber)}
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

          <div className="insights-grid-heading insights-overall-heading avg-column-cell" style={{ gridColumn: "span 1", justifyContent: "center" }}>AVG</div>
          <div className="insights-episode-heading avg-column-cell rank-spacer" style={{ justifyContent: "center"}}></div>
          {overallColumn.map((contestantId, rowIndex) => (
            <div key={`overall-cell-${rowIndex}`} className="insights-cell insights-overall-cell avg-column-cell">
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
    </div>
  );
};

export default InsightsRankingTable;
