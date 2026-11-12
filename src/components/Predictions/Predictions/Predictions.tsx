import { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import ShowSelect from "../../ShowSelect/ShowSelect";
import EliminationPicker from "../EliminationPicker/EliminationPicker";
import FinalePredictor from "../FinalePredictor/FinalePredictor";
import PredictionHistory from "../PredictionHistory/PredictionHistory";
import { predictionsQueryKey, usePredictions, useShows, useShowTree } from "../../../hooks/queries";
import { slugifyShowName } from "../../../utils/slug";
import { savePrediction } from "../../../utils/util";
import { formatDuration, isSeasonEnded } from "../../../utils/episodeRankability";
import {
  getAiredEpisodes,
  getNextPredictableEpisode,
  getRemainingContestantIds,
  getSeasonEliminations,
} from "../../../utils/predictions";
import type { Prediction } from "../../../utils/Constants";
import type { RootState } from "../../../redux/store";
import "./Predictions.css";

// Re-renders every 30s so the "locks in" countdown moves and the open
// episode switches over once it airs.
const useNow = (intervalMs = 30_000) => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
};

const Predictions = () => {
  const { showSlug } = useParams<{ showSlug: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useSelector((state: RootState) => state.user.value);
  const now = useNow();

  const { data: shows = [] } = useShows();
  const showId = shows.find((s) => slugifyShowName(s.name) === showSlug)?.id;
  const showTree = useShowTree(showId);
  const currShow = showTree.data;
  // Derived in render (current season, else the latest) so switching shows
  // never renders a frame with the previous show's season.
  const currSeason =
    currShow?.seasons.find((s) => s.seasonNumber === currShow.currSeason) ??
    currShow?.seasons[currShow.seasons.length - 1] ??
    null;

  const predictionsQuery = usePredictions(currSeason?.id, user?.id);
  const predictionsByEpisode = useMemo(
    () => new Map<string, Prediction>((predictionsQuery.data ?? []).map((p) => [p.episodeId, p])),
    [predictionsQuery.data]
  );

  const save = useMutation({
    mutationFn: ({ episodeId, contestantIds }: { episodeId: string; contestantIds: string[] }) =>
      savePrediction(episodeId, contestantIds),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: predictionsQueryKey(currSeason?.id, user?.id) }),
  });

  const isDaily = currShow?.rankingMode === "DAILY";
  const nextEpisode = currSeason && !isDaily ? getNextPredictableEpisode(currSeason, currShow?.rankingMode, now) : null;
  const remaining = useMemo(() => {
    if (!currSeason || !nextEpisode) return [];
    const ids = new Set(
      getRemainingContestantIds(
        currSeason.contestants.map((c) => c.id),
        getSeasonEliminations(currSeason),
        nextEpisode.episodeNumber
      )
    );
    return currSeason.contestants.filter((c) => ids.has(c.id));
  }, [currSeason, nextEpisode]);
  const saved = nextEpisode ? predictionsByEpisode.get(nextEpisode.id) : undefined;

  const topBar = (
    <div className="predictions-top-bar">
      <ShowSelect
        shows={shows}
        currShowId={showId}
        onSelectShow={(id) => {
          const show = shows.find((s) => s.id === id);
          if (show) navigate(`/predictions/${slugifyShowName(show.name)}`);
        }}
      />
      {currShow && currSeason && <h2 className="predictions-season">Season {currSeason.seasonNumber}</h2>}
    </div>
  );

  const renderNext = () => {
    if (!currSeason) return <p className="prediction-placeholder">This show has no seasons yet.</p>;
    if (currSeason.contestants.length === 0)
      return <p className="prediction-placeholder">No contestants have been added to this season yet.</p>;
    if (isSeasonEnded(currSeason, now)) return <p className="prediction-placeholder">This season has ended. Predictions are closed.</p>;
    if (!nextEpisode)
      return <p className="prediction-placeholder">The next episode hasn't been scheduled yet. Check back once it has an air date.</p>;

    const airMs = new Date(nextEpisode.airDate as string).getTime();
    const heading = (
      <div className="prediction-card-header">
        <h2>{nextEpisode.isFinale ? "Finale" : `Episode ${nextEpisode.episodeNumber}`}</h2>
        <span className="prediction-locks">Locks in {formatDuration(airMs - now)}</span>
      </div>
    );

    if (!user) {
      return <>{heading}<p className="prediction-placeholder">Log in to make predictions.</p></>;
    }
    if (predictionsQuery.isLoading) {
      return <>{heading}<p className="prediction-placeholder">Loading...</p></>;
    }

    const shared = {
      contestants: remaining,
      season: currSeason,
      show: currShow ?? undefined,
      hasSaved: !!saved,
      isSaving: save.isPending,
      error: save.isError ? (save.error as Error).message : null,
      onSubmit: (contestantIds: string[]) => save.mutate({ episodeId: nextEpisode.id, contestantIds }),
    };
    // Keyed on the saved prediction so a successful save re-seeds the form.
    const key = `${nextEpisode.id}:${saved?.updatedAt ?? "new"}`;
    return (
      <>
        {heading}
        {nextEpisode.isFinale
          ? <FinalePredictor key={key} {...shared} initialOrder={saved?.contestantIds ?? []} />
          : <EliminationPicker key={key} {...shared} count={nextEpisode.eliminationCount ?? 1} initialPicks={saved?.contestantIds ?? []} />}
      </>
    );
  };

  let body;
  if (!showSlug || (!showId && shows.length > 0)) {
    body = <p className="prediction-placeholder">Please select a show.</p>;
  } else if (showTree.isLoading || !currShow) {
    body = <p className="prediction-placeholder">Loading...</p>;
  } else if (isDaily) {
    body = <p className="prediction-placeholder">Predictions aren't available for daily shows yet.</p>;
  } else {
    body = (
      <>
        <section className="prediction-card">{renderNext()}</section>
        {currSeason && (
          <section className="prediction-card prediction-history-card">
            <h2 className="prediction-section-title">Past episodes</h2>
            <PredictionHistory
              episodes={getAiredEpisodes(currSeason, now)}
              predictionsByEpisode={predictionsByEpisode}
              season={currSeason}
              show={currShow ?? undefined}
              loggedIn={!!user}
            />
          </section>
        )}
      </>
    );
  }

  return (
    <div>
      <h1 className="font-bold text-gray-800 page-header">Predictions</h1>
      <main className="predictions-main">
        {topBar}
        {body}
      </main>
    </div>
  );
};

export default Predictions;
