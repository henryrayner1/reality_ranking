import './Admin.css';
import { useState } from "react";
import AdminShows from "./AdminShows";
import AdminSeasons from "./AdminSeasons";
import AdminContestants from "./AdminContestants";
import AdminWeeks from "./AdminWeeks";
import AdminEliminations from "./AdminEliminations";

const Admin = () => {
  type Section = 'shows' | 'seasons' | 'contestants' | 'weeks' | 'eliminations';

  const NAV: { id: Section; label: string }[] = [
    { id: 'shows', label: 'Shows' },
    { id: 'seasons', label: 'Seasons' },
    { id: 'contestants', label: 'Contestants' },
    { id: 'weeks', label: 'Weeks' },
    { id: 'eliminations', label: 'Eliminations' },
  ];

  const PAGES: Record<Section, React.ReactNode> = {
    shows: <AdminShows />,
    seasons: <AdminSeasons />,
    contestants: <AdminContestants />,
    weeks: <AdminWeeks />,
    eliminations: <AdminEliminations />,
  };

  const [active, setActive] = useState<Section>('shows');

  return(<div style={{ display: 'flex', height: '100vh', background: 'var(--color-background-tertiary,#f5f5f3)' }}>
      <div style={{ width: 220, minWidth: 220, background: 'var(--color-background-primary,#fff)', borderRight: '0.5px solid var(--color-border-tertiary,#e5e5e5)', display: 'flex', flexDirection: 'column', padding: '1.5rem 0' }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-secondary,#888)', padding: '0 1.25rem 1rem', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Admin</div>
        {NAV.map(item => (
          <button
            key={item.id}
            onClick={() => setActive(item.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '0.6rem 1.25rem',
              fontSize: 14,
              cursor: 'pointer',
              color: active === item.id ? 'var(--color-text-primary,#111)' : 'var(--color-text-secondary,#888)',
              borderLeft: `2px solid ${active === item.id ? '#7F77DD' : 'transparent'}`,
              background: active === item.id ? 'var(--color-background-secondary,#f5f5f3)' : 'transparent',
              fontWeight: active === item.id ? 500 : 400,
              width: '100%',
              textAlign: 'left',
              fontFamily: 'inherit',
              border: 'none',
            }}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '2rem' }}>
        {PAGES[active]}
      </div>
    </div>);
  // const [currShow, setCurrShow] = useState<Show | null>(null);

  // const currShowTree = useAppSelector(state => 
  //   selectShowWithSeasonsAndWeeks(state, currShow?.id || "")
  // );

  // const dispatch = useDispatch();

  // const [elimWeek, setElimWeek] = useState("");
  // const [elimContestant, setElimContestant] = useState("");

  // const [currSeason, setCurrSeason] = useState<Season | null>(null);

  // const [newContestantName, setNewContestantName] = useState("");

  // useEffect(() => {
  //   if (currShowTree && currShowTree.seasons) {
  //     const currentSeason = currShowTree.seasons.find((season: any) => season.is_current);
  //     const newSeason = currentSeason || null;
      
  //     setCurrSeason(newSeason);
  //   } else {
  //     setCurrSeason(null);
  //   }
  // },[currShow?.id, currShowTree]);


  // const handleAddWeek = async () => {
  //   const weekRes = await addWeek(currSeason?.weeks?.length + 1 || 1, currSeason.id);
  //   dispatch(upsertWeek(weekRes)); 
  // }

  // const handleDeleteWeek = async (id: string) => {
  //   await deleteWeek(id);
  //   dispatch(removeWeek(id));
  // }

  // const handleDeleteElim = async (week_id: string, eliminations:[]) => {
  //   const elimIds = eliminations.map((elim: any) => elim.id);
  //   await deleteManyEliminations(elimIds);
  //   dispatch(upsertWeek({
  //     ...currSeason?.weeks?.find(w => w.id === week_id),
  //     eliminations: []
  //   }));
  // }

  // const handleAddElimination = async (weekId:string, contestant: string) => {
  //   const contestant_id = currSeason.contestants.find((c: any) => c.name === contestant)?.id;
  //   const elimRes = await addElimination(weekId, contestant_id);
    
  //   // Update the specific week's eliminations array in Redux
  //   const weekToUpdate = currSeason?.weeks?.find(w => w.id === weekId);
  //   if (weekToUpdate) {
  //     const updatedWeek = {
  //       ...weekToUpdate,
  //       eliminations: [...(weekToUpdate.eliminations || []), elimRes]
  //     };
  //     dispatch(upsertWeek(updatedWeek));
  //   }
    
  //   // Update the local currSeason state as well
  //   setCurrSeason(prev => {
  //     if (!prev) return prev;
  //     return {
  //       ...prev,
  //       weeks: (prev.weeks || []).map((w: any) => 
  //         w.id === weekId 
  //           ? {
  //               ...w,
  //               eliminations: [...(w.eliminations || []), elimRes]
  //             }
  //           : w
  //       )
  //     };
  //   });
    
  //   setElimWeek("");
  //   setElimContestant("");
  // }
  // const handleAddShow = async (showName:string) => {
  //   try {
  //     const showRes = await addShow(showName);
  //     dispatch(upsertShow(showRes));
  //     setCurrShow(showRes);
  //   } 
  //   catch (error) {
  //     console.error("Error adding show:", error);
  //   }
  // }

  // const getEliminations = () => {
  //   const eliminationElements = [];
  //   currSeason?.weeks?.forEach((week: any) => {
  //     if(week.eliminations?.length > 0) {
  //       eliminationElements.push(
  //         <div className="w-1/5 items-right"><p className="x-button" onClick={() => handleDeleteElim(week.id, week.eliminations)}>X</p></div>,
  //         <p key={week.id} className="text-gray-800 font-semibold">
  //           Week {week.week_number}: 
  //         </p>,
  //         <p className="text-gray-800 font-semibold text-right">
  //           {week.eliminations?.map((elimination: any) => elimination.contestant?.name).join(", ")}
  //         </p>
  //       );
  //     }
  //   });
  //   return eliminationElements;
  // }

  // const seasonControls = <div className="mx-auto p-4 bg-white rounded shadow-md w-1/4 border-3 flex flex-col justify-center">
  //       <div className="px-4 flex flex-col justify-between gap-3 items-center">
  //         <h3 className="text-lg font-semibold">Contestants:</h3>
  //         <div className="border-2 min-h-48 overflow-y-auto min-w-[12rem] p-2 text-left">
  //           {currSeason?.contestants?.map((contestant: any) => (
  //             <p key={contestant.id} className="text-gray-800 font-semibold">{contestant.name}</p>
  //           ))}
  //         </div>
  //       </div>

  //       <div className="flex flex-col justify-center gap-3 items-center mt-2">
  //         {<input className="input-text admin-text" type="text" placeholder="Add Contestant" id="new-contestant-name" onChange={(e)=>setNewContestantName(e.target.value)} value={newContestantName}/>}
  //         <div
  //           className={`button text-sm w-3/4 py-0 ${newContestantName.trim() === "" ? "inactive-admin" : ""}`}
  //           onClick={async () => {
  //               if (!currSeason?.id) return;
  //               const contestantRes = await addContestant( newContestantName, currSeason.id);
  //               setCurrSeason({
  //                 ...currSeason,
  //                 contestants: [...(currSeason.contestants || []), contestantRes]
  //               });
  //               setNewContestantName("");
  //             }
  //           }
  //         >
  //           Add Contestant
  //         </div>
  //       </div>
  // </div>

  // const weekControls = <div className="mx-auto p-4 bg-white rounded shadow-md w-5/6 border-3 flex flex-col justify-between">
  //         <h3 className="text-lg font-semibold">Weeks:</h3>
  //         <div className="py-4 flex flex-col justify-between min-h-[17rem] items-center w-full">
  //           {currSeason?.weeks?.map((week) => (
  //             <div key={week.id} className="mb-2 flex justify-between w-full">
  //               <div className="w-1/5 items-right"><p className="x-button" onClick={() => handleDeleteWeek(week.id)}>X</p></div>
  //               <p className="text-gray-800 font-semibold w-1/2 text-center">
  //                 Week {week.week_number}:
  //               </p>
  //               <p className="text-gray-800 w-1/3 text-left">
  //                 &nbsp; {week.id}
  //               </p>
  //             </div>
  //           ))}
  //         </div>

  //         <div className="flex flex-col justify-center gap-3 items-center mt-2">
  //             <div
  //               className="button px-5"
  //               onClick={() => handleAddWeek()}
  //             >
  //               Add Week
  //             </div>
  //         </div>
  // </div>

  // const eliminationControls = <div className="mx-auto py-4 bg-white rounded shadow-md w-3/4 flex flex-col border-3 items-center flex flex-col justify-between">

  //         <h3 className="text-lg font-semibold">Eliminations:</h3>
  //         <div className="max-h-48 overflow-y-auto min-w-[20rem] grid grid-cols-3 min-h-[13rem] ">
  //           {getEliminations()}
  //         </div>
          
  //         <div className="flex flex-col justify-center gap-3 items-center mt-2">
  //         <div className="flex flex-col w-full p-0">
  //           <div className="mb-2 flex w-full justify-center">
  //               <p className="pr-2 text-gray-800 font-semibold text-right w-1/3">
  //                 Week:
  //               </p>
  //               <Dropdown>
  //                 <Dropdown.Toggle variant="" id="dropdown-basic" className="custom-button border p-0 m-0  min-w-[10rem]">{elimWeek ? `Week ${currSeason?.weeks?.find(week => week.id === elimWeek)?.week_number}` : "Select"}</Dropdown.Toggle>
  //                 <Dropdown.Menu className="">
  //                   <Dropdown.Item disabled className="m-0 p-0">--- Select Week ---</Dropdown.Item>
  //                   {currSeason?.weeks?.map((week) => (
  //                     <Dropdown.Item key={week.id} onClick={()=>(setElimWeek(week.id))} className="m-0">Week {week.week_number}</Dropdown.Item>
  //                   ))}
  //                 </Dropdown.Menu>  
  //               </Dropdown>
  //           </div>
  //           <div className="flex w-full justify-center">
  //             <p className="pr-2 text-gray-800 font-semibold text-right w-1/3">
  //               Contestant:
  //             </p>
  //             <Dropdown>
  //               <Dropdown.Toggle variant="" id="dropdown-basic" className="custom-button border p-0 m-0  min-w-[10rem]">{elimContestant.length > 0 ? elimContestant : "Select"}</Dropdown.Toggle>
  //               <Dropdown.Menu className="">
  //                 <Dropdown.Item disabled className="m-0 p-0">--- Select Contestant ---</Dropdown.Item>
  //                 {currSeason?.contestants?.map((contestant) => (
  //                   <Dropdown.Item key={contestant.name} onClick={()=>(setElimContestant(contestant.name))} className="m-0">{contestant.name}</Dropdown.Item>
  //                 ))}
  //               </Dropdown.Menu>
  //             </Dropdown>
  //           </div>
  //         </div>
  //         <div
  //           className="button text-sm px-2 py-0 w-[10rem] mt-2"
  //           onClick={() => handleAddElimination(elimWeek, elimContestant)}
  //         >
  //           Add Elimination
  //         </div>
  //         </div>
  //     </div>

  // return (
  //   <div className="page">
  //     <h1 className="font-bold text-gray-800 page-header">Admin Dashboard</h1>
  //     <ShowSelect 
  //       currShow={currShow} 
  //       setCurrShow={setCurrShow} 
  //       currSeason={currSeason} 
  //       setCurrSeason={setCurrSeason} 
  //       isAdmin={true} 
  //       changeCurrentSeason={changeCurrentSeason} 
  //       handleAddShow={handleAddShow}
  //       />
  //     <div className={`card-container w-full ${currShow?.id ? '' : 'inactive-admin'}`}>
  //       {seasonControls}
  //       {weekControls}
  //       {eliminationControls}
  //     </div>
  //   </div>
  // );
};

export default Admin;
