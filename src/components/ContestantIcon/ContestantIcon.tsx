import React from 'react';
import {useSortable} from '@dnd-kit/sortable';
import {CSS} from '@dnd-kit/utilities';
import { type Season, type Show } from '../../utils/Constants';


interface IconProps {
    name: string;
    id: string;
    isActive?: boolean;
    isEliminated?: boolean;
    season: Season;
  show?: Show;
}


const ContestantIcon = (props:IconProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({id: props.id});

  const getImagePath = () => {
    const prefix = `/uploads/`;
    const showFolder = (props.show?.name)
      .trim()
      .toLowerCase()
      .replace(/['’]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    const seasonNumber = `season_${props.season.seasonNumber}`;
    const contestantName = `${props.name?.replace(/\s+/g, '_').replace(/['']/g, '').toLowerCase()}.png`;

    return `${prefix}${showFolder}/${seasonNumber}/contestants/${contestantName}`;
  }
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    // boxShadow: '-2px 5px 10px blue',
  };
  
  const uppercaseName = props.name.toUpperCase().split(' ')[0];

  const dragProps = props.isActive ? { ...attributes, ...listeners } : {};

  return (
    <div ref={setNodeRef} style={props.isActive ? style : {cursor: 'default'}} {...dragProps} className='flex flex-col relative overflow-hidden dancer-icon'>
      <img
        src={getImagePath()}
        alt={props.name}
        className='mt-[-5px] mb-[5px]'
        style={{
          touchAction: 'none',
          ...(props.isEliminated ? { filter: 'grayscale(100%)', pointerEvents: 'none' } : {}),
        }}
      />
      <p className="bg-gray-300 text-[0.4rem] font-black absolute w-full bottom-0">{uppercaseName}</p>
    </div>
  );
}

export default ContestantIcon;