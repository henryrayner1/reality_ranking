import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { type Ranking, type RankType } from "../../utils/Constants";
import { useNavigate, useParams } from "react-router-dom";
import { useEliminationsBySeason, useRankingsInsights, useShowTree, useShows, useUserRankings } from "../../hooks/queries";
import { slugifyShowName } from "../../utils/slug";
import { buildOwnInsights } from "../../utils/util";
import ShowSelect from "../ShowSelect/ShowSelect";
import SeasonSelect from "./SeasonSelect";
import InsightsRankingTable from "./InsightsRankingTable";
import ContestantDetailPanel from "./ContestantDetailPanel";
import PageLoading from "../PageLoading";
import "./Insights.css";

type PageMode = "table" | "contestant";
type DataScope = "all" | "own";

const Insights = () => {
  const [pageMode, setPageMode] = useState<PageMode>("table");
  const [rankingType, setRankingType] = useState<RankType>("FAVORITE");
  const [selectedSeasonId, setSelectedSeasonId] = useState<string | null>(null);
  const [selectedContestantId, setSelectedContestantId] = useState<string | null>(null);
  const [dataScope, setDataScope] = useState<DataScope>("all");

  const user = useSelector((state: any) => state.user.value);

  const { showSlug } = useParams<{ showSlug: string }>();
  const navigate = useNavigate();

  const { data: shows = [] } = useShows();
  const showId = shows.find(s => slugifyShowName(s.name) === showSlug)?.id;
  const currShowTree = useShowTree(showId);
  const currShow = currShowTree.data;

  const seasons = currShow?.seasons ?? [];
  // Falls back to the show's current season instead of null when
  // selectedSeasonId still belongs to the previously-selected show (state
  // hasn't caught up yet — the effect below fixes it a render later). Without
  // this fallback, that one intermediate render hits the !currSeason branch
  // in InsightsRankingTable/ContestantDetailPanel and flashes their loading
  // circle even though every relevant query is already cached.
  const defaultSeason = seasons.find((s) => s.seasonNumber === currShow?.currSeason) ?? seasons[seasons.length - 1] ?? null;
  const currSeason = seasons.find((s) => s.id === selectedSeasonId) ?? defaultSeason;

  const favoriteInsightsQuery = useRankingsInsights(currSeason?.id, "FAVORITE");
  const winnerInsightsQuery = useRankingsInsights(currSeason?.id, "WINNER");
  const eliminationsQuery = useEliminationsBySeason(currSeason?.id);
  const userRankingsQuery = useUserRankings(user?.id);
  const eliminations = eliminationsQuery.data ?? [];

  // "My Submissions" scope builds InsightsResponse-shaped data from only the
  // logged-in user's own rankings for this season, instead of the season-wide
  // average every user sees under "All User Data" — same buildOwnInsights
  // helper the Ranking page's own "By Contestant" view used to use.
  const ownRankings: Ranking[] = (userRankingsQuery.data ?? []).filter(
    (r: Ranking) => r.episode?.seasonId === currSeason?.id
  );
  const ownFavoriteInsights = buildOwnInsights(ownRankings.filter((r) => r.type === "FAVORITE"), "FAVORITE", currSeason?.id ?? "");
  const ownWinnerInsights = buildOwnInsights(ownRankings.filter((r) => r.type === "WINNER"), "WINNER", currSeason?.id ?? "");

  const favoriteInsights = dataScope === "own" ? ownFavoriteInsights : (favoriteInsightsQuery.data ?? null);
  const winnerInsights = dataScope === "own" ? ownWinnerInsights : (winnerInsightsQuery.data ?? null);
  const loadingFlag = currShowTree.isLoading || (!!currSeason?.id &&
    (favoriteInsightsQuery.isLoading || winnerInsightsQuery.isLoading || eliminationsQuery.isLoading ||
      (!!user && userRankingsQuery.isLoading)));

  // Default the season picker to the show's current season whenever the
  // show changes (not on every currShowTree recompute), so a user's manual
  // season choice persists until they switch shows again.
  useEffect(() => {
    setSelectedSeasonId(defaultSeason?.id ?? null);
  }, [currShow?.id]);

  useEffect(() => {
    setSelectedContestantId(null);
  }, [currSeason?.id]);

  // "My Submissions" has no meaning once logged out (the toggle itself is
  // hidden in that case) — fall back to the aggregated view rather than
  // leaving a stale "own" selection in place with no user to scope it to.
  useEffect(() => {
    if (!user) setDataScope("all");
  }, [user]);

  if (currShowTree.isLoading) {
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
        <SeasonSelect seasons={seasons} selectedSeasonId={currSeason?.id ?? null} onChange={setSelectedSeasonId} />
      </div>
      {user && (
        <div className="data-scope-toggle">
          <label className="data-scope-option">
            <input
              type="radio"
              name="dataScope"
              checked={dataScope === "all"}
              onChange={() => setDataScope("all")}
            />
            All User Data
          </label>
          <label className="data-scope-option">
            <input
              type="radio"
              name="dataScope"
              checked={dataScope === "own"}
              onChange={() => setDataScope("own")}
            />
            My Submissions
          </label>
        </div>
      )}
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
        {!currShow ? (
          <p className="insights-placeholder">Please select a show.</p>
        ) : (
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
        )}
      </div>
    </div>
  );
};

export default Insights;
