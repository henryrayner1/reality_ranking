import { useState } from "react";
import ContestantPhoto from "../../ContestantPhoto/ContestantPhoto";
import type { Contestant, Season, Show } from "../../../utils/Constants";
import { formatNameList } from "../../../utils/predictions";
import { getPredictionName } from "../../../utils/util";
import ContestantChip from "../ContestantChip/ContestantChip";

interface EliminationPickerProps {
  contestants: Contestant[];
  // How many contestants leave this episode; exactly this many must be picked.
  count: number;
  initialPicks: string[];
  season: Season;
  show?: Show;
  hasSaved: boolean;
  isSaving: boolean;
  error?: string | null;
  onSubmit: (contestantIds: string[]) => void;
}

// Click contestants to pick who goes home. With a single pick, clicking
// another contestant swaps the pick; with several, extra clicks past the
// limit are ignored until one is deselected. Once a prediction is saved it
// shows as a summary, and "Update Prediction" reopens the picker. The page
// remounts this component after a save, so it drops back to the summary.
const EliminationPicker = ({ contestants, count, initialPicks, season, show, hasSaved, isSaving, error, onSubmit }: EliminationPickerProps) => {
  const [picks, setPicks] = useState<string[]>(initialPicks);
  const [editing, setEditing] = useState(!hasSaved);

  const toggle = (id: string) => {
    setPicks((prev) => {
      if (prev.includes(id)) return prev.filter((p) => p !== id);
      if (count === 1) return [id];
      if (prev.length >= count) return prev;
      return [...prev, id];
    });
  };

  const unchanged = hasSaved && picks.length === initialPicks.length && picks.every((p) => initialPicks.includes(p));
  const canSubmit = picks.length === count && !isSaving && !unchanged;
  const errorMsg = error && <p className="prediction-error" role="alert">{error}</p>;

  if (!editing) {
    const picked = initialPicks
      .map((id) => contestants.find((c) => c.id === id))
      .filter((c): c is Contestant => !!c);
    return (
      <div className="prediction-picker">
        <div className="prediction-summary">
          <div className="prediction-summary-photos">
            {picked.map((c) => (
              <ContestantPhoto key={c.id} name={c.name} photoUrl={c.photoUrl} season={season} show={show} className="prediction-summary-photo" />
            ))}
          </div>
          <p className="prediction-summary-text">
            You have predicted <strong>{formatNameList(picked.map((c) => getPredictionName(c, show)))}</strong> will go home this episode.
          </p>
        </div>
        <div className="prediction-actions">
          <button type="button" className="prediction-submit" onClick={() => setEditing(true)}>Update Prediction</button>
        </div>
        {errorMsg}
      </div>
    );
  }

  return (
    <div className="prediction-picker">
      <p className="prediction-instructions">
        {count === 1 ? "Who's going home? Pick one contestant." : `${count} contestants are going home. Pick ${count}.`}
        {count > 1 && <span className="prediction-pick-count"> ({picks.length}/{count})</span>}
      </p>
      <div className="prediction-grid" role="group" aria-label="Contestants">
        {contestants.map((c) => {
          const selected = picks.includes(c.id);
          return (
            <button
              key={c.id}
              type="button"
              className={`prediction-chip prediction-option${selected ? " prediction-option-selected" : ""}`}
              aria-pressed={selected}
              aria-label={c.name}
              onClick={() => toggle(c.id)}
            >
              <ContestantChip contestant={c} season={season} show={show} />
            </button>
          );
        })}
      </div>
      <div className="prediction-actions">
        <button type="button" className="prediction-submit" disabled={!canSubmit} onClick={() => onSubmit(picks)}>
          {isSaving ? "Saving..." : hasSaved ? "Save Prediction" : "Submit Prediction"}
        </button>
        {hasSaved && (
          <button
            type="button"
            className="prediction-cancel"
            disabled={isSaving}
            onClick={() => { setPicks(initialPicks); setEditing(false); }}
          >
            Cancel
          </button>
        )}
      </div>
      {errorMsg}
    </div>
  );
};

export default EliminationPicker;
