import { useState } from "react";
import ContestantChip from "../../Predictions/ContestantChip/ContestantChip";
import PredictionVoteBars from "../PredictionVoteBars/PredictionVoteBars";
import FinalePlacementBars from "../FinalePlacementBars/FinalePlacementBars";
import PageLoading from "../../PageLoading/PageLoading";
import * as AdminUI from "../../../utils/AdminComponents";
import type { Contestant, Episode, PredictionInsightsEpisode, Season, Show } from "../../../utils/Constants";
import {
  formatPercent,
  getAiredEpisodes,
  getEpisodeEliminations,
  getFinaleStandings,
  getPredictionStandings,
  getRemainingContestants,
  type FinaleStanding,
  type PredictionStanding,
} from "../../../utils/predictions";
import { getPredictionName } from "../../../utils/util";
import "../../Predictions/PredictionHistory/PredictionHistory.css";
import "./PredictionInsights.css";

interface PredictionInsightsProps {
  currSeason: Season | null;
  currShow: Show | null;
  insights: PredictionInsightsEpisode[];
  loadingFlag: boolean;
}

const TOP_COUNT = 3;

// Insights' Predictions view: the Predictions page's Past episodes layout,
// with everyone's aggregate picks in place of the user's own. Only aired
// episodes have data (the endpoint never returns still-open ones).
const PredictionInsights = ({ currSeason, currShow, insights, loadingFlag }: PredictionInsightsProps) => {
  const [viewAllEpisodeId, setViewAllEpisodeId] = useState<string | null>(null);

  if (loadingFlag) return <PageLoading />;
  if (!currSeason || currSeason.contestants.length === 0) {
    return <p className="insights-placeholder">No contestants have been added to this season yet.</p>;
  }
  if (insights.length === 0) {
    return <p className="insights-placeholder">No predictions yet. Episodes appear here once they air.</p>;
  }

  const show = currShow ?? undefined;
  const byId = new Map(currSeason.contestants.map((c) => [c.id, c]));
  const aggByEpisode = new Map(insights.map((agg) => [agg.episodeId, agg]));
  const nameOf = (id: string) => {
    const c = byId.get(id);
    return c ? getPredictionName(c, show) : "";
  };
  const toBars = (standings: PredictionStanding[]) =>
    standings.map((s) => ({ id: s.contestantId, name: nameOf(s.contestantId), percent: s.percent }));

  const toFinaleBars = (standings: FinaleStanding[]) =>
    standings.map((s, i) => ({
      id: s.contestantId,
      name: nameOf(s.contestantId),
      position: i + 1,
      averagePlacement: s.averagePlacement,
      shares: s.shares,
    }));

  const standingsFor = (ep: Episode, agg: PredictionInsightsEpisode) =>
    getPredictionStandings(agg, getRemainingContestants(currSeason, ep.episodeNumber));
  const finaleStandingsFor = (ep: Episode, agg: PredictionInsightsEpisode) =>
    getFinaleStandings(agg, getRemainingContestants(currSeason, ep.episodeNumber));

  // The finale's last column is the consensus predicted order (from every
  // placement in each prediction), not just winner picks.
  const renderBars = (ep: Episode, agg: PredictionInsightsEpisode, limit?: number) =>
    ep.isFinale ? (
      <FinalePlacementBars bars={toFinaleBars(finaleStandingsFor(ep, agg).slice(0, limit))} />
    ) : (
      <PredictionVoteBars bars={toBars(standingsFor(ep, agg).slice(0, limit))} />
    );

  const viewAllEpisode = viewAllEpisodeId ? (currSeason.episodes ?? []).find((e) => e.id === viewAllEpisodeId) : null;
  const viewAllAgg = viewAllEpisode ? aggByEpisode.get(viewAllEpisode.id) : undefined;

  return (
    <section className="insights-predictions-card prediction-history-card">
      <ul className="prediction-history">
        {getAiredEpisodes(currSeason).map((ep) => {
          const agg = aggByEpisode.get(ep.id);
          const standings = agg ? standingsFor(ep, agg) : [];
          const top = standings.filter((s) => s.rank === 1 && s.votes > 0);
          const actual = getEpisodeEliminations(ep);
          const actualSorted = [...actual].sort((a, b) => (a.placement ?? Infinity) - (b.placement ?? Infinity));
          const noElimination = actual.length === 0 && ep.eliminationCount === 0 && !ep.isFinale;
          const verb = ep.isFinale ? "win" : "go home";

          return (
            <li key={ep.id} className="history-row insights-prediction-row">
              <div className="history-heading">
                Episode {ep.episodeNumber}
                {ep.isFinale && <span className="history-finale-badge">Finale</span>}
                {agg && <span className="insights-prediction-count">{agg.predictorCount} {agg.predictorCount === 1 ? "prediction" : "predictions"}</span>}
              </div>
              <div className="history-section">
                <span className="history-label">Most predicted to {verb}</span>
                <div className="history-people">
                  {top.length > 0
                    ? top.map((s) => {
                        const c = byId.get(s.contestantId) as Contestant;
                        return (
                          <div key={s.contestantId} className="prediction-chip history-person">
                            <ContestantChip contestant={c} season={currSeason} show={show} note={formatPercent(s.percent)} />
                          </div>
                        );
                      })
                    : <span className="history-empty">No predictions</span>}
                </div>
              </div>
              <div className="history-section">
                <span className="history-label">{ep.isFinale ? "Final results" : "Eliminated"}</span>
                <div className="history-people">
                  {actual.length > 0
                    ? actualSorted.map((a) => {
                        const c = byId.get(a.contestantId);
                        return c ? (
                          <div key={a.contestantId} className="prediction-chip history-person">
                            <ContestantChip contestant={c} season={currSeason} show={show} placement={a.placement} />
                          </div>
                        ) : null;
                      })
                    : <span className="history-empty">{noElimination ? "No elimination" : "Results pending"}</span>}
                </div>
              </div>
              <div className="history-section">
                <span className="history-label">{ep.isFinale ? "Predicted final order" : "Top predicted"}</span>
                {agg ? (
                  <>
                    {renderBars(ep, agg, TOP_COUNT)}
                    {standings.length > TOP_COUNT && (
                      <button type="button" className="insights-view-all" onClick={() => setViewAllEpisodeId(ep.id)}>
                        View all
                      </button>
                    )}
                  </>
                ) : (
                  <span className="history-empty">No predictions</span>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      {viewAllEpisode && viewAllAgg && (
        <AdminUI.Modal
          title={`Episode ${viewAllEpisode.episodeNumber}: ${viewAllEpisode.isFinale ? "predicted final order" : "predicted to go home"}`}
          onClose={() => setViewAllEpisodeId(null)}
          size="lg"
        >
          <div className="insights-view-all-body">
            {renderBars(viewAllEpisode, viewAllAgg)}
          </div>
        </AdminUI.Modal>
      )}
    </section>
  );
};

export default PredictionInsights;
