import React, { useEffect, useState } from 'react';
import './ShowSelect.css';
import { Dropdown } from 'react-bootstrap';
import { useAppDispatch, useAppSelector } from '../../redux/hooks';
import { setCurrShow, showsSelectors } from '../../redux/slices/showsSlice';
import AddShowModal from '../modals/AddShowModal';
import { selectShowWithSeasonsAndEpisodes } from '../../redux/selectors';
import { addSeason, changeCurrentSeason } from '../../utils/util';
import { upsertSeason } from '../../redux/slices/seasonsSlice';


interface ShowSelectProps {
    isAdmin?: boolean;
    currShow?: any;
    setCurrShow?: (show: any) => void;
    currSeason: any;
    setCurrSeason?: (season: any) => void;
    changeCurrentSeason?: (showId: string, seasonId: string) => Promise<any>;
    handleAddShow?: (showName: string) => Promise<void>;
    addSeason?: (showId: string, seasonNumber: number, contestants: string[]) => Promise<any>;
}

const ShowSelect = (props:ShowSelectProps) => {

    const shows = useAppSelector(showsSelectors.selectAll);
    const currShow = useAppSelector(state => state.shows.currShow) || props.currShow;
    const [addShowModalFlag, setAddShowModalFlag] = useState(false);

    const currShowTree = useAppSelector(state => 
    selectShowWithSeasonsAndEpisodes(state, currShow?.id || "")
    );

    const dispatch = useAppDispatch();

    useEffect(() => {
        if (props.currShow) {
            dispatch(setCurrShow(props.currShow) );
        }
    }, [props.currShow]);

    return (
        <div className="w-full">
            <div className="flex my-3 items-center justify-center">
                <h1 className="font-bold text-gray-800 pr-2 whitespace-nowrap">Current Show:</h1>
                <Dropdown>
                <Dropdown.Toggle variant="" id="dropdown-basic" className="custom-button min-w-[10vw] min-h-[2.5rem]">{currShow?.name || "Select a Show"}</Dropdown.Toggle>
                <Dropdown.Menu className="">
                    {shows?.map((show) => (
                    <Dropdown.Item key={show.name} onClick={() => {dispatch(setCurrShow(show))}} className="m-0">{show.name}</Dropdown.Item>
                    ))}
                    {/* <Dropdown.Item onClick={() => setAddShowModalFlag(true)} className="m-0 border-top">+ Add New Show</Dropdown.Item> */}
                </Dropdown.Menu>
                </Dropdown>
            </div>
            {/* <div className="w-1/2 flex justify-center items-center">
                {props.currShow && <h1 className="font-bold text-gray-800 pr-2">Active Season:</h1>}
                {props.isAdmin && <Dropdown>
                    <Dropdown.Toggle variant="" id="dropdown-basic" className="custom-button min-w-[15vw]">
                    {props.currSeason ? `Season ${props.currSeason.season_number}` : "Select Season"}
                    </Dropdown.Toggle>

                    <Dropdown.Menu className="">
                    {currShowTree?.seasons?.map((season: any) => (
                        <Dropdown.Item key={season.id} onClick={async () => {await props.changeCurrentSeason(props.currShow.id, season.id);props.setCurrSeason(season)}}>{`Season ${season.season_number}`}</Dropdown.Item>
                    ))}
                    {props.isAdmin && <Dropdown.Item onClick={async () => {
                        if (!props.currShow?.id) return;
                            const maxSeasonNumber = currShowTree?.seasons?.reduce((max: number, s: any) => Math.max(max, s?.season_number ?? 0), 0) ?? 0;
                            const seasonRes = await addSeason(props.currShow.id, maxSeasonNumber + 1, []);
                            dispatch(upsertSeason(seasonRes));
                            const updatedCurrRes = await changeCurrentSeason(props.currShow.id, seasonRes.id);
                            props.setCurrSeason(updatedCurrRes);}
                        }
                    >
                        + Add Season
                    </Dropdown.Item>}
                    </Dropdown.Menu>
                </Dropdown> 
                }
                {!props.isAdmin &&props.currSeason && <h1 className="font-bold text-gray-800 pr-2">Season {props.currSeason?.season_number}</h1>}
            </div> */}

            {props.isAdmin && addShowModalFlag && <AddShowModal displayFlag={addShowModalFlag} setDisplayFlag={setAddShowModalFlag} handleAddShow={props.handleAddShow}/>}
        </div>
    );
};

export default ShowSelect;
