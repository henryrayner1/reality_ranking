import survivorLogo from "../../assets/logos/survivorLogo.jpeg";
import bigBrotherLogo from "../../assets/logos/bigBrotherLogo.jpg";
import dwtsLogo from "../../assets/logos/dwtsLogo.jpg";
import dragRaceLogo from "../../assets/logos/dragRaceLogo.jpg";
import downUnderLogo from "../../assets/logos/downUnderLogo.jpg";
import cdrAllStarsLogo from "../../assets/logos/cdrAllStarsLogo.png"
import projectRunwayLogo from "../../assets/logos/projectRunwayLogo.jpeg"
import dwtsNextProLogo from "../../assets/logos/dwtsNextProLogo.png"
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { useShows } from "../../hooks/queries";
import { slugifyShowName } from "../../utils/slug";
import type { Show } from "../../utils/Constants";
import PageLoading from "../PageLoading/PageLoading";
import './Homepage.css';

// Keyed by lowercased show name so lookups aren't broken by casing
// differences between this list and however the name was typed in Admin.
const SHOW_LOGOS: Record<string, string> = {
  "survivor": survivorLogo,
  "big brother": bigBrotherLogo,
  "dancing with the stars": dwtsLogo,
  "rupaul's drag race": dragRaceLogo,
  "drag race down under vs the world": downUnderLogo,
  "canada's drag race: all stars": cdrAllStarsLogo,
  "project runway": projectRunwayLogo,
  "dancing with the stars: the next pro": dwtsNextProLogo
};

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

  return (
    <div className="homepage">
      <section className="homepage-hero">
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
          <div className="shows-grid">
            {shows.map((show, index) => {
              const logo = SHOW_LOGOS[show.name.toLowerCase()];
              return (
                <div
                  key={show.id}
                  className="show-card"
                  role="button"
                  tabIndex={0}
                  style={{ animationDelay: `${index * 200}ms` }}
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
        )}
      </section>
    </div>
  );
};

export default Homepage;
