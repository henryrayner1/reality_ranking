import { useState } from "react";
import { closestCenter, DndContext, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable";
import ContestantIcon from "../../ContestantIcon/ContestantIcon";
import ContestantPhoto from "../../ContestantPhoto/ContestantPhoto";
import type { Contestant, Season, Show } from "../../../utils/Constants";
import { formatPlacement, getPredictionName } from "../../../utils/util";
import { seedFinaleOrder } from "../../../utils/predictions";

interface FinalePredictorProps {
  contestants: Contestant[];
  // Saved placement order (winner first), else empty.
  initialOrder: string[];
  season: Season;
  show?: Show;
  hasSaved: boolean;
  isSaving: boolean;
  error?: string | null;
  onSubmit: (contestantIds: string[]) => void;
}

// Drag the finalists into the order you think they'll place; the top one is
// your predicted winner.
const FinalePredictor = ({ contestants, initialOrder, season, show, hasSaved, isSaving, error, onSubmit }: FinalePredictorProps) => {
  const [order, setOrder] = useState<string[]>(() => seedFinaleOrder(contestants, initialOrder));
  // A saved prediction shows as a summary until "Update Prediction" is
  // clicked; the page remounts this after a save, returning to the summary.
  const [editing, setEditing] = useState(!hasSaved);
  const byId = new Map(contestants.map((c) => [c.id, c]));
  const displayName = (id: string) => {
    const c = byId.get(id);
    return c ? getPredictionName(c, show) : "";
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    setOrder((prev) => arrayMove(prev, prev.indexOf(String(active.id)), prev.indexOf(String(over.id))));
  };

  const unchanged = hasSaved && order.length === initialOrder.length && order.every((id, i) => initialOrder[i] === id);

  const errorMsg = error && <p className="prediction-error" role="alert">{error}</p>;

  if (!editing) {
    const saved = seedFinaleOrder(contestants, initialOrder);
    const winner = byId.get(saved[0]);
    return (
      <div className="prediction-picker">
        <div className="prediction-summary">
          {winner && (
            <div className="prediction-summary-photos">
              <ContestantPhoto name={winner.name} photoUrl={winner.photoUrl} season={season} show={show} placement={1} className="prediction-summary-photo" />
            </div>
          )}
          <p className="prediction-summary-text">
            You have predicted <strong>{winner && displayName(winner.id)}</strong> will win the season.
          </p>
        </div>
        <ol className="finale-summary-order">
          {saved.map((id, index) => (
            <li key={id}>
              <span className="finale-order-place">{formatPlacement(index + 1)}</span>
              <span>{displayName(id)}</span>
            </li>
          ))}
        </ol>
        <div className="prediction-actions">
          <button type="button" className="prediction-submit" onClick={() => setEditing(true)}>Update Prediction</button>
        </div>
        {errorMsg}
      </div>
    );
  }

  return (
    <div className="prediction-picker">
      <p className="prediction-instructions">It's the finale! Drag the finalists into the order you think they'll place. The top spot is your winner.</p>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={order} strategy={verticalListSortingStrategy}>
          <ol className="finale-order">
            {order.map((id, index) => {
              const c = byId.get(id);
              if (!c) return null;
              return (
                <li key={id} className="finale-order-row">
                  <span className="finale-order-place">{formatPlacement(index + 1)}</span>
                  <ContestantIcon id={id} name={c.name} photoUrl={c.photoUrl} season={season} show={show} isActive placement={index + 1} />
                  <span className="finale-order-name">{displayName(id)}</span>
                </li>
              );
            })}
          </ol>
        </SortableContext>
      </DndContext>
      <div className="prediction-actions">
        <button type="button" className="prediction-submit" disabled={isSaving || unchanged} onClick={() => onSubmit(order)}>
          {isSaving ? "Saving..." : hasSaved ? "Save Prediction" : "Submit Prediction"}
        </button>
        {hasSaved && (
          <button
            type="button"
            className="prediction-cancel"
            disabled={isSaving}
            onClick={() => { setOrder(seedFinaleOrder(contestants, initialOrder)); setEditing(false); }}
          >
            Cancel
          </button>
        )}
      </div>
      {errorMsg}
    </div>
  );
};

export default FinalePredictor;
