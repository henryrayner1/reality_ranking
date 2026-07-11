import { useEffect, useState } from "react";
import { type RankType } from "../../utils/Constants";
import { useNavigate, useParams } from "react-router-dom";
import { useEliminationsBySeason, useRankingsInsights, useShowTree, useShows } from "../../hooks/queries";
import { slugifyShowName } from "../../utils/slug";
import ShowSelect from "../ShowSelect/ShowSelect";
import SeasonSelect from "./SeasonSelect";
import InsightsRankingTable from "./InsightsRankingTable";
import ContestantDetailPanel from "./ContestantDetailPanel";
import PageLoading from "../PageLoading";
import "./Insights.css";

type PageMode = "table" | "contestant";

const Insights = () => {
  const [pageMode, setPageMode] = useState<PageMode>("table");
  const [rankingType, setRankingType] = useState<RankType>("FAVORITE");
  const [selectedSeasonId, setSelectedSeasonId] = useState<string | null>(null);
  const [selectedContestantId, setSelectedContestantId] = useState<string | null>(null);

  const { showSlug } = useParams<{ showSlug: string }>();
  const navigate = useNavigate();

  const { data: shows = [] } = useShows();
  const showId = shows.find(s => slugifyShowName(s.name) === showSlug)?.id;
  const currShowTree = useShowTree(showId);
  const currShow = currShowTree.data;

  const seasons = currShow?.seasons ?? [];
  const currSeason = seasons.find((s) => s.id === selectedSeasonId) ?? null;

  const favoriteInsightsQuery = useRankingsInsights(currSeason?.id, "FAVORITE");
  const winnerInsightsQuery = useRankingsInsights(currSeason?.id, "WINNER");
  const eliminationsQuery = useEliminationsBySeason(currSeason?.id);
  const favoriteInsights = favoriteInsightsQuery.data ?? null;
  const winnerInsights = winnerInsightsQuery.data ?? null;
  const eliminations = eliminationsQuery.data ?? [];
  const loadingFlag = currShowTree.isLoading || (!!currSeason?.id &&
    (favoriteInsightsQuery.isLoading || winnerInsightsQuery.isLoading || eliminationsQuery.isLoading));

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
  }, [currSeason?.id]);

  if (loadingFlag) {
    return (
      <div className="insights-page">
        <h1 className="font-bold text-gray-800 page-header">Insights</h1>
        <PageLoading />
      </div>
    );
  }

  const topBar = (
    <div className="insights-top-bar">
      <div className="insights-top-bar-left">
        <ShowSelect
          shows={shows}
          currShowId={showId}
          onSelectShow={(id) => {
            const show = shows.find(s => s.id === id);
            if (show) navigate(`/insights/${slugifyShowName(show.name)}`);
          }}
        />
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
