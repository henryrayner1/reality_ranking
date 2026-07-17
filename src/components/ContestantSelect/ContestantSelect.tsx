import { Dropdown } from 'react-bootstrap';
import { type Contestant } from '../../utils/Constants';

interface ContestantSelectProps {
  contestants: Contestant[];
  selectedContestantId: string | null;
  onChange: (contestantId: string | null) => void;
}

const ContestantSelect = ({ contestants, selectedContestantId, onChange }: ContestantSelectProps) => {
  const selected = contestants.find((c) => c.id === selectedContestantId);
  const sortedContestants = [...contestants].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="flex align-items-center">
      <h1 className="font-bold text-gray-800 pr-2">Highlight:</h1>
      <Dropdown>
        <Dropdown.Toggle variant="" id="contestant-select-dropdown" className="custom-button min-w-[13vw] max-w-[50vw] min-h-[2.5rem]">
          <span className="truncate min-w-0 flex-1 text-left">{selected?.name.split(' ')[0] ?? "All Contestants"}</span>
        </Dropdown.Toggle>
        <Dropdown.Menu className="z-50 max-h-[50vh] overflow-y-auto">
          <Dropdown.Item onClick={() => onChange(null)} className="m-0">
            All Contestants
          </Dropdown.Item>
          {sortedContestants.map((contestant) => (
            <Dropdown.Item key={contestant.id} onClick={() => onChange(contestant.id)} className="m-0">
              {contestant.name.split(' ')[0]}
            </Dropdown.Item>
          ))}
        </Dropdown.Menu>
      </Dropdown>
    </div>
  );
};

export default ContestantSelect;
