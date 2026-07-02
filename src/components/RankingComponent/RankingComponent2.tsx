import { type Contestant, type Elimination, nameToImage, type Ranking, type RankType, type Season, type Show } from "../../utils/Constants";
import { use, useCallback, useEffect, useRef, useState, type JSX } from "react";
import { useSelector } from "react-redux";
import { getContestantEliminationStatus, getEliminations, getRanking, getUserRankings, submitRanking, submitRankings } from "../../utils/util";
import {type WeekRef} from "../Week/Week";
import WeekComponent from "../Week/Week";
import './RankingComponent.css';
import SubmitRankingsModal from "../modals/SubmitRankingsModal";
import TooltipComponent from "../TooltipComponent/TooltipComponent";
import { useAppSelector } from "../../redux/hooks";
import { selectCurrShow, selectShowWithSeasonsAndWeeks } from "../../redux/selectors";
import ShowSelect from "../ShowSelect/ShowSelect";
import { useParams } from "react-router-dom";
import { useLocation } from "react-router-dom";
import PastRankingsTable from "./PastRankingsTable";

const RankingComponent2 = () => {
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

  const initializePastRankings = async () => {
    if (!currShow) return; // shows haven't loaded from Redux yet — stay in loading state
    if (currSeason?.weeks?.length > 0 && user) {
      try {
        if(!submitModalDisplayFlag) setLoadingFlag(true);
        const prevRanks = await getUserRankings(user.id);
        setPastRankings((prevRanks || []).filter((r: Ranking) => r.week?.seasonId === currSeason.id));

        const elimRes = await getEliminations();
        setEliminations(elimRes);
      } catch (error) {
        console.error("Error fetching user rankings:", error);
      } finally {
        setTimeout(() => {setLoadingFlag(false);}, 1000);
      }
    } else {
      setLoadingFlag(false);
    }
  };

  useEffect(() => {
    initializePastRankings();
  },[currSeason?.id]);

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
    try{setLoadingFlag(false);
      const activeWeeksArr = Array.from(activeWeeks);
      const rankingsList = await Promise.all(activeWeeksArr.map(week => ({ userId: user.id, weekId: week, rankings: refs.current[week]?.createEntries?.(), type: rankingType})));
      await submitRankings(rankingsList);
      setActiveWeeks(new Set<string>());
      initializePastRankings();
    } finally {
      setTimeout(() => {
          setLoadingFlag(false);
      }, 1000);
    }
  };

  const checkPastRankings = (weekId) => {
    const hit = pastRankingForType.find((r) => r.week_id === weekId);
    return hit ?? null;
  }

  const checkSubmitDisabled = () => {
    return pastRankings?.length === currSeason?.weeks?.length || activeWeeks?.size === 0;
  }

  const getLastRankingNames = (weekId: number) => {
    const pastFavRankings = favoriteRankings.filter((ranking) => ranking.week?.weekNumber < weekId);
    const pastWinnerRankings = winnerRankings.filter((ranking) => ranking.week?.weekNumber < weekId);
    const lastRanking = rankingType=="FAVORITE" ? pastFavRankings[pastFavRankings.length-1] : pastWinnerRankings[pastWinnerRankings.length-1];
    if (lastRanking) {
      const sortedEntries = lastRanking.entries.sort((a, b) => a.position - b.position);
      return sortedEntries.map(entry => entry.contestant_id);
    }
    return currSeason.contestants.map(contestant => contestant.name).sort();
  }

  const unrankedWeeks = currSeason?.weeks?.filter((week) => !checkPastRankings(week.id)) ?? [];
  const rankedWeeks = currSeason?.weeks?.filter((week) => checkPastRankings(week.id)) ?? [];

  const rankingContainer = <div className="ranking-container">
      <div className="ranker-section">
        <div className="rank-gutter">
          <div className="grid-heading">Rank</div>
          <div className="week-heading"></div>
          {currSeason?.contestants?.map((contestant, index) => {
            return (
              <div key={contestant.id} className="grid-item">
                {index + 1}
              </div>
            );
          })}
        </div>
        {unrankedWeeks.length > 0 && (
          <div className="weeks-to-rank">
            <div className="grid-heading">Week</div>
            <div className="weeks-to-rank-body">
              {unrankedWeeks.map((week) => (
                <WeekComponent id={week.id}
                      setActiveWeeks={setActiveWeeks}
                      activeWeeks={activeWeeks}
                      currWeek={week}
                      key={`week-${week.weekNumber}`}
                      ref={setWeekRef(week.id)}
                      lastOrder={getLastRankingNames(week.weekNumber)}
                      eliminations={eliminations}
                      contestants={currSeason?.contestants}
                      season={currSeason}
                      show={currShow}/>
              ))}
            </div>
          </div>
        )}
      </div>
      <div className="active-weeks-container">
        {[...activeWeeks].map((weekId) => <div className="remove-button px-2 text-xs" key={weekId} onClick={()=>removeActiveWeek(weekId)}>X Week {currSeason?.weeks.find(week => week.id === weekId)?.weekNumber}</div>)}
      </div>
      <div className={`button ${checkSubmitDisabled() ? 'inactive' : ''} px-4 my-auto min-w-40`} onClick={() => !checkSubmitDisabled() && setSubmitModalDisplayFlag(true)}>
        Submit Rankings
      </div>
      <PastRankingsTable
        weeks={rankedWeeks}
        rankings={pastRankingForType}
        eliminations={eliminations}
        season={currSeason}
        show={currShow}
      />
    </div>

  const rankTypeContainer = <div className="rank-type-container gap-2">
    <ShowSelect 
        currShow={currShow} 
        currSeason={currSeason} 
      />
    <h1 className="font-bold rank-type-heading">Ranking Type</h1>
    <TooltipComponent text="Order the dancers from favorite to least favorite">
      <div className={`rank-button${rankingType == "FAVORITE" ? '-active' : ""}`} onClick={()=>setRankingType("FAVORITE")}>Favorite</div>
    </TooltipComponent>
    <TooltipComponent text ="Order the dancers based on who you think will win the competition">
      <div className={`rank-button${rankingType == "WINNER" ? '-active' : ""}`} onClick={()=>setRankingType("WINNER")}>Winner</div>
    </TooltipComponent>
  </div>

  return (
    <div className="rankings-page">
      <h1 className="font-bold text-gray-800 page-header">Ranking Page</h1>

      <div className="rankings-content">
        <aside className="rank-type-sidebar">{!loadingFlag && rankTypeContainer}</aside>
        <main className={`rankings-main${loadingFlag ? ' rankings-main-loading' : ''}`}>
          {loadingFlag ? <div className="loading-circle" /> : user && rankingContainer}
        </main>
      </div>
      {submitModalDisplayFlag && <SubmitRankingsModal displayFlag={submitModalDisplayFlag} setDisplayFlag={setSubmitModalDisplayFlag} handleSubmit={handleSubmit}/>}
    </div>
  );
};

export default RankingComponent2;
