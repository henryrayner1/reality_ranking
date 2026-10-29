import React, { useLayoutEffect, useRef } from 'react';
import {useSortable} from '@dnd-kit/sortable';
import {CSS} from '@dnd-kit/utilities';
import { type Season, type Show } from '../../utils/Constants';
import { formatPlacement, getContestantPhotoUrl, getIconLabel, placementTier } from '../../utils/util';


interface IconProps {
    name: string;
    id: string;
    isActive?: boolean;
    isEliminated?: boolean;
    dimmed?: boolean;
    // Final placement for a finalist (1 = winner): adds a medal-coloured
    // border and a placement label (styles in index.css).
    placement?: number | null;
    // Still in the finale, whose result hasn't been logged yet.
    placementPending?: boolean;
    season: Season;
  show?: Show;
  photoUrl?: string;
}


const MIN_LABEL_SCALE = 0.7;

const ContestantIcon = (props:IconProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({id: props.id});

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    // boxShadow: '-2px 5px 10px blue',
  };
  
  // Every caller already passes the contestant's season (with its full
  // contestants[] roster), so the flag is looked up here by id rather than
  // threaded through each call site as another prop.
  const firstNameHasSpace = props.season.contestants?.find((c) => c.id === props.id)?.firstNameHasSpace;
  const uppercaseName = getIconLabel(props.name, firstNameHasSpace);

  const dragProps = props.isActive ? { ...attributes, ...listeners } : {};

  // A long first name (e.g. "GUILLERMO") can be wider than the icon, which
  // clips it. Shrink just that label's font (via --label-scale) until it
  // fits, no smaller than MIN_LABEL_SCALE of the normal size. Measured
  // through a ResizeObserver because the label has no width yet on first
  // layout in some grids, and again once web fonts have loaded, since the
  // fallback font measures differently.
  const labelRef = useRef<HTMLParagraphElement>(null);
  useLayoutEffect(() => {
    const label = labelRef.current;
    if (!label) return;
    let cancelled = false;
    const fit = () => {
      if (cancelled) return;
      label.style.removeProperty('--label-scale');
      if (label.clientWidth === 0 || label.scrollWidth <= label.clientWidth) return;
      const scale = Math.max((label.clientWidth / label.scrollWidth) * 0.97, MIN_LABEL_SCALE);
      label.style.setProperty('--label-scale', scale.toFixed(3));
    };
    fit();
    document.fonts?.ready.then(fit);
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(fit);
    observer?.observe(label);
    return () => {
      cancelled = true;
      observer?.disconnect();
    };
  }, [uppercaseName]);

  return (
    <div
      ref={setNodeRef}
      style={props.isActive ? style : {cursor: 'default'}}
      {...dragProps}
      className={`flex flex-col relative overflow-hidden contestant-icon${props.placement ? ` contestant-icon-placed placement-${placementTier(props.placement)}` : props.placementPending ? ' contestant-icon-pending' : ''}`}
    >
      <img
        src={getContestantPhotoUrl(props.name, props.photoUrl, props.season, props.show)}
        alt={props.name}
        className='mt-[-5px] mb-[5px]'
        style={{
          ...(props.isActive ? { touchAction: 'none' } : {}),
          ...(props.isEliminated ? { filter: 'grayscale(100%)', pointerEvents: 'none' } : {}),
          ...(props.dimmed ? { opacity: 0.25 } : {}),
        }}
      />
      {props.placement
        ? <p className="placement-label">{formatPlacement(props.placement)}</p>
        : props.placementPending ? <p className="placement-label">Pending</p> : null}
      <p
        ref={labelRef}
        className="bg-gray-300 font-black absolute w-full bottom-0 whitespace-nowrap"
        // The line height stays at the normal size's (0.6rem = 1.5 x 0.4rem), so a
        // shrunk label keeps the same grey strip height as every other icon,
        // with its smaller text centred in it.
        style={{ fontSize: 'calc(0.4rem * var(--label-scale, 1))', lineHeight: '0.6rem' }}
      >{uppercaseName}</p>
    </div>
  );
}

export default ContestantIcon;