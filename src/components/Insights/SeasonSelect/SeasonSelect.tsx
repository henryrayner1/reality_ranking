import { Dropdown } from 'react-bootstrap';
import { type Season } from '../../../utils/Constants';

interface SeasonSelectProps {
  seasons: Season[];
  selectedSeasonId: string | null;
  // The show's current season, labeled "(current)" in the menu so it's
  // findable again after browsing back to an older season.
  currentSeasonId?: string | null;
  onChange: (seasonId: string) => void;
}

const SeasonSelect = (props: SeasonSelectProps) => {
  if (props.seasons.length <= 1) return null;

  const selected = props.seasons.find((s) => s.id === props.selectedSeasonId);

  return (
    <div className="flex align-items-center">
      <h1 className="font-bold text-gray-800 pr-2">Viewing:</h1>
      <Dropdown>
        <Dropdown.Toggle variant="" id="season-select-dropdown" className="custom-button min-w-[8vw] min-h-[2.5rem]">
          {selected ? `Season ${selected.seasonNumber}` : "Select a Season"}
        </Dropdown.Toggle>
        <Dropdown.Menu>
          {props.seasons.map((season) => (
            <Dropdown.Item key={season.id} onClick={() => props.onChange(season.id)} className="m-0">
              {`Season ${season.seasonNumber}${season.id === props.currentSeasonId ? " (current)" : ""}`}
            </Dropdown.Item>
          ))}
        </Dropdown.Menu>
      </Dropdown>
    </div>
  );
};

export default SeasonSelect;
