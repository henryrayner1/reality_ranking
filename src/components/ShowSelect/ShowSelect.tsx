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
            <div className="labeled-select flex my-3 items-center justify-center">
                <h1 className="labeled-select-label font-bold text-gray-800 pr-2 whitespace-nowrap">Show:</h1>
                <Dropdown>
                <Dropdown.Toggle variant="" id="dropdown-basic" className="custom-button !h-auto min-w-[20vw] max-w-full sm:max-w-[50vw] min-h-[2.5rem] flex items-center gap-2">
                    {/* Long names wrap rather than truncate (the button grows past
                        .custom-button's fixed height) so the full name is always visible. */}
                    <span className="min-w-0 flex-1 text-left whitespace-normal break-words">{currShow?.name || "Select a Show"}</span>
                </Dropdown.Toggle>
                <Dropdown.Menu className="max-w-[80vw] z-50">
                    {shows?.map((show) => (
                    <Dropdown.Item key={show.id} onClick={() => onSelectShow(show.id)} className="m-0 !whitespace-normal" title={show.name}>{show.name}</Dropdown.Item>
                    ))}
                </Dropdown.Menu>
                </Dropdown>
            </div>
        </div>
    );
};

export default ShowSelect;
