import { Navigate } from "react-router-dom";
import { useShows } from "../hooks/queries";
import { slugifyShowName } from "../utils/slug";

// Reproduces the old selectCurrShow's "fall back to the first loaded show"
// behavior for routes hit without a :showSlug param (e.g. a bare /ranking link).
const DefaultShowRedirect = ({ basePath }: { basePath: string }) => {
  const { data: shows, isLoading } = useShows();

  if (isLoading) return null;
  if (!shows || shows.length === 0) {
    return <p className="page-empty-state">No shows have been added yet.</p>;
  }

  return <Navigate to={`${basePath}/${slugifyShowName(shows[0].name)}`} replace />;
};

export default DefaultShowRedirect;
