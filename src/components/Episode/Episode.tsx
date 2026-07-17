import { closestCenter, DndContext, KeyboardSensor, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable";
import ContestantIcon from "../ContestantIcon/ContestantIcon";
import './Episode.css';
import { type Contestant, type Season, type Show } from "../../utils/Constants";
import plusIcon from "../../assets/plus.png";

interface EpisodeComponentProps {
  currEpisode: { id: string; episodeNumber: number };
  isActive: boolean;
  // Owned by the parent (not local state) so a mid-drag order survives the
  // component staying mounted but toggling inactive/active again — e.g.
  // switching between the Favorite/Winner tabs, which no longer resets it.
  activeContestants: string[];
  eliminatedContestants: string[];
  onReorder: (newOrder: string[]) => void;
  onActivate: () => void;
  contestants: Contestant[];
  season: Season;
  show?: Show;
}

const EpisodeComponent = ({ currEpisode, isActive, activeContestants, eliminatedContestants, onReorder, onActivate, contestants, season, show }: EpisodeComponentProps) => {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const getContestantName = (contestantId: string) =>
    contestants.find(c => c.id === contestantId)?.name ?? "";

  const getContestantPhotoUrl = (contestantId: string) =>
    contestants.find(c => c.id === contestantId)?.photoUrl;

  const heading = String(currEpisode?.episodeNumber ?? "");

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = activeContestants.indexOf(active.id);
    const newIndex = activeContestants.indexOf(over.id);
    onReorder(arrayMove(activeContestants, oldIndex, newIndex));
  };

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
                {activeContestants.map((contestantId) => {
                    return <div key={contestantId} className="cell active-episode">
                    <ContestantIcon name={getContestantName(contestantId)} photoUrl={getContestantPhotoUrl(contestantId)} id={contestantId} isActive={true} isEliminated={false} season={season} show={show}/>
                  </div>
})}
              </SortableContext>
            </DndContext>
            {eliminatedContestants.map((contestantId) => (
                <div key={`${contestantId}-elim`} className="cell eliminated-episode">
                  <ContestantIcon name={getContestantName(contestantId)} photoUrl={getContestantPhotoUrl(contestantId)} id={contestantId} isActive={false} isEliminated={true} season={season} show={show}/>
                </div>)
              )}
            </> : <>
                <div className="episode-heading">{heading}</div>
                <div key={`${currEpisode?.id}-empty`} className="cell-default" style={{gridRow: `span ${season?.contestants?.length}`}} onClick={onActivate}>
                  <img src={plusIcon} alt="Activate Episode" className="add-episode"/>
                </div>
                </>;
};
export default EpisodeComponent;
