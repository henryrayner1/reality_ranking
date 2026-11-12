import { useState } from "react";
import ContestantPhoto from "../../ContestantPhoto/ContestantPhoto";
import type { Contestant, Season, Show } from "../../../utils/Constants";

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
// limit are ignored until one is deselected.
const EliminationPicker = ({ contestants, count, initialPicks, season, show, hasSaved, isSaving, error, onSubmit }: EliminationPickerProps) => {
  const [picks, setPicks] = useState<string[]>(initialPicks);

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
              className={`prediction-option${selected ? " prediction-option-selected" : ""}`}
              aria-pressed={selected}
              aria-label={c.name}
              onClick={() => toggle(c.id)}
            >
              <ContestantPhoto name={c.name} photoUrl={c.photoUrl} season={season} show={show} className="prediction-option-photo" />
              <span className="prediction-option-name">{c.name}</span>
            </button>
          );
        })}
      </div>
      <div className="prediction-actions">
        <button type="button" className="prediction-submit" disabled={!canSubmit} onClick={() => onSubmit(picks)}>
          {isSaving ? "Saving..." : hasSaved ? "Update Prediction" : "Submit Prediction"}
        </button>
        {unchanged && <span className="prediction-saved">Prediction saved</span>}
      </div>
      {error && <p className="prediction-error" role="alert">{error}</p>}
    </div>
  );
};

export default EliminationPicker;
