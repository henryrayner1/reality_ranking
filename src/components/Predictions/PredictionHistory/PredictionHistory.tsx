import ContestantChip from "../ContestantChip/ContestantChip";
import type { Contestant, Episode, Prediction, Season, Show } from "../../../utils/Constants";
import { getEpisodeEliminations } from "../../../utils/predictions";
import { getPredictionName } from "../../../utils/util";

interface PredictionHistoryProps {
  // Aired episodes, newest first.
  episodes: Episode[];
  predictionsByEpisode: Map<string, Prediction>;
  season: Season;
  show?: Show;
  loggedIn: boolean;
}

const Person = ({ contestant, season, show, mark, placement }: {
  contestant: Contestant;
  season: Season;
  show?: Show;
  mark?: "correct" | "wrong";
  placement?: number | null;
}) => (
  <div className={`prediction-chip history-person${mark ? ` history-person-${mark}` : ""}`}>
    <ContestantChip contestant={contestant} season={season} show={show} placement={placement} />
    {mark && <span className="history-mark" aria-label={mark === "correct" ? "Correct" : "Wrong"}>{mark === "correct" ? "✓" : "✗"}</span>}
  </div>
);

// Past episodes: what the user predicted next to what actually happened.
const PredictionHistory = ({ episodes, predictionsByEpisode, season, show, loggedIn }: PredictionHistoryProps) => {
  const byId = new Map(season.contestants.map((c) => [c.id, c]));

  if (episodes.length === 0) {
    return <p className="prediction-placeholder">No episodes have aired yet.</p>;
  }

  return (
    <ul className="prediction-history">
      {episodes.map((ep) => {
        const actual = getEpisodeEliminations(ep);
        const actualIds = new Set(actual.map((a) => a.contestantId));
        const placementOf = new Map(actual.filter((a) => a.placement).map((a) => [a.contestantId, a.placement as number]));
        const prediction = predictionsByEpisode.get(ep.id);
        const resolved = actual.length > 0;
        const noElimination = !resolved && ep.eliminationCount === 0 && !ep.isFinale;

        const markFor = (id: string, predictedPlace: number) => {
          if (!resolved) return undefined;
          if (ep.isFinale && placementOf.size > 0) return placementOf.get(id) === predictedPlace ? "correct" : "wrong";
          return actualIds.has(id) ? "correct" : "wrong";
        };

        const actualSorted = [...actual].sort((a, b) => (a.placement ?? Infinity) - (b.placement ?? Infinity));

        return (
          <li key={ep.id} className="history-row">
            <div className="history-heading">
              Episode {ep.episodeNumber}
              {ep.isFinale && <span className="history-finale-badge">Finale</span>}
            </div>
            {loggedIn && (
              <div className="history-section">
                <span className="history-label">{ep.isFinale ? "Your predicted order" : "Your pick"}</span>
                <div className="history-people">
                  {prediction
                    ? prediction.contestantIds.map((id, i) => {
                        const c = byId.get(id);
                        return c ? <Person key={id} contestant={c} season={season} show={show} mark={markFor(id, i + 1)} placement={ep.isFinale ? i + 1 : undefined} /> : null;
                      })
                    : <span className="history-empty">No prediction</span>}
                </div>
              </div>
            )}
            <div className="history-section">
              <span className="history-label">{ep.isFinale ? "Final results" : "Eliminated"}</span>
              <div className="history-people">
                {resolved
                  ? actualSorted.map((a) => {
                      const c = byId.get(a.contestantId);
                      return c ? <Person key={a.contestantId} contestant={c} season={season} show={show} placement={a.placement} /> : null;
                    })
                  : <span className="history-empty">{noElimination ? "No elimination" : "Results pending"}</span>}
              </div>
              {ep.isFinale && resolved && placementOf.size > 0 && (
                <span className="history-winner">Winner: {(() => {
                  const w = byId.get([...placementOf].find(([, p]) => p === 1)?.[0] ?? "");
                  return w ? getPredictionName(w, show) : "—";
                })()}</span>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
};

export default PredictionHistory;
