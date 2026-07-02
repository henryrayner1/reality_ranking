import { type Contestant, type Elimination, nameToImage, type Ranking, type RankType, type Season, type Show } from "../../utils/Constants";
import { use, useCallback, useEffect, useRef, useState, type JSX } from "react";
import { useSelector } from "react-redux";
import { getContestantEliminationStatus, getEliminationOrder, getEliminations, getRanking, getUserRankings, submitRanking, submitRankings } from "../../utils/util";
import {type WeekRef} from "../Week/Week";
import WeekComponent from "../Week/Week";
import ContestantIcon from "../ContestantIcon/ContestantIcon";
import './RankingComponent.css';
import SubmitRankingsModal from "../modals/SubmitRankingsModal";
import TooltipComponent from "../TooltipComponent/TooltipComponent";
import { useAppSelector } from "../../redux/hooks";
import { selectShowWithSeasonsAndWeeks } from "../../redux/selectors";
import ShowSelect from "../ShowSelect/ShowSelect";
import { useParams } from "react-router-dom";
import { useLocation } from "react-router-dom";

const RankingComponent = () => {
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

  const currShow = useAppSelector(state => state.shows.currShow ?? state.shows.entities[state.shows.ids[0]]); 

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

  const pastRankingsElements = (ranking: Ranking) => {
    const elements = []
    const currWeekNo = currSeason?.weeks.find(week => week.id === ranking.week_id)?.weekNumber;
    elements.push(
      <div className="week-heading" key={`${ranking.id}-heading`}>{currWeekNo}</div>
    )

    const eliminationOrderIds = getEliminationOrder(eliminations, currWeekNo).reverse();
    const elimNames = eliminationOrderIds.map(id => {
      const contestant = currSeason?.contestants.find(c => c.id === id);
      return contestant ? contestant.name : "";
    });
    ranking.entries.map((entry) => {
          const eliminated = elimNames?.includes(entry.contestant_id);
          if (!eliminated) {
          elements.push(
            <div key={`${ranking.id}-${entry.contestant_id}`} className="cell">
              <ContestantIcon name={entry.contestant_id} id={entry.contestant_id} isActive={false} isEliminated={eliminated} season={currSeason} show={currShow}/>
            </div>
          );}
    })
    elimNames?.map((dancerId) => {
      elements.push(
        <div key={`${ranking.id}-${dancerId}-elim`} className="cell eliminated-week">
          <ContestantIcon name={dancerId} id={dancerId} isActive={false} isEliminated={true} season={currSeason} show={currShow}/>
        </div>
      );
    });

    return elements;
  }

  const style = {
    gridColumn: "span " + currSeason?.weeks?.length,
    justifyContent: "center",
  };

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

  const rankingContainer = <div className="ranking-container">
      <div className="ranking-grid" style={{gridTemplateColumns: `repeat(${currSeason?.weeks?.length + 1}, 1fr)`, gridTemplateRows: `1fr 1.25rem repeat(${currSeason?.contestants?.length}, 1fr)`}}>
        <div className="grid-heading">Rank</div>
        <div className="week-heading"></div>
        {currSeason?.contestants?.map((contestant, index) => {
          return (
            <div key={contestant.id} className="grid-item">
              {index + 1}
            </div>
          );
        })}
        <div className="grid-heading" style={style}>Week</div>
          {currSeason?.weeks?.map((week, index) => {
            const inPastRankings = checkPastRankings(week.id);
            return !inPastRankings ? <WeekComponent id={week.id} 
                  setActiveWeeks={setActiveWeeks} 
                  activeWeeks={activeWeeks} 
                  currWeek={week} 
                  key={`week-${week.weekNumber}`} 
                  ref={setWeekRef(week.id)} 
                  lastOrder={getLastRankingNames(index+1)} 
                  eliminations={eliminations}
                  contestants={currSeason?.contestants}
                  season={currSeason}
                  show={currShow}/> :
              pastRankingsElements(inPastRankings);
          })}
        </div>
        <div className="active-weeks-container">
          {[...activeWeeks].map((weekId) => <div className="remove-button px-2 text-xs" key={weekId} onClick={()=>removeActiveWeek(weekId)}>X Week {currSeason?.weeks.find(week => week.id === weekId)?.weekNumber}</div>)}
        </div>
        <div className={`button ${checkSubmitDisabled() ? 'inactive' : ''} px-4 my-auto min-w-40`} onClick={() => !checkSubmitDisabled() && setSubmitModalDisplayFlag(true)}>
          Submit Rankings
        </div>
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
        {!loadingFlag && <aside className="rank-type-sidebar">{rankTypeContainer}</aside>}
        <main className="rankings-main">
          {loadingFlag ? <div className="loading-circle" /> : user && rankingContainer}
        </main>
      </div>
      {submitModalDisplayFlag && <SubmitRankingsModal displayFlag={submitModalDisplayFlag} setDisplayFlag={setSubmitModalDisplayFlag} handleSubmit={handleSubmit}/>}
    </div>
  );
};

export default RankingComponent;
