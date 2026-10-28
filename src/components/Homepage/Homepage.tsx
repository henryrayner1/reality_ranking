import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { useShows } from "../../hooks/queries";
import { slugifyShowName } from "../../utils/slug";
import type { Show } from "../../utils/Constants";
import { backendUrl } from "../../utils/apiBase";
import { groupShowsByAiring } from "../../utils/episodeRankability";
import PageLoading from "../PageLoading/PageLoading";
import TvStaticBackground from "../TvStaticBackground/TvStaticBackground";
import './Homepage.css';

const FALLBACK_GRADIENTS = [
  "linear-gradient(135deg, #7F77DD, #4f8cff)",
  "linear-gradient(135deg, #43A4D1, #2c6fa8)",
  "linear-gradient(135deg, #b06ab3, #4568dc)",
  "linear-gradient(135deg, #ff8a5c, #ff6a88)",
];

const fallbackGradientFor = (name: string) => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return FALLBACK_GRADIENTS[hash % FALLBACK_GRADIENTS.length];
};

const Homepage = (props: { openAuthModal: (isLogin?: boolean) => void }) => {
  const navigate = useNavigate();
  const { data: shows = [], isLoading } = useShows();
  const user = useSelector((state: any) => state.user.value);

  const goToShow = (show: Show) => {
    if (user) {
      navigate(`/ranking/${slugifyShowName(show.name)}`);
    } else {
      navigate(`/insights/${slugifyShowName(show.name)}`);
    }
  };

  if (isLoading) {
    return <PageLoading />;
  }

  const showGroups = groupShowsByAiring(shows);
  const cardIndex = new Map(showGroups.flatMap((g) => g.shows).map((show, i) => [show.id, i]));

  return (
    <div className="homepage">
      <section className="homepage-hero">
        <TvStaticBackground />
        <h1 className="homepage-hero-title">Reality Ranking</h1>
        <p className="homepage-hero-subtitle">
          Inspired by <a href="https://jokersupdates.com" target="_blank" rel="noopener noreferrer">Joker's Updates</a>' online Big Brother user survey rankings, this application allows you to rank contestants on your favorite reality shows as they air.
        </p>
        {!user && (
          <div className="homepage-hero-actions">
            <button className="homepage-btn homepage-btn-primary" onClick={() => props.openAuthModal(true)}>
              Log in
            </button>
            <button className="homepage-btn homepage-btn-secondary" onClick={() => props.openAuthModal(false)}>
              Create account
            </button>
          </div>
        )}
      </section>

      <section className="homepage-shows-section">
        <h2>{!user ? `Select a show to view insights on its user rankings.` : `Select a show to start ranking.`}</h2>
        {shows.length === 0 ? (
          <p className="homepage-empty-state">No shows have been added yet.</p>
        ) : (
          showGroups.map((group) => (
            <div key={group.title} className="homepage-show-group">
              <h3 className="homepage-section-heading">{group.title}</h3>
              <div className="shows-grid">
                {group.shows.map((show) => {
                  const logo = show.logoUrl ? backendUrl(show.logoUrl) : undefined;
                  return (
                    <div
                      key={show.id}
                      className="show-card"
                      role="button"
                      tabIndex={0}
                      // Staggered across both groups, so the cards keep fading
                      // in one after another from the top of the page.
                      style={{ animationDelay: `${cardIndex.get(show.id)! * 200}ms` }}
                      onClick={() => goToShow(show)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") goToShow(show);
                      }}
                    >
                      <div className="show-card-media">
                        {logo ? (
                          <img src={logo} alt={show.name} className="show-image" />
                        ) : (
                          <div
                            className="show-image-fallback"
                            style={{ background: fallbackGradientFor(show.name) }}
                          >
                            {show.name.charAt(0)}
                          </div>
                        )}
                      </div>
                      <div className="show-card-overlay">
                        <h3 className="show-card-title">{show.name}</h3>
                        {show.network && <p className="show-card-meta">{show.network}</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </section>
    </div>
  );
};

export default Homepage;
