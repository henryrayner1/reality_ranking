import { Dropdown } from "react-bootstrap";
import { type EliminationEntry, type InsightsResponse, type Season, type Show } from "../../../utils/Constants";
import { formatPlacement } from "../../../utils/util";
import ContestantPhoto from "../../ContestantPhoto/ContestantPhoto";
import PageLoading from "../../PageLoading/PageLoading";
import ContestantTrendChart from "../ContestantTrendChart/ContestantTrendChart";

interface ContestantDetailPanelProps {
  currSeason: Season | null;
  currShow: Show | null;
  favoriteInsights: InsightsResponse | null;
  winnerInsights: InsightsResponse | null;
  eliminations: EliminationEntry[];
  selectedContestantId: string | null;
  setSelectedContestantId: (id: string) => void;
  loadingFlag: boolean;
}

const ContestantDetailPanel = (props: ContestantDetailPanelProps) => {
  const { currSeason, currShow, favoriteInsights, winnerInsights, loadingFlag } = props;

  if (loadingFlag) {
    return <PageLoading />;
  }

  // A show with no seasons (or a season with no contestants) has nothing to
  // list — not "still loading", see InsightsRankingTable's matching check.
  if (!currSeason || currSeason.contestants.length === 0) {
    return <p className="insights-placeholder">No contestants have been added to this season yet.</p>;
  }

  const eliminationByContestant = new Map<string, { episodeNumber: number; eliminationType: string; placement?: number | null }>();
  props.eliminations.forEach((e: any) => {
    eliminationByContestant.set(e.contestantId, {
      episodeNumber: e.episode?.episodeNumber ?? 0,
      eliminationType: e.eliminationType,
      placement: e.placement,
    });
  });
  // A finalist with a final placement wasn't eliminated, so isn't greyed out.
  const isEliminated = (contestantId: string) =>
    eliminationByContestant.has(contestantId) && eliminationByContestant.get(contestantId)?.placement == null;

  const sortedContestants = [...currSeason.contestants].sort((a, b) => a.name.localeCompare(b.name));
  const selected = sortedContestants.find((c) => c.id === props.selectedContestantId) ?? null;
  const selectedEliminationInfo = selected ? eliminationByContestant.get(selected.id) ?? null : null;

  const thumb = (contestant: (typeof sortedContestants)[number]) => (
    <ContestantPhoto
      name={contestant.name}
      photoUrl={contestant.photoUrl}
      isEliminated={isEliminated(contestant.id)}
      placement={eliminationByContestant.get(contestant.id)?.placement}
      season={currSeason}
      show={currShow}
      className="insights-contestant-thumb"
    />
  );

  return (
    <div className="insights-two-pane">
      <div className="contestant-list">
        {sortedContestants.map((contestant) => (
          <div
            key={contestant.id}
            className={`contestant-list-item${contestant.id === props.selectedContestantId ? ' contestant-list-item-active' : ''}`}
            onClick={() => props.setSelectedContestantId(contestant.id)}
          >
            {thumb(contestant)}
            <span>{contestant.name}</span>
          </div>
        ))}
      </div>

      <div className="contestant-detail-panel">
        {/* Mobile only (Insights.css): replaces the contestant list above,
            which takes too much vertical space when stacked. */}
        <Dropdown className="contestant-dropdown">
          <Dropdown.Toggle variant="" id="contestant-detail-dropdown" className="custom-button contestant-dropdown-toggle">
            {selected && thumb(selected)}
            <span className="truncate min-w-0 flex-1 text-left">{selected?.name ?? "Select a contestant"}</span>
          </Dropdown.Toggle>
          <Dropdown.Menu className="contestant-dropdown-menu">
            {sortedContestants.map((contestant) => (
              <Dropdown.Item
                key={contestant.id}
                active={contestant.id === props.selectedContestantId}
                onClick={() => props.setSelectedContestantId(contestant.id)}
                className="contestant-dropdown-item"
              >
                {thumb(contestant)}
                <span>{contestant.name}</span>
              </Dropdown.Item>
            ))}
          </Dropdown.Menu>
        </Dropdown>
        {!selected || !favoriteInsights || !winnerInsights ? (
          <p className="insights-placeholder">Select a contestant to view their insights.</p>
        ) : (
          <>
            <div className="contestant-detail-header">
              <ContestantPhoto
                name={selected.name}
                photoUrl={selected.photoUrl}
                isEliminated={isEliminated(selected.id)}
                placement={selectedEliminationInfo?.placement}
                season={currSeason}
                show={currShow}
                className="contestant-detail-photo"
              />
              <div>
                <div className="contestant-detail-name">{selected.name}</div>
                {selectedEliminationInfo && (
                  <div className="elimination-badge">
                    {selectedEliminationInfo.placement != null
                      ? `${selectedEliminationInfo.placement === 1 ? "Winner" : `${formatPlacement(selectedEliminationInfo.placement)} place`} · Episode ${selectedEliminationInfo.episodeNumber}`
                      : `Eliminated Episode ${selectedEliminationInfo.episodeNumber}`}
                  </div>
                )}
              </div>
            </div>
            <ContestantTrendChart
              contestantId={selected.id}
              favoriteInsights={favoriteInsights}
              winnerInsights={winnerInsights}
              contestantCount={currSeason.contestants.length}
              eliminations={props.eliminations}
              eliminationInfo={selectedEliminationInfo}
            />
          </>
        )}
      </div>
    </div>
  );
};

export default ContestantDetailPanel;
