import './Admin.css';
import { useParams } from "react-router-dom";
import AdminShows from "../AdminShows/AdminShows";
import AdminSeasons from "../AdminSeasons/AdminSeasons";
import AdminContestants from "../AdminContestants/AdminContestants";
import AdminEpisodes from "../AdminEpisodes/AdminEpisodes";
import AdminEliminations from "../AdminEliminations/AdminEliminations";
import * as AdminUI from "../../../utils/AdminComponents";
import { useSeasons, useShows } from "../../../hooks/queries";
import { slugifyShowName } from "../../../utils/slug";
import type { Season } from "../../../utils/Constants";

const Admin = () => {
  const { showSlug, seasonNumber } = useParams<{ showSlug: string; seasonNumber: string }>();
  const { data: shows = [], isLoading } = useShows();
  const currShow = shows.find(s => slugifyShowName(s.name) === showSlug);
  const { data: seasons = [] } = useSeasons(currShow?.id);

  // Derived in the render body (not via effect/state) so switching shows
  // never renders a frame with the previous show's season. Falls back to
  // the show's current season, then to its highest-numbered one, when the
  // URL doesn't name a season (or names one that doesn't exist).
  const currSeason: Season | undefined =
    seasons.find(s => String(s.seasonNumber) === seasonNumber)
    ?? seasons.find(s => s.isCurrent || s.seasonNumber === currShow?.currSeason)
    ?? seasons.reduce((max: Season | undefined, s: Season) => (!max || s.seasonNumber > max.seasonNumber ? s : max), undefined);

  return (
    <div className="admin-page" style={{ background: 'var(--color-background-tertiary,#f5f5f3)' }}>
      <AdminUI.PageHeader title="Admin" subtitle="Select a show and season to edit its contestants, episodes and eliminations" />
      <div className="admin-picker-card">
        <AdminShows showId={currShow?.id} />
        {currShow && <AdminSeasons showId={currShow.id} seasonId={currSeason?.id} />}
      </div>

      {!isLoading && !currShow && <AdminUI.EmptyState message="Select or add a show to start editing." />}
      {currShow && !currSeason && <AdminUI.EmptyState message="Add a season to start editing." />}

      {currShow && currSeason && (
        <>
          <section className="admin-section">
            <h2 className="admin-section-title">Contestants</h2>
            <AdminContestants key={currSeason.id} showId={currShow.id} seasonId={currSeason.id} />
          </section>
          <section className="admin-section">
            <h2 className="admin-section-title">Episodes</h2>
            <AdminEpisodes key={currSeason.id} showId={currShow.id} seasonId={currSeason.id} />
          </section>
          <section className="admin-section">
            <h2 className="admin-section-title">Eliminations</h2>
            <AdminEliminations key={currSeason.id} showId={currShow.id} seasonId={currSeason.id} />
          </section>
        </>
      )}
    </div>
  );
};

export default Admin;
