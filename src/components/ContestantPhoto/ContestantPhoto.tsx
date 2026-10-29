import { type Season, type Show } from '../../utils/Constants';
import { getContestantPhotoUrl, placementTier } from '../../utils/util';

interface ContestantPhotoProps {
  name: string;
  photoUrl?: string;
  season: Season;
  show?: Show | null;
  isEliminated?: boolean;
  // Final placement for a finalist (1 = winner): a medal-coloured ring, the
  // same colours as ContestantIcon's border (index.css).
  placement?: number | null;
  className?: string;
}

// Just the photo, for places that already show the contestant's name next to
// it (Insights' By Contestant view). ContestantIcon adds a first-name strip
// and drag handling for the ranking grids.
const ContestantPhoto = (props: ContestantPhotoProps) => {
  const classes = ['contestant-photo'];
  if (props.placement) classes.push('contestant-photo-placed', `placement-${placementTier(props.placement)}`);
  if (props.isEliminated) classes.push('contestant-photo-eliminated');
  if (props.className) classes.push(props.className);

  return (
    <img
      src={getContestantPhotoUrl(props.name, props.photoUrl, props.season, props.show)}
      alt={props.name}
      className={classes.join(' ')}
    />
  );
};

export default ContestantPhoto;
