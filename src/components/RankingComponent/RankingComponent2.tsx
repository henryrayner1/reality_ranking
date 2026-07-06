import { type Contestant, type Elimination, nameToImage, type Ranking, type RankType, type Season, type Show } from "../../utils/Constants";
import { use, useCallback, useEffect, useRef, useState, type JSX } from "react";
import { useSelector } from "react-redux";
import { buildPastRankingColumn, getContestantEliminationStatus, getEliminations, getRanking, getUserRankings, submitRanking, submitRankings } from "../../utils/util";
import {type WeekRef} from "../Week/Week";
import WeekComponent from "../Week/Week";
import ContestantIcon from "../ContestantIcon/ContestantIcon";
import './RankingComponent.css';
import SubmitRankingsModal from "../modals/SubmitRankingsModal";
import { Tooltip } from "react-tooltip";
import "react-tooltip/dist/react-tooltip.css";
import { useAppSelector } from "../../redux/hooks";
import { selectCurrShow, selectShowWithSeasonsAndWeeks } from "../../redux/selectors";
import ShowSelect from "../ShowSelect/ShowSelect";
import { useParams } from "react-router-dom";
import { useLocation } from "react-router-dom";

const RankingComponent2 = () => {
  const [allUserRankings, setAllUserRankings] = useState<Ranking[] | null>(null);
  const [pastRankings, setPastRankings] = useState<Ranking[]>([]);
  const [activeWeeks, setActiveWeeks] = useState<Set<string>>(new Set<string>());
  const [loadingFlag, setLoadingFlag] = useState(true);
  const [submitModalDisplayFlag, setSubmitModalDisplayFlag] = useState(false);
  const [rankingType, setRankingType] = useState<RankType>("FAVORITE");
  const [favoriteRankings, setFavoriteRankings] = useState<Ranking[]>([]);
  const [winnerRankings, setWinnerRankings] = useState<Ranking[]>([]);
  const [pastRankingForType, setPastRankingForType] = useState<Ranking[]>([]);
  const [eliminations, setEliminations] = useState<Elimination[]>([]);
  const [namesToImage, setNamesToImage] = useState<Record<string,string>>({});

  // Both endpoints below return the user's *entire* ranking/elimination history
  // unfiltered by show/season, so once fetched for a user this session there's
  // no need to re-hit the API just because they switched shows/seasons — we
  // only refetch when the logged-in user changes or after a new submission.
  const rankingsLoadedForUserRef = useRef<string | null>(null);
  const eliminationsLoadedRef = useRef(false);

  const { showId } = useParams<{ showId: string }>();

  const currShow = useAppSelector(selectCurrShow);

  const currShowTree = useAppSelector(state => 
    selectShowWithSeasonsAndWeeks(state, currShow?.id || "")
  );

  const currSeason = currShowTree?.seasons?.find(s => s.seasonNumber === currShow?.currSeason) ?? null;

  useEffect(() => {
    if (currShow) {
      //setNamesToImage(nameToImage[currShow?.id][currSeason?.seasonNumber] || {});
    }
  }, [currSeason])

  const user = useSelector((state: any) => state.user.value);
  let refs = useRef({});

  const setWeekRef = useCallback((weekId: string) => (inst: WeekRef | null) => {
    refs.current[weekId] = inst;
  }, []);

  const refreshUserRankings = async (userId: string) => {
    const prevRanks = await getUserRankings(userId);
    setAllUserRankings(prevRanks || []);
    rankingsLoadedForUserRef.current = userId;
  };

  const ensureEliminationsLoaded = async () => {
    if (eliminationsLoadedRef.current) return;
    const elimRes = await getEliminations();
    setEliminations(elimRes);
    eliminationsLoadedRef.current = true;
  };

  useEffect(() => {
    const loadIfNeeded = async () => {
      if (!currShow) return; // shows haven't loaded from Redux yet — stay in loading state
      if (!user) { setLoadingFlag(false); return; }
      if (!(currSeason?.weeks?.length > 0)) { setLoadingFlag(false); return; }

      const needsRankings = rankingsLoadedForUserRef.current !== user.id;
      const needsEliminations = !eliminationsLoadedRef.current;
      if (!needsRankings && !needsEliminations) { setLoadingFlag(false); return; }

      try {
        setLoadingFlag(true);
        await Promise.all([
          needsRankings ? refreshUserRankings(user.id) : Promise.resolve(),
          needsEliminations ? ensureEliminationsLoaded() : Promise.resolve(),
        ]);
      } catch (error) {
        console.error("Error fetching user rankings:", error);
      } finally {
        setTimeout(() => {setLoadingFlag(false);}, 1000);
      }
    };
    loadIfNeeded();
  },[currSeason?.id, user?.id]);

  useEffect(() => {
    if (!allUserRankings || !currSeason?.id) { setPastRankings([]); return; }
    setPastRankings(allUserRankings.filter((r: Ranking) => r.week?.seasonId === currSeason.id));
  }, [allUserRankings, currSeason?.id]);

  useEffect(() => {
    if (currShowTree && currShowTree.seasons) {
      const currentSeason = currShowTree.seasons.find((season: any) => season.is_current);
      const newSeason = currentSeason || null;
    }
  },[currShow?.id, currShowTree]);


  useEffect(() => {
    setPastRankingForType(rankingType === "FAVORITE" ? favoriteRankings : winnerRankings);
    setActiveWeeks(new Set<string>());
  }, [rankingType]);

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

  const removeActiveWeek = (weekId: string) => {
    const newSet = new Set(activeWeeks);
    newSet.delete(weekId);
    setActiveWeeks(newSet);
  };

  const handleSubmit = async () => {
    const activeWeeksArr = Array.from(activeWeeks);
    const rankingsList = await Promise.all(activeWeeksArr.map(week => ({ userId: user.id, weekId: week, rankings: refs.current[week]?.createEntries?.(), type: rankingType})));
    await submitRankings(rankingsList);
    setActiveWeeks(new Set<string>());
    // Awaited so the submitted weeks have already moved into pastRankingForType
    // (no longer draggable) by the time the modal reports success.
    await refreshUserRankings(user.id);
  };

  const checkPastRankings = (weekId) => {
    const hit = pastRankingForType.find((r) => r.weekId === weekId);
    return hit ?? null;
  }

  const checkSubmitDisabled = () => {
    return pastRankingForType?.length === currSeason?.weeks?.length || activeWeeks?.size === 0;
  }

  const getLastRankingNames = (weekId: number) => {
    const pastFavRankings = favoriteRankings.filter((ranking) => ranking.week?.weekNumber < weekId);
    const pastWinnerRankings = winnerRankings.filter((ranking) => ranking.week?.weekNumber < weekId);
    const lastRanking = rankingType=="FAVORITE" ? pastFavRankings[pastFavRankings.length-1] : pastWinnerRankings[pastWinnerRankings.length-1];
    if (lastRanking) {
      const sortedEntries = lastRanking.entries.sort((a, b) => a.position - b.position);
      return sortedEntries.map(entry => entry.contestantId);
    }
    return [...(currSeason?.contestants ?? [])]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(contestant => contestant.id);
  }

  const getContestantName = (contestantId: string) =>
    currSeason?.contestants?.find((c) => c.id === contestantId)?.name ?? "";

  const pastRankingsElements = (ranking: Ranking, weekNumber: number) => {
    const columnEntries = buildPastRankingColumn(ranking, weekNumber, eliminations);
    return [
      <div className="week-heading" key={`${ranking.id}-heading`}>{weekNumber}</div>,
      ...columnEntries.map((entry) => (
        <div key={`${ranking.id}-${entry.contestantId}`} className={`cell${entry.eliminated ? ' eliminated-week' : ''}`}>
          <ContestantIcon name={getContestantName(entry.contestantId)} id={entry.contestantId} isActive={false} isEliminated={entry.eliminated} season={currSeason} show={currShow}/>
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

  const rankingGrid = <div className="ranking-grid" style={{gridTemplateColumns: `repeat(${currSeason?.weeks?.length + 1}, 2.5rem) 1fr`, gridTemplateRows: `1fr 1.25rem repeat(${currSeason?.contestants?.length}, 1fr)`}}>
    <div className="grid-heading">Rank</div>
    <div className="week-heading"></div>
    {currSeason?.contestants?.map((contestant, index) => {
      return (
        <div key={contestant.id} className="grid-item">
          {index + 1}
        </div>
      );
    })}
    <div className="grid-heading" style={{ gridColumn: `span ${currSeason?.weeks?.length + 1}`, justifyContent: "center" }}>Week</div>
      {currSeason?.weeks?.map((week) => {
        const inPastRankings = checkPastRankings(week.id);
        return !inPastRankings ? <WeekComponent id={week.id}
              setActiveWeeks={setActiveWeeks}
              activeWeeks={activeWeeks}
              currWeek={week}
              key={`week-${week.weekNumber}`}
              ref={setWeekRef(week.id)}
              lastOrder={getLastRankingNames(week.weekNumber)}
              eliminations={eliminations}
              contestants={currSeason?.contestants}
              season={currSeason}
              show={currShow}/> :
          pastRankingsElements(inPastRankings, week.weekNumber);
      })}
    </div>

  const rowCount = currSeason?.contestants?.length ?? 0;
  const weekCount = currSeason?.weeks?.length ?? 0;

  const rankingContainer = <div className="ranking-container">
      <div className="ranking-panel">
        {rankTypeTabs}
        {loadingFlag
          ? <div className="ranking-grid-loading"><div className="loading-circle" /></div>
          : rowCount === 0
            ? <p className="ranking-placeholder">No contestants have been added to this season yet.</p>
            : weekCount === 0
              ? <p className="ranking-placeholder">No weeks have been added to this season yet.</p>
              : rankingGrid}
      </div>
      {!loadingFlag && <div className="active-weeks-container">
          {[...activeWeeks].map((weekId) => <div className="remove-button px-2 text-xs" key={weekId} onClick={()=>removeActiveWeek(weekId)}>X Week {currSeason?.weeks.find(week => week.id === weekId)?.weekNumber}</div>)}
        </div>}
      </div>

  const topBar = <div className="ranking-top-bar">
    <div className="ranking-top-bar-left">
      <ShowSelect
          currShow={currShow}
          currSeason={currSeason}
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
        <main className="rankings-main">
          {user && rankingContainer}
        </main>
      </div>
      {submitModalDisplayFlag && <SubmitRankingsModal displayFlag={submitModalDisplayFlag} setDisplayFlag={setSubmitModalDisplayFlag} handleSubmit={handleSubmit}/>}
    </div>
  );
};

export default RankingComponent2;
