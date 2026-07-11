import './Admin.css';
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AdminShows from "./AdminShows";
import AdminSeasons from "./AdminSeasons";
import AdminContestants from "./AdminContestants";
import AdminEpisodes from "./AdminEpisodes";
import AdminEliminations from "./AdminEliminations";
import { useShows } from "../../hooks/queries";
import { slugifyShowName } from "../../utils/slug";

const Admin = () => {
  type Section = 'shows' | 'seasons' | 'contestants' | 'episodes' | 'eliminations';

  const { showSlug } = useParams<{ showSlug: string }>();
  const navigate = useNavigate();
  const { data: shows = [] } = useShows();
  const showId = shows.find(s => slugifyShowName(s.name) === showSlug)?.id;

  const NAV: { id: Section; label: string }[] = [
    { id: 'shows', label: 'Shows' },
    { id: 'seasons', label: 'Seasons' },
    { id: 'contestants', label: 'Contestants' },
    { id: 'episodes', label: 'Episodes' },
    { id: 'eliminations', label: 'Eliminations' },
  ];

  const PAGES: Record<Section, React.ReactNode> = {
    shows: <AdminShows />,
    seasons: <AdminSeasons showId={showId} />,
    contestants: <AdminContestants showId={showId} />,
    episodes: <AdminEpisodes showId={showId} />,
    eliminations: <AdminEliminations showId={showId} />,
  };

  const [active, setActive] = useState<Section>('shows');

  // The Shows tab manages the show list itself, not any one show, so its
  // URL shouldn't carry a show slug. Every other tab is scoped to a show —
  // switching into one of them without a show already selected in the URL
  // defaults to the first loaded show.
  const handleNavClick = (section: Section) => {
    setActive(section);
    if (section === 'shows') {
      if (showSlug) navigate('/admin');
    } else if (!showId && shows.length > 0) {
      navigate(`/admin/${slugifyShowName(shows[0].name)}`);
    }
  };

  return(<div className="admin-layout" style={{ background: 'var(--color-background-tertiary,#f5f5f3)' }}>
      <div className="admin-sidebar" style={{ background: 'var(--color-background-primary,#fff)', borderRight: '0.5px solid var(--color-border-tertiary,#e5e5e5)' }}>
        <div className="admin-sidebar-label" style={{ color: 'var(--color-text-secondary,#888)' }}>Admin</div>
        {NAV.map(item => (
          <button
            key={item.id}
            onClick={() => handleNavClick(item.id)}
            className="admin-nav-button"
            style={{
              color: active === item.id ? 'var(--color-text-primary,#111)' : 'var(--color-text-secondary,#888)',
              borderLeft: `2px solid ${active === item.id ? '#7F77DD' : 'transparent'}`,
              background: active === item.id ? 'var(--color-background-secondary,#f5f5f3)' : 'transparent',
              fontWeight: active === item.id ? 500 : 400,
            }}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div className="admin-content">
        {PAGES[active]}
      </div>
    </div>);
};

export default Admin;
