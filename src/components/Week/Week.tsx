import { act, forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { closestCenter, DndContext, KeyboardSensor, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable";
import ContestantIcon from "../ContestantIcon/ContestantIcon";
import './Week.css';
import { nameToImage, type Contestant, type Elimination, type Season, type Show } from "../../utils/Constants";
import { getContestantEliminationStatus, getEliminationOrder, getEliminations, getWeeks } from "../../utils/util";
import { useSelector } from "react-redux";
import plusIcon from "../../assets/plus.png";
import { propTypes } from "react-bootstrap/esm/Image";

interface WeekComponentProps {
  id?: string;
  currWeek: { id: string; weekNumber: number };
  activeWeeks: Set<string>;
  setActiveWeeks: (value: Set<string> | ((prevState: Set<string>) => Set<string>)) => void;
  lastOrder: string[];
  eliminations: Elimination[];
  contestants: Contestant[];
  season: Season;
  show?: Show;
}

export type WeekRef = {
  createEntries: () => { contestant_id: string; position: number }[];
}

const WeekComponent = forwardRef<WeekRef, WeekComponentProps>(({ currWeek, activeWeeks, setActiveWeeks, lastOrder, eliminations, contestants, season, show }: WeekComponentProps, ref) => {

  useImperativeHandle(ref, () => ({
    createEntries: () => createEntries()
  }));
  
  
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const [items, setItems] = useState(lastOrder ?? []);
  const [eliminatedContestants, setEliminatedContestants] = useState<string[]>([]);
  const [activeContestants, setActiveContestants] = useState<string[]>(lastOrder ?? []);


  useEffect(() => {
    const elimIds = getEliminationOrder(eliminations, currWeek.weekNumber-1).reverse();
    const elimNames = elimIds.map(id => {
      const contestant = contestants.find(c => c.id === id);
      return contestant ? contestant.name : "";
    });

    console.log("Eliminated Contestants for week ", currWeek.weekNumber, ": ", elimIds);
    setEliminatedContestants(elimNames);
    setActiveContestants(items.filter(dancer => !elimNames.includes(dancer)));
  }, []);

  const toggleWeek = (weekId: string) => {
    setActiveWeeks((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(weekId)) {
        newSet.delete(weekId);
      } else {
        newSet.add(weekId);
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

  const createEntries = () => {
    const entries = activeContestants.map((dancerId, index) => ({
      contestant_id: dancerId,
      position: index + 1,
    }));
    return entries;
  }

  return <div className="week-column">
            {activeWeeks?.has(currWeek?.id) ? <div>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={(event) => handleDragEnd(event)}
            >
              <SortableContext items={activeContestants} strategy={verticalListSortingStrategy}>
                <div className="week-heading">{currWeek?.weekNumber}</div>
                {activeContestants.map((dancer, idx) => {
                    return <div key={dancer} className="cell active-week">
                    <ContestantIcon name={dancer} id={dancer} isActive={true} isEliminated={false} season={season} show={show}/>
                  </div>
})}
              </SortableContext>
            </DndContext>
            {eliminatedContestants.map((dancer) => (
                <div key={`${dancer}-elim`} className="cell eliminated-week">
                  <ContestantIcon name={dancer} id={dancer} isActive={false} isEliminated={true} season={season} show={show}/>
                </div>)
              )}
            </div> : <>
                <div className="week-heading">{currWeek?.weekNumber}</div>
                <div key={`${currWeek?.id}-empty`} className="cell-default" style={{minHeight: `${season?.contestants?.length * 2.5}rem`}} onClick={() => toggleWeek(currWeek.id)}>
                  <img src={plusIcon} alt="Activate Week" className="add-week"/>
                </div>
                </>}
  </div>
});
export default WeekComponent;