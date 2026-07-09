import { type EliminationEntry, type InsightsResponse, type Season, type Show } from "../../utils/Constants";
import ContestantIcon from "../ContestantIcon/ContestantIcon";
import ContestantTrendChart from "./ContestantTrendChart";

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

  if (loadingFlag || !currSeason) {
    return <div className="insights-grid-loading"><div className="loading-circle" /></div>;
  }

  const eliminationByContestant = new Map<string, { episodeNumber: number; eliminationType: string }>();
  props.eliminations.forEach((e: any) => {
    eliminationByContestant.set(e.contestantId, {
      episodeNumber: e.episode?.episodeNumber ?? 0,
      eliminationType: e.eliminationType,
    });
  });

  const sortedContestants = [...currSeason.contestants].sort((a, b) => a.name.localeCompare(b.name));
  const selected = sortedContestants.find((c) => c.id === props.selectedContestantId) ?? null;
  const selectedEliminationInfo = selected ? eliminationByContestant.get(selected.id) ?? null : null;

  return (
    <div className="insights-two-pane">
      <div className="contestant-list">
        {sortedContestants.map((contestant) => (
          <div
            key={contestant.id}
            className={`contestant-list-item${contestant.id === props.selectedContestantId ? ' contestant-list-item-active' : ''}`}
            onClick={() => props.setSelectedContestantId(contestant.id)}
          >
            <div className="insights-contestant-thumb">
              <ContestantIcon
                name={contestant.name}
                id={contestant.id}
                isActive={false}
                isEliminated={eliminationByContestant.has(contestant.id)}
                season={currSeason}
                show={currShow}
              />
            </div>
            <span>{contestant.name}</span>
          </div>
        ))}
      </div>

      <div className="contestant-detail-panel">
        {!selected || !favoriteInsights || !winnerInsights ? (
          <p className="insights-placeholder">Select a contestant to view their insights.</p>
        ) : (
          <>
            <div className="contestant-detail-header">
              <div className="contestant-detail-photo">
                <ContestantIcon
                  name={selected.name}
                  id={selected.id}
                  isActive={false}
                  isEliminated={!!selectedEliminationInfo}
                  season={currSeason}
                  show={currShow}
                />
              </div>
              <div>
                <div className="contestant-detail-name">{selected.name}</div>
                {selectedEliminationInfo && (
                  <div className="elimination-badge">
                    Eliminated Episode {selectedEliminationInfo.episodeNumber}
                  </div>
                )}
              </div>
            </div>
            <ContestantTrendChart
              contestantId={selected.id}
              favoriteInsights={favoriteInsights}
              winnerInsights={winnerInsights}
              contestantCount={currSeason.contestants.length}
              eliminationInfo={selectedEliminationInfo}
            />
          </>
        )}
      </div>
    </div>
  );
};

export default ContestantDetailPanel;
