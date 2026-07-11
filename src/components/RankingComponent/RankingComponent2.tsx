import { type Contestant, type Episode, type Ranking, type RankType } from "../../utils/Constants";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { buildPastRankingColumn, submitRankings } from "../../utils/util";
import {type EpisodeRef} from "../Episode/Episode";
import EpisodeComponent from "../Episode/Episode";
import ContestantIcon from "../ContestantIcon/ContestantIcon";
import './RankingComponent.css';
import SubmitRankingsModal from "../modals/SubmitRankingsModal";
import { Tooltip } from "react-tooltip";
import "react-tooltip/dist/react-tooltip.css";
import ShowSelect from "../ShowSelect/ShowSelect";
import { useNavigate, useParams } from "react-router-dom";
import { isRankableNow, getTodayDayKey } from "../../utils/episodeRankability";
import RankingCountdown from "../RankingCountdown/RankingCountdown";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEliminations, useShows, useShowTree, useUserRankings, userRankingsQueryKey } from "../../hooks/queries";
import { slugifyShowName } from "../../utils/slug";
import PageLoading from "../PageLoading";

const RankingComponent2 = () => {
  const [activeEpisodes, setActiveEpisodes] = useState<Set<string>>(new Set<string>());
  const [submitModalDisplayFlag, setSubmitModalDisplayFlag] = useState(false);
  const [rankingType, setRankingType] = useState<RankType>("FAVORITE");
  const [favoriteRankings, setFavoriteRankings] = useState<Ranking[]>([]);
  const [winnerRankings, setWinnerRankings] = useState<Ranking[]>([]);
  const [pastRankings, setPastRankings] = useState<Ranking[]>([]);
  const [pastRankingForType, setPastRankingForType] = useState<Ranking[]>([]);

  const { showSlug } = useParams<{ showSlug: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const user = useSelector((state: any) => state.user.value);

  const { data: shows = [] } = useShows();
  const showId = shows.find(s => slugifyShowName(s.name) === showSlug)?.id;
  const currShowTree = useShowTree(showId);
  const currShow = currShowTree.data;

  const currSeason = currShow?.seasons?.find(s => s.seasonNumber === currShow?.currSeason) ?? null;
  const hasRankableSeason = !!currSeason?.episodes?.length;

  const userRankingsQuery = useUserRankings(user?.id);
  const eliminationsQuery = useEliminations(!!user?.id);
  const allUserRankings = userRankingsQuery.data ?? null;
  const eliminations = eliminationsQuery.data ?? [];

  const loadingFlag = currShowTree.isLoading ||
    (!!user && hasRankableSeason && (userRankingsQuery.isLoading || eliminationsQuery.isLoading));

  // Only episodes whose airDate + assumed runtime has already passed are
  // rankable. Sorted explicitly since the API doesn't guarantee episode
  // order, so grid columns always render left-to-right in air order.
  const rankableEpisodes = [...(currSeason?.episodes ?? [])]
    .filter((episode) => isRankableNow(episode, currShow?.rankingMode ?? "EPISODE"))
    .sort((a, b) => a.episodeNumber - b.episodeNumber);

  // eliminations is fetched once per user across every show/season (see
  // ensureEliminationsLoaded above), so raw episodeNumber comparisons collide
  // across shows — nearly every show has an "episode 1". Scope to the season
  // actually being displayed before it's used for any threshold logic.
  const currentSeasonEliminations = eliminations.filter((e) => e.seasonId === currSeason?.id);

  let refs = useRef({});

  const setEpisodeRef = useCallback((episodeId: string) => (inst: EpisodeRef | null) => {
    refs.current[episodeId] = inst;
  }, []);

  const submitRankingsMutation = useMutation({
    mutationFn: submitRankings,
    // Awaited by handleSubmit so the submitted episodes have already moved
    // into pastRankingForType (no longer draggable) by the time the modal
    // reports success.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: userRankingsQueryKey(user?.id) }),
  });

  useEffect(() => {
    if (!allUserRankings || !currSeason?.id) { setPastRankings([]); return; }
    setPastRankings(allUserRankings.filter((r: Ranking) => r.episode?.seasonId === currSeason.id));
  }, [allUserRankings, currSeason?.id]);

  useEffect(() => {
    setPastRankingForType(rankingType === "FAVORITE" ? favoriteRankings : winnerRankings);
    setActiveEpisodes(new Set<string>());
  }, [rankingType]);

  // activeEpisodes holds episode ids from whichever show was previously
  // selected — without this, switching shows leaves stale ids behind, and
  // rankableEpisodes.find(...) for them comes up empty, showing an
  // "Active Week"/remove-button chip with no episode number.
  useEffect(() => {
    setActiveEpisodes(new Set<string>());
  }, [currShow?.id]);

  useEffect(() => {
    console.log("Past Rankings updated:", pastRankings);
    setFavoriteRankings(pastRankings.filter((r) => r.type === "FAVORITE").sort());
    setWinnerRankings(pastRankings.filter((r) => r.type === "WINNER"));
  }, [pastRankings]);

  useEffect(() => {
    if (rankingType === "FAVORITE") {
      setPastRankingForType(favoriteRankings);
    } else {
      setPastRankingForType(winnerRankings);
    }
  },[favoriteRankings, winnerRankings]);

  if (loadingFlag) {
    return (
      <div className="rankings-page">
        <h1 className="font-bold text-gray-800 page-header">Ranking Page</h1>
        <PageLoading />
      </div>
    );
  }

  const removeActiveEpisode = (episodeId: string) => {
    const newSet = new Set(activeEpisodes);
    newSet.delete(episodeId);
    setActiveEpisodes(newSet);
  };

  const handleSubmit = async () => {
    const activeEpisodesArr = Array.from(activeEpisodes);
    const rankingsList = activeEpisodesArr.map(episode => ({ userId: user.id, episodeId: episode, rankings: refs.current[episode]?.createEntries?.(), type: rankingType}));
    await submitRankingsMutation.mutateAsync(rankingsList);
    setActiveEpisodes(new Set<string>());
  };

  const checkPastRankings = (episodeId) => {
    const hit = pastRankingForType.find((r) => r.episodeId === episodeId);
    return hit ?? null;
  }

  const checkSubmitDisabled = () => {
    return pastRankingForType?.length === rankableEpisodes.length || activeEpisodes?.size === 0;
  }

  const getLastRankingNames = (episodeId: number) => {
    const pastFavRankings = favoriteRankings.filter((ranking) => ranking.episode?.episodeNumber < episodeId);
    const pastWinnerRankings = winnerRankings.filter((ranking) => ranking.episode?.episodeNumber < episodeId);
    const lastRanking = rankingType=="FAVORITE" ? pastFavRankings[pastFavRankings.length-1] : pastWinnerRankings[pastWinnerRankings.length-1];
    const currentContestantIds = [...(currSeason?.contestants ?? [])]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(contestant => contestant.id);
    if (lastRanking) {
      const orderedIds = lastRanking.contestantIds;
      // Contestants added to the season after this ranking was submitted
      // won't be in orderedIds — append them so they're still rankable
      // instead of silently disappearing from every future episode.
      const newContestantIds = currentContestantIds.filter(id => !orderedIds.includes(id));
      return [...orderedIds, ...newContestantIds];
    }
    return currentContestantIds;
  }

  const getContestantName = (contestantId: string) =>
    currSeason?.contestants?.find((c) => c.id === contestantId)?.name ?? "";

  const getContestantPhotoUrl = (contestantId: string) =>
    currSeason?.contestants?.find((c) => c.id === contestantId)?.photoUrl;

  // A contestant added to the season after a given episode already happened
  // (e.g. a cast newcomer added mid-season) shouldn't retroactively appear in
  // that episode's past-rankings column — they weren't rankable yet. Compares
  // the contestant's creation date to the episode's air date (or, for DAILY
  // shows, calendar day) rather than assuming every roster member was always
  // there.
  const wasContestantOnRosterFor = (contestant: Contestant, episode: Episode) => {
    if (!contestant.createdAt) return true;
    const createdAtMs = new Date(contestant.createdAt).getTime();
    if (Number.isNaN(createdAtMs)) return true;
    if (currShow?.rankingMode === "DAILY") {
      if (!episode.dayKey) return true;
      return getTodayDayKey(createdAtMs) <= episode.dayKey;
    }
    if (!episode.airDate) return true;
    return createdAtMs <= new Date(episode.airDate).getTime();
  };

  const pastRankingsElements = (ranking: Ranking, episode: Episode) => {
    const episodeNumber = episode.episodeNumber;
    const seasonContestantIds = currSeason?.contestants?.map((contestant) => contestant.id) ?? [];
    const eligibleContestantIds = (currSeason?.contestants ?? [])
      .filter((contestant) => wasContestantOnRosterFor(contestant, episode))
      .map((contestant) => contestant.id);
    const columnEntries = buildPastRankingColumn(ranking, episodeNumber, currentSeasonEliminations, seasonContestantIds, eligibleContestantIds);
    const heading = String(episodeNumber);
    // Raw grid items, not wrapped in a single spanning container — matching
    // InsightsRankingTable's proven pattern. buildPastRankingColumn now pads
    // every column to exactly the season's contestant count, so each column
    // always contributes the same number of grid cells and there's nothing
    // for grid-auto-flow: column to drift on.
    return [
      <div className="episode-heading" key={`${ranking.id}-heading`}>{heading}</div>,
      ...columnEntries.map((entry, index) => (
        <div key={`${ranking.id}-${entry.contestantId ?? `blank-${index}`}`} className={`cell${entry.eliminated ? ' eliminated-episode' : ''}`}>
          {entry.contestantId && (
            <ContestantIcon name={getContestantName(entry.contestantId)} photoUrl={getContestantPhotoUrl(entry.contestantId)} id={entry.contestantId} isActive={false} isEliminated={entry.eliminated} season={currSeason} show={currShow}/>
          )}
        </div>
      )),
    ];
  };

  const rankTypeTabs = <div className="rank-tabs">
    <div
      className={`rank-tab${rankingType == "FAVORITE" ? ' rank-tab-active' : ""}`}
      onClick={()=>setRankingType("FAVORITE")}
      data-tooltip-id="rank-type-tooltip"
      data-tooltip-content="Order the dancers from favorite to least favorite"
    >Favorite</div>
    <div
      className={`rank-tab${rankingType == "WINNER" ? ' rank-tab-active' : ""}`}
      onClick={()=>setRankingType("WINNER")}
      data-tooltip-id="rank-type-tooltip"
      data-tooltip-content="Order the dancers based on who you think will win the competition"
    >Winner</div>
    <Tooltip id="rank-type-tooltip" positionStrategy="fixed" style={{ maxWidth: "14rem" }} />
  </div>

  const rankingGrid = <div className="ranking-grid-wrapper">
    {/* Overlaid on top of the scrolling grid (not part of its scroll
        content), so it's trivially centered within whatever's currently
        visible — no need to track scroll position at all. */}
    <div className="episode-title-overlay">{currShow?.rankingMode === "DAILY" ? "Day" : "Episode"}</div>
    <div className="ranking-grid" style={{gridTemplateColumns: `repeat(${rankableEpisodes.length + 1}, 2.5rem) 1fr`, gridTemplateRows: `1fr 1.25rem repeat(${currSeason?.contestants?.length}, 1fr)`}}>
    <div className="grid-heading rank-column-cell">Rank</div>
    <div className="episode-heading rank-column-cell rank-spacer"></div>
    {currSeason?.contestants?.map((contestant, index) => {
      return (
        <div key={`rank-${index+1}`} className="grid-item rank-column-cell">
          {index + 1}
        </div>
      );
    })}
    <div className="grid-heading" style={{ gridColumn: `span ${rankableEpisodes.length + 1}` }}></div>
      {rankableEpisodes.map((episode) => {
        const inPastRankings = checkPastRankings(episode.id);
        return !inPastRankings ? <EpisodeComponent id={episode.id}
              setActiveEpisodes={setActiveEpisodes}
              activeEpisodes={activeEpisodes}
              currEpisode={episode}
              key={`episode-${episode.episodeNumber}`}
              ref={setEpisodeRef(episode.id)}
              lastOrder={getLastRankingNames(episode.episodeNumber)}
              eliminations={currentSeasonEliminations}
              contestants={currSeason?.contestants}
              season={currSeason}
              show={currShow}/> :
          pastRankingsElements(inPastRankings, episode);
      })}
    </div>
  </div>

  const rowCount = currSeason?.contestants?.length ?? 0;
  const episodeCount = rankableEpisodes.length;

  const rankingContainer = <div className="ranking-container">
      <div className="ranking-panel">
        {rankTypeTabs}
        {rowCount === 0
          ? <p className="ranking-placeholder">No contestants have been added to this season yet.</p>
          : episodeCount === 0
            ? <p className="ranking-placeholder">{currShow?.rankingMode === "DAILY" ? "Ranking opens once the season premieres." : "No episodes have been added to this season yet."}</p>
            : rankingGrid}
      </div>
      <div className="active-episodes-container">
          {[...activeEpisodes].map((episodeId) => <div className="remove-button px-2 text-xs" key={episodeId} onClick={()=>removeActiveEpisode(episodeId)}>X {currShow?.rankingMode === "DAILY" ? "Day" : "Episode"} {rankableEpisodes.find(episode => episode.id === episodeId)?.episodeNumber}</div>)}
        </div>
      </div>

  const topBar = <div className="ranking-top-bar">
    <div className="ranking-top-bar-left">
      <ShowSelect
          shows={shows}
          currShowId={showId}
          onSelectShow={(id) => {
            const show = shows.find(s => s.id === id);
            if (show) navigate(`/ranking/${slugifyShowName(show.name)}`);
          }}
        />
      <h1 className="font-bold rank-type-heading">Current Season: {currShow?.currSeason}</h1>
    </div>
    <div className={`button ${checkSubmitDisabled() ? 'inactive' : ''} px-4 my-auto min-w-40`} onClick={() => !checkSubmitDisabled() && setSubmitModalDisplayFlag(true)}>
          Submit Rankings
        </div>
  </div>

  return (
    <div className="rankings-page">
      <h1 className="font-bold text-gray-800 page-header">Ranking Page</h1>

      <div className="rankings-content">
        {topBar}
        {/* Fed the full, unfiltered episode list (not rankableEpisodes) —
            it needs to see not-yet-rankable episodes to find "next up". */}
        <RankingCountdown episodes={currSeason?.episodes ?? []} rankingMode={currShow?.rankingMode} premiereDate={currSeason?.premiereDate} />
        <main className="rankings-main">
          {user && rankingContainer}
        </main>
      </div>
      {submitModalDisplayFlag && <SubmitRankingsModal displayFlag={submitModalDisplayFlag} setDisplayFlag={setSubmitModalDisplayFlag} handleSubmit={handleSubmit}/>}
    </div>
  );
};

export default RankingComponent2;
