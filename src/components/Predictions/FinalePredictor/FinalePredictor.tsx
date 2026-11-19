import { useState } from "react";
import { closestCenter, DndContext, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import ContestantChip from "../ContestantChip/ContestantChip";
import ContestantPhoto from "../../ContestantPhoto/ContestantPhoto";
import type { Contestant, Season, Show } from "../../../utils/Constants";
import { formatPlacement, getPredictionName, placementTier } from "../../../utils/util";
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

// One draggable finalist card (photo + name). The placement label sits
// outside it, in a fixed column, so it stays put while the cards move.
const SortableFinalist = ({ contestant, season, show, row }: { contestant: Contestant; season: Season; show?: Show; row: number }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: contestant.id });
  return (
    <li
      ref={setNodeRef}
      className={`prediction-chip finale-order-chip${isDragging ? " finale-order-chip-dragging" : ""}`}
      style={{ gridRow: row, transform: CSS.Transform.toString(transform), transition }}
      {...attributes}
      {...listeners}
      aria-label={contestant.name}
    >
      <ContestantChip contestant={contestant} season={season} show={show} />
      <span className="finale-order-handle" aria-hidden="true">⠿</span>
    </li>
  );
};

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

  const rowsStyle = { gridRow: `1 / span ${Math.max(order.length, 1)}` };

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
        {saved.length > 1 && (
          // Everyone after the winner as photo + name chips: 2nd and 3rd in
          // a wider medal-outlined podium row, the rest smaller below.
          <ol className="finale-summary-order" start={2} aria-label="Rest of your predicted placements">
            {saved.slice(1).map((id, i) => {
              const c = byId.get(id);
              if (!c) return null;
              const place = i + 2;
              const podium = place <= 3;
              return (
                <li
                  key={id}
                  className={`prediction-chip finale-summary-chip${podium ? ` finale-summary-podium placement-${placementTier(place)}` : ""}`}
                >
                  <ContestantChip contestant={c} season={season} show={show} note={formatPlacement(place)} />
                </li>
              );
            })}
          </ol>
        )}
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
          <div className="finale-order">
            <ol className="finale-order-places" style={rowsStyle} aria-hidden="true">
              {order.map((id, index) => (
                <li key={id} className="finale-order-place" style={{ gridRow: index + 1 }}>{formatPlacement(index + 1)}</li>
              ))}
            </ol>
            {/* Medal outlines for the top three spots, drawn behind the chips
                so they stay put while a chip is dragged out of its spot. */}
            <div className="finale-order-slots" style={rowsStyle} aria-hidden="true">
              {order.map((id, index) => (
                <div key={id} className={`finale-order-slot placement-${placementTier(index + 1)}`} style={{ gridRow: index + 1 }} />
              ))}
            </div>
            <ol className="finale-order-chips" style={rowsStyle} aria-label="Predicted placements, winner first">
              {order.map((id, index) => {
                const c = byId.get(id);
                return c ? <SortableFinalist key={id} contestant={c} season={season} show={show} row={index + 1} /> : null;
              })}
            </ol>
          </div>
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
