import { act, forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { closestCenter, DndContext, KeyboardSensor, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable";
import ContestantIcon from "../ContestantIcon/ContestantIcon";
import './Episode.css';
import { nameToImage, type Contestant, type Elimination, type Season, type Show } from "../../utils/Constants";
import { getContestantEliminationStatus, getEliminationOrder, getEliminations, getEpisodes } from "../../utils/util";
import { useSelector } from "react-redux";
import plusIcon from "../../assets/plus.png";
import { propTypes } from "react-bootstrap/esm/Image";

interface EpisodeComponentProps {
  id?: string;
  currEpisode: { id: string; episodeNumber: number };
  activeEpisodes: Set<string>;
  setActiveEpisodes: (value: Set<string> | ((prevState: Set<string>) => Set<string>)) => void;
  lastOrder: string[];
  eliminations: Elimination[];
  contestants: Contestant[];
  season: Season;
  show?: Show;
}

export type EpisodeRef = {
  createEntries: () => string[];
}

const EpisodeComponent = forwardRef<EpisodeRef, EpisodeComponentProps>(({ currEpisode, activeEpisodes, setActiveEpisodes, lastOrder, eliminations, contestants, season, show }: EpisodeComponentProps, ref) => {

  useImperativeHandle(ref, () => ({
    createEntries: () => createEntries()
  }));


  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const [eliminatedContestants, setEliminatedContestants] = useState<string[]>([]);
  const [activeContestants, setActiveContestants] = useState<string[]>(lastOrder ?? []);

  const getContestantName = (contestantId: string) =>
    contestants.find(c => c.id === contestantId)?.name ?? "";

  const getContestantPhotoUrl = (contestantId: string) =>
    contestants.find(c => c.id === contestantId)?.photoUrl;

  const isActive = activeEpisodes?.has(currEpisode?.id);

  const heading = String(currEpisode?.episodeNumber ?? "");

  // Re-seed from the latest saved order whenever this episode is opened for
  // ranking, rather than only once on mount — every unranked episode mounts
  // together up front, before earlier episodes necessarily have a saved
  // ranking yet, so lastOrder can be stale by the time the user gets here.
  useEffect(() => {
    if (!isActive) return;
    // A contestant eliminated in this episode drops to the locked "eliminated"
    // section immediately, in the same episode/day they're eliminated —
    // eliminations are immutable at the bottom of the column from that point on.
    const elimIds = getEliminationOrder(eliminations, currEpisode.episodeNumber).reverse();

    setEliminatedContestants(elimIds);
    setActiveContestants((lastOrder ?? []).filter(dancerId => !elimIds.includes(dancerId)));
  }, [isActive]);

  const toggleEpisode = (episodeId: string) => {
    setActiveEpisodes((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(episodeId)) {
        newSet.delete(episodeId);
      } else {
        newSet.add(episodeId);
      }
      return newSet;
    });
  };

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (!over) return;

    var newItems = [] as string[];

    if (active.id !== over.id) {
      setActiveContestants((lastRankingIds) => {

        const oldIndex = lastRankingIds.indexOf(active.id);
        const newIndex = lastRankingIds.indexOf(over.id);

        newItems = arrayMove(lastRankingIds, oldIndex, newIndex);
        return newItems;
      });
    }
  };

  const createEntries = () => activeContestants;

  // Raw grid items, not wrapped in a div with an explicit gridRow span —
  // matching InsightsRankingTable's pattern. DndContext/SortableContext don't
  // render any DOM element of their own (just context providers), so cells
  // still end up as direct children of .ranking-grid. A wrapping div here
  // would make every cell just a normal-flow child of one spanning grid item,
  // which stops each cell's own height from being able to grow its row's 1fr
  // track — every cell got silently squashed down to whatever the rank
  // column's plain number cells needed.
  return isActive ? <>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={(event) => handleDragEnd(event)}
              autoScroll={{
                // .ranking-grid sets overflow-x: auto (for horizontal episode
                // scrolling), which also makes it a vertical auto-scroll
                // candidate to dnd-kit even though overflow-y is hidden and
                // it's never meant to scroll vertically. Programmatically
                // scrolling it there triggers a layout feedback loop where
                // scrollHeight keeps growing on every tick, so the drag
                // "scrolls" into ever-expanding empty space with no real
                // content. Restrict auto-scroll to the real page instead.
                canScroll: (element) => element === document.scrollingElement,
              }}
            >
              <SortableContext items={activeContestants} strategy={verticalListSortingStrategy}>
                <div className="episode-heading">{heading}</div>
                {activeContestants.map((dancerId) => {
                    return <div key={dancerId} className="cell active-episode">
                    <ContestantIcon name={getContestantName(dancerId)} photoUrl={getContestantPhotoUrl(dancerId)} id={dancerId} isActive={true} isEliminated={false} season={season} show={show}/>
                  </div>
})}
              </SortableContext>
            </DndContext>
            {eliminatedContestants.map((dancerId) => (
                <div key={`${dancerId}-elim`} className="cell eliminated-episode">
                  <ContestantIcon name={getContestantName(dancerId)} photoUrl={getContestantPhotoUrl(dancerId)} id={dancerId} isActive={false} isEliminated={true} season={season} show={show}/>
                </div>)
              )}
            </> : <>
                <div className="episode-heading">{heading}</div>
                <div key={`${currEpisode?.id}-empty`} className="cell-default" style={{gridRow: `span ${season?.contestants?.length}`}} onClick={() => toggleEpisode(currEpisode.id)}>
                  <img src={plusIcon} alt="Activate Episode" className="add-episode"/>
                </div>
                </>;
});
export default EpisodeComponent;
