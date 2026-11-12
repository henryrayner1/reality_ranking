import ContestantPhoto from "../../ContestantPhoto/ContestantPhoto";
import type { Contestant, Season, Show } from "../../../utils/Constants";
import { formatPlacement, getPredictionName } from "../../../utils/util";
import "./ContestantChip.css";

interface ContestantChipProps {
  contestant: Contestant;
  season: Season;
  show?: Show;
  // Finale placement (1 = winner): medal ring on the photo and a label
  // under the name.
  placement?: number | null;
  // Small caption under the name instead of a placement label (e.g. "62%").
  note?: string;
}

// The Predictions page's contestant card contents: square photo with the
// name beside it (first name, or full name on Show.displayFullName shows).
// The caller supplies the card itself (a button in the picker, a plain box
// in the history), styled by .prediction-chip.
const ContestantChip = ({ contestant, season, show, placement, note }: ContestantChipProps) => (
  <>
    <ContestantPhoto
      name={contestant.name}
      photoUrl={contestant.photoUrl}
      season={season}
      show={show}
      placement={placement}
      className="prediction-chip-photo"
    />
    <span className="prediction-chip-text">
      <span className="prediction-chip-name">{getPredictionName(contestant, show)}</span>
      {placement ? <span className="prediction-chip-placement">{formatPlacement(placement)}</span> : null}
      {!placement && note ? <span className="prediction-chip-placement">{note}</span> : null}
    </span>
  </>
);

export default ContestantChip;
