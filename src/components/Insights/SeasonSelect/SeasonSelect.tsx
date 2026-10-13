import { Dropdown } from 'react-bootstrap';
import { type Season } from '../../../utils/Constants';

interface SeasonSelectProps {
  seasons: Season[];
  selectedSeasonId: string | null;
  // The show's current season, labeled "(current)" on the toggle and in the
  // menu — this picker is the page's only indication of which season is
  // current.
  currentSeasonId?: string | null;
  onChange: (seasonId: string) => void;
}

const SeasonSelect = (props: SeasonSelectProps) => {
  if (props.seasons.length === 0) return null;

  const selected = props.seasons.find((s) => s.id === props.selectedSeasonId);
  const label = (season: Season) =>
    `Season ${season.seasonNumber}${season.id === props.currentSeasonId ? " (current)" : ""}`;

  return (
    <div className="labeled-select flex align-items-center">
      <h1 className="labeled-select-label font-bold text-gray-800 pr-2">Season:</h1>
      <Dropdown>
        <Dropdown.Toggle variant="" id="season-select-dropdown" className="custom-button min-w-[8vw] min-h-[2.5rem]">
          {selected ? label(selected) : "Select a Season"}
        </Dropdown.Toggle>
        <Dropdown.Menu>
          {props.seasons.map((season) => (
            <Dropdown.Item key={season.id} onClick={() => props.onChange(season.id)} className="m-0">
              {label(season)}
            </Dropdown.Item>
          ))}
        </Dropdown.Menu>
      </Dropdown>
    </div>
  );
};

export default SeasonSelect;
