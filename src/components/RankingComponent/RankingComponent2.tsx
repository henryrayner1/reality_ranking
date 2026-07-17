import { type Contestant, type Episode, type Ranking, type RankType } from "../../utils/Constants";
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { buildPastRankingColumn, getEliminationOrder, submitRankings } from "../../utils/util";
import EpisodeComponent from "../Episode/Episode";
import ContestantIcon from "../ContestantIcon/ContestantIcon";
import ContestantSelect from "../ContestantSelect/ContestantSelect";
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

const emptyActiveEpisodesByType = (): Record<RankType, Set<string>> => ({
  FAVORITE: new Set<string>(),
  WINNER: new Set<string>(),
});

const emptyActiveOrdersByType = (): Record<RankType, Record<string, string[]>> => ({
  FAVORITE: {},
  WINNER: {},
});

const RankingComponent2 = () => {
  // Kept separate per RankType (rather than one shared Set/order map) so
  // switching the Favorite/Winner tab no longer discards which episodes are
  // active or the in-progress drag order the user built up for them.
  const [activeEpisodesByType, setActiveEpisodesByType] = useState<Record<RankType, Set<string>>>(emptyActiveEpisodesByType());
  const [activeOrdersByType, setActiveOrdersByType] = useState<Record<RankType, Record<string, string[]>>>(emptyActiveOrdersByType());
  const [submitModalDisplayFlag, setSubmitModalDisplayFlag] = useState(false);
  const [rankingType, setRankingType] = useState<RankType>("FAVORITE");
  const [favoriteRankings, setFavoriteRankings] = useState<Ranking[]>([]);
  const [winnerRankings, setWinnerRankings] = useState<Ranking[]>([]);
  const [pastRankings, setPastRankings] = useState<Ranking[]>([]);
  const [pastRankingForType, setPastRankingForType] = useState<Ranking[]>([]);
  // Highlights one contestant's icon across every already-submitted (past
  // rankings) column by dimming everyone else's; null = no highlight ("All
  // Contestants").
  const [selectedContestantId, setSelectedContestantId] = useState<string | null>(null);

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

  const activeEpisodes = activeEpisodesByType[rankingType];

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
  }, [rankingType]);

  // activeEpisodesByType/activeOrdersByType hold episode ids (and their
  // in-progress drag order) from whichever show was previously selected —
  // without this, switching shows leaves stale ids behind, and
  // rankableEpisodes.find(...) for them comes up empty, showing an
  // "Active Week"/remove-button chip with no episode number. Switching the
  // Favorite/Winner tab, on the other hand, deliberately does NOT reset
  // these anymore — each RankType keeps its own independent active set/order
  // so in-progress rankings survive tab switches.
  useEffect(() => {
    setActiveEpisodesByType(emptyActiveEpisodesByType());
    setActiveOrdersByType(emptyActiveOrdersByType());
  }, [currShow?.id]);

  useEffect(() => {
    setSelectedContestantId(null);
  }, [currSeason?.id]);

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
    setActiveEpisodesByType((prev) => {
      const newSet = new Set(prev[rankingType]);
      newSet.delete(episodeId);
      return { ...prev, [rankingType]: newSet };
    });
    // Explicit removal (vs. just switching tabs) discards progress — a
    // future re-activation should reseed from the last submitted ranking
    // rather than resuming wherever this one left off.
    setActiveOrdersByType((prev) => {
      const { [episodeId]: _removed, ...rest } = prev[rankingType];
      return { ...prev, [rankingType]: rest };
    });
  };

  const handleSubmit = async () => {
    const activeEpisodesArr = Array.from(activeEpisodes);
    const rankingsList = activeEpisodesArr.map(episodeId => ({ userId: user.id, episodeId, rankings: activeOrdersByType[rankingType][episodeId] ?? [], type: rankingType }));
    await submitRankingsMutation.mutateAsync(rankingsList);
    setActiveEpisodesByType((prev) => ({ ...prev, [rankingType]: new Set<string>() }));
    setActiveOrdersByType((prev) => ({ ...prev, [rankingType]: {} }));
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

  // Contestants eliminated as of this episode, most-recently-eliminated
  // first — locked at the bottom of an active episode's column, same
  // threshold Episode.tsx used to compute internally.
  const getEpisodeEliminatedIds = (episode: Episode) =>
    getEliminationOrder(currentSeasonEliminations, episode.episodeNumber, getContestantName).reverse();

  const activateEpisode = (episode: Episode) => {
    setActiveEpisodesByType((prev) => {
      const newSet = new Set(prev[rankingType]);
      newSet.add(episode.id);
      return { ...prev, [rankingType]: newSet };
    });
    setActiveOrdersByType((prev) => {
      // Already has an in-progress order for this type (e.g. re-activated
      // after just switching tabs) — leave it alone instead of reseeding.
      if (prev[rankingType][episode.id]) return prev;
      const elimIds = getEpisodeEliminatedIds(episode);
      const seedOrder = getLastRankingNames(episode.episodeNumber).filter((id) => !elimIds.includes(id));
      return { ...prev, [rankingType]: { ...prev[rankingType], [episode.id]: seedOrder } };
    });
  };

  const reorderActiveEpisode = (episodeId: string, newOrder: string[]) => {
    setActiveOrdersByType((prev) => ({
      ...prev,
      [rankingType]: { ...prev[rankingType], [episodeId]: newOrder },
    }));
  };

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
    const columnEntries = buildPastRankingColumn(ranking, episodeNumber, currentSeasonEliminations, seasonContestantIds, eligibleContestantIds, getContestantName);
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
            <ContestantIcon
              name={getContestantName(entry.contestantId)}
              photoUrl={getContestantPhotoUrl(entry.contestantId)}
              id={entry.contestantId}
              isActive={false}
              isEliminated={entry.eliminated}
              dimmed={selectedContestantId != null && entry.contestantId !== selectedContestantId}
              season={currSeason}
              show={currShow}
            />
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
      data-tooltip-content="Order the contestants from favorite to least favorite"
    >Favorite</div>
    <div
      className={`rank-tab${rankingType == "WINNER" ? ' rank-tab-active' : ""}`}
      onClick={()=>setRankingType("WINNER")}
      data-tooltip-id="rank-type-tooltip"
      data-tooltip-content="Order the contestants based on who you think will win the competition"
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
        if (inPastRankings) return pastRankingsElements(inPastRankings, episode);
        const isActive = activeEpisodes.has(episode.id);
        const eliminatedIds = getEpisodeEliminatedIds(episode);
        return <EpisodeComponent
              currEpisode={episode}
              key={`episode-${episode.episodeNumber}`}
              isActive={isActive}
              activeContestants={activeOrdersByType[rankingType][episode.id] ?? getLastRankingNames(episode.episodeNumber).filter((id) => !eliminatedIds.includes(id))}
              eliminatedContestants={eliminatedIds}
              onReorder={(newOrder) => reorderActiveEpisode(episode.id, newOrder)}
              onActivate={() => activateEpisode(episode)}
              contestants={currSeason?.contestants}
              season={currSeason}
              show={currShow}/>;
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
      {currShow && (
        <h1 className="font-bold rank-type-heading">
          Current Season: <span className="rank-type-heading-number">{currShow.currSeason}</span>
        </h1>
      )}
      {currShow && (
        <ContestantSelect
          contestants={currSeason?.contestants ?? []}
          selectedContestantId={selectedContestantId}
          onChange={setSelectedContestantId}
        />
      )}
    </div>
    {currShow && (
      <div className={`button${checkSubmitDisabled() ? '-inactive' : ''} px-4 my-auto min-w-40`} onClick={() => !checkSubmitDisabled() && setSubmitModalDisplayFlag(true)}>
            Submit Rankings
          </div>
    )}
  </div>

  return (
    <div className="rankings-page">
      <h1 className="font-bold text-gray-800 page-header">Ranking Page</h1>

      <div className="rankings-content">
        {topBar}
        {!showId ? (
          <p className="ranking-placeholder">Please select a show.</p>
        ) : (
          <>
            {/* Fed the full, unfiltered episode list (not rankableEpisodes) —
                it needs to see not-yet-rankable episodes to find "next up". */}
            <RankingCountdown episodes={currSeason?.episodes ?? []} rankingMode={currShow?.rankingMode} premiereDate={currSeason?.premiereDate} />
            <main className="rankings-main">
              {user && rankingContainer}
            </main>
          </>
        )}
      </div>
      {submitModalDisplayFlag && <SubmitRankingsModal displayFlag={submitModalDisplayFlag} setDisplayFlag={setSubmitModalDisplayFlag} handleSubmit={handleSubmit}/>}
    </div>
  );
};

export default RankingComponent2;
