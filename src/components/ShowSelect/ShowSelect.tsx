import './ShowSelect.css';
import { Dropdown } from 'react-bootstrap';
import type { Show } from '../../utils/Constants';

interface ShowSelectProps {
    shows: Show[];
    currShowId?: string;
    onSelectShow: (showId: string) => void;
}

const ShowSelect = ({ shows, currShowId, onSelectShow }: ShowSelectProps) => {
    const currShow = shows?.find((show) => show.id === currShowId);

    return (
        <div className="w-full">
            <div className="flex my-3 items-center justify-center">
                <h1 className="font-bold text-gray-800 pr-2 whitespace-nowrap">Current Show:</h1>
                <Dropdown>
                <Dropdown.Toggle variant="" id="dropdown-basic" className="custom-button min-w-[20vw] max-w-[20vw] min-h-[2.5rem] flex items-center gap-2">
                    <span className="truncate min-w-0 flex-1 text-left">{currShow?.name || "Select a Show"}</span>
                </Dropdown.Toggle>
                <Dropdown.Menu className="max-w-[80vw]">
                    {shows?.map((show) => (
                    <Dropdown.Item key={show.id} onClick={() => onSelectShow(show.id)} className="m-0 truncate" title={show.name}>{show.name}</Dropdown.Item>
                    ))}
                </Dropdown.Menu>
                </Dropdown>
            </div>
        </div>
    );
};

export default ShowSelect;
