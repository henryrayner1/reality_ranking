import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  getShows,
  getEliminations,
  getEliminationsBySeason,
  getUserRankings,
  getRankingsInsights,
} from "../utils/util";
import type { RankType, Season, Show } from "../utils/Constants";

// GET /api/shows/ returns the full nested tree in one call — every show with
// its seasons, each season's contestants and episodes, and each episode's
// eliminations. That's the single source of truth every hook below reads
// from (mirroring the old Redux fetchAllShows, which fetched this exact
// payload once and flattened it into three separate slices). Unlike the
// per-show GET /api/shows/:showId endpoint, this one actually includes
// contestants — don't switch these hooks to that endpoint without checking
// its response shape first.
export const showsQueryKey = () => ["shows"] as const;
export const eliminationsQueryKey = () => ["eliminations"] as const;
export const eliminationsBySeasonQueryKey = (seasonId?: string) =>
  ["eliminations", "bySeason", seasonId] as const;
export const userRankingsQueryKey = (userId?: string) => ["userRankings", userId] as const;

export const useShows = () =>
  useQuery({ queryKey: showsQueryKey(), queryFn: getShows });

const useShowById = (showId: string | undefined) => {
  const { data: shows = [], isLoading, isError } = useShows();
  const show = useMemo(() => shows.find((s: Show) => s.id === showId) ?? null, [shows, showId]);
  return { data: show, isLoading, isError };
};

export const useSeasons = (showId: string | undefined) => {
  const { data: show, isLoading, isError } = useShowById(showId);
  const data = useMemo(() => show?.seasons ?? [], [show]);
  return { data, isLoading, isError };
};

export const useEpisodesByShow = (showId: string | undefined) => {
  const { data: show, isLoading, isError } = useShowById(showId);
  const data = useMemo(
    () => (show?.seasons ?? []).flatMap((s: Season) => s.episodes ?? []),
    [show]
  );
  return { data, isLoading, isError };
};

export const useEliminations = (enabled = true) =>
  useQuery({ queryKey: eliminationsQueryKey(), queryFn: getEliminations, enabled });

export const useEliminationsBySeason = (seasonId: string | undefined) =>
  useQuery({
    queryKey: eliminationsBySeasonQueryKey(seasonId),
    queryFn: () => getEliminationsBySeason(seasonId as string),
    enabled: !!seasonId,
  });

export const useUserRankings = (userId: string | undefined) =>
  useQuery({
    queryKey: userRankingsQueryKey(userId),
    queryFn: () => getUserRankings(userId as string),
    enabled: !!userId,
  });

export const rankingsInsightsQueryKey = (seasonId: string | undefined, type: RankType) =>
  ["rankingsInsights", seasonId, type] as const;

export const useRankingsInsights = (seasonId: string | undefined, type: RankType) =>
  useQuery({
    queryKey: rankingsInsightsQueryKey(seasonId, type),
    queryFn: () => getRankingsInsights(seasonId as string, type),
    enabled: !!seasonId,
  });

export interface ShowTree extends Show {
  seasons: Season[];
}

// Direct replacement for the old selectShowWithSeasonsAndEpisodes Redux
// selector — the join it used to do by hand across three normalized caches
// is already done server-side in the /api/shows/ payload, so this just
// sorts the seasons.
export const useShowTree = (showId: string | undefined) => {
  const { data: show, isLoading, isError } = useShowById(showId);

  const data = useMemo<ShowTree | null>(() => {
    if (!show) return null;
    const seasons = [...(show.seasons ?? [])].sort(
      (a: Season, b: Season) => a.seasonNumber - b.seasonNumber
    );
    return { ...show, seasons };
  }, [show]);

  return { data, isLoading, isError };
};
