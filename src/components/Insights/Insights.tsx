import { useEffect, useState } from "react";
import { type InsightsResponse, type RankType } from "../../utils/Constants";
import { getEliminationsBySeason, getRankingsInsights } from "../../utils/util";
import { useAppSelector } from "../../redux/hooks";
import { selectCurrShow, selectShowWithSeasonsAndEpisodes } from "../../redux/selectors";
import ShowSelect from "../ShowSelect/ShowSelect";
import SeasonSelect from "./SeasonSelect";
import InsightsRankingTable from "./InsightsRankingTable";
import ContestantDetailPanel from "./ContestantDetailPanel";
import "./Insights.css";

type PageMode = "table" | "contestant";

const Insights = () => {
  const [pageMode, setPageMode] = useState<PageMode>("table");
  const [rankingType, setRankingType] = useState<RankType>("FAVORITE");
  const [selectedSeasonId, setSelectedSeasonId] = useState<string | null>(null);
  const [selectedContestantId, setSelectedContestantId] = useState<string | null>(null);
  const [favoriteInsights, setFavoriteInsights] = useState<InsightsResponse | null>(null);
  const [winnerInsights, setWinnerInsights] = useState<InsightsResponse | null>(null);
  const [eliminations, setEliminations] = useState<any[]>([]);
  const [loadingFlag, setLoadingFlag] = useState(true);

  const currShow = useAppSelector(selectCurrShow);
  const currShowTree = useAppSelector((state) =>
    selectShowWithSeasonsAndEpisodes(state, currShow?.id || "")
  );

  const seasons = currShowTree?.seasons ?? [];
  const currSeason = seasons.find((s) => s.id === selectedSeasonId) ?? null;

  // Default the season picker to the show's current season whenever the
  // show changes (not on every currShowTree recompute), so a user's manual
  // season choice persists until they switch shows again.
  useEffect(() => {
    if (seasons.length === 0) { setSelectedSeasonId(null); return; }
    const defaultSeason = seasons.find((s) => s.seasonNumber === currShow?.currSeason) ?? seasons[seasons.length - 1];
    setSelectedSeasonId(defaultSeason?.id ?? null);
  }, [currShow?.id]);

  useEffect(() => {
    setSelectedContestantId(null);
    if (!currSeason?.id) {
      setFavoriteInsights(null);
      setWinnerInsights(null);
      setEliminations([]);
      return;
    }
    setLoadingFlag(true);
    Promise.all([
      getRankingsInsights(currSeason.id, "FAVORITE"),
      getRankingsInsights(currSeason.id, "WINNER"),
      getEliminationsBySeason(currSeason.id),
    ])
      .then(([fav, win, elims]) => {
        setFavoriteInsights(fav);
        setWinnerInsights(win);
        setEliminations(elims);
      })
      .catch((error) => console.error("Error fetching insights:", error))
      .finally(() => setLoadingFlag(false));
  }, [currSeason?.id]);

  const topBar = (
    <div className="insights-top-bar">
      <div className="insights-top-bar-left">
        <ShowSelect currShow={currShow} currSeason={currSeason} />
        <SeasonSelect seasons={seasons} selectedSeasonId={selectedSeasonId} onChange={setSelectedSeasonId} />
      </div>
    </div>
  );

  const pageModeTabs = (
    <div className="insights-mode-tabs">
      <div
        className={`insights-mode-tab${pageMode === "table" ? " insights-mode-tab-active" : ""}`}
        onClick={() => setPageMode("table")}
      >Rankings Table</div>
      <div
        className={`insights-mode-tab${pageMode === "contestant" ? " insights-mode-tab-active" : ""}`}
        onClick={() => setPageMode("contestant")}
      >By Contestant</div>
    </div>
  );

  return (
    <div className="insights-page">
      <h1 className="font-bold text-gray-800 page-header">Insights</h1>
      <div className="insights-content">
        {topBar}
        <main className="insights-main">
          {pageModeTabs}
          {pageMode === "table" ? (
            <InsightsRankingTable
              currSeason={currSeason}
              currShow={currShow}
              favoriteInsights={favoriteInsights}
              winnerInsights={winnerInsights}
              eliminations={eliminations}
              rankingType={rankingType}
              setRankingType={setRankingType}
              loadingFlag={loadingFlag}
            />
          ) : (
            <ContestantDetailPanel
              currSeason={currSeason}
              currShow={currShow}
              favoriteInsights={favoriteInsights}
              winnerInsights={winnerInsights}
              eliminations={eliminations}
              selectedContestantId={selectedContestantId}
              setSelectedContestantId={setSelectedContestantId}
              loadingFlag={loadingFlag}
            />
          )}
        </main>
      </div>
    </div>
  );
};

export default Insights;
