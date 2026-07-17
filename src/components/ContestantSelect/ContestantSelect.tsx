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
        <Dropdown.Toggle variant="" id="contestant-select-dropdown" className="custom-button min-w-[10vw] min-h-[2.5rem]">
          {selected?.name ?? "All Contestants"}
        </Dropdown.Toggle>
        <Dropdown.Menu>
          <Dropdown.Item onClick={() => onChange(null)} className="m-0">
            All Contestants
          </Dropdown.Item>
          {sortedContestants.map((contestant) => (
            <Dropdown.Item key={contestant.id} onClick={() => onChange(contestant.id)} className="m-0">
              {contestant.name}
            </Dropdown.Item>
          ))}
        </Dropdown.Menu>
      </Dropdown>
    </div>
  );
};

export default ContestantSelect;
