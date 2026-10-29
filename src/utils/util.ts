import type { Contestant, Elimination, EliminationEntry, Episode, InsightsResponse, Ranking, RankType, Season, Show } from "./Constants";
import { backendUrl } from "./apiBase";

// Every request carries the logged-in user's token (if any); the backend only
// requires it on admin routes, and ignores it everywhere else.
const apiFetch = (path: string, init?: RequestInit) => {
  const token = checkUserLoggedIn()?.token;
  if (!token) return fetch(backendUrl(path), init);
  const headers = new Headers(init?.headers);
  headers.set('Authorization', `Bearer ${token}`);
  return fetch(backendUrl(path), { ...init, headers });
};

export const getUserId = async (email: string) => {
  const userRes = await apiFetch(`/api/users/lookup?email=${email}`);
  if (!userRes.ok) throw new Error('Failed to fetch userId');
  const userData = await userRes.json();
  const userId = userData.id;
  return userId;
};

export const userLogin = async (email: string, password: string) => {
  const loginRes = await apiFetch('/api/users/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });
  if (loginRes.status === 404) { throw new Error('User not found'); }
  if (loginRes.status === 401) { throw new Error('Invalid password'); }
  if (!loginRes.ok) {
    const msg = await loginRes.text().catch(() => 'Login failed');
    throw new Error(msg);
  }

  const loginData = await loginRes.json();
  localStorage.setItem('user', JSON.stringify(loginData));
  return loginData;
};

export const userLogout = () => {
  localStorage.removeItem('user');
};

export const createUser = async (email: string, password: string) => {
  const createRes = await apiFetch('/api/users/create', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });
  if (!createRes.ok) {
    const body = await createRes.json().catch(() => null);
    throw new Error(body?.error ?? 'Account creation failed');
  }
  const createData = await createRes.json();
  localStorage.setItem('user', JSON.stringify(createData));
  return createData;
};

export const checkUserLoggedIn = () => {
  const userStr = localStorage.getItem('user');
  if (userStr) {
    try {
      const user = JSON.parse(userStr);
      // A session saved before login tokens existed has no token, and every
      // admin request would fail with it, so treat it as logged out.
      if (user && user.id && user.email && user.token) {
        return user;
      }
      localStorage.removeItem('user');
    } catch (e) {
      console.error('Failed to parse user from localStorage', e);
      return null;
    }
  }
  return null;
};

export const getEpisodes = async () => {
  const episodesRes = await apiFetch('/api/episodes/');
  if (!episodesRes.ok) throw new Error('Failed to fetch episodes');
  const episodesData = await episodesRes.json();
  episodesData.sort((a: any, b: any) => a.episodeNumber - b.episodeNumber);
  return episodesData;
};

export const getEpisodesByShow = async (showId: string) => {
  const episodesRes = await apiFetch(`/api/episodes/byShow/${showId}`);
  if (!episodesRes.ok) throw new Error('Failed to fetch episodes');
  const episodesData = await episodesRes.json();
  return episodesData;
};

export const addEpisode = async ( episode: Partial<Episode>) => {
  const createRes = await apiFetch('/api/episodes/create', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ seasonId: episode.seasonId, airDate: episode.airDate }),
  });
  if (!createRes.ok) {
    const msg = await createRes.text().catch(() => 'Failed to create episode');
    throw new Error(msg);
  }
  const createData = await createRes.json();
  return createData;
}

export const deleteEpisode = async (episodeId: string) => {
  const deleteRes = await apiFetch(`/api/episodes/delete/${episodeId}`, {
    method: 'DELETE',
  });
  if (!deleteRes.ok) {
    const msg = await deleteRes.text().catch(() => 'Failed to delete episode');
    throw new Error(msg);
  }
  const deleteData = await deleteRes.json();
  return deleteData;
};

export const setEpisodeFinale = async (episodeId: string, isFinale: boolean) => {
  const res = await apiFetch(`/api/episodes/${episodeId}/finale`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ isFinale }),
  });
  if (!res.ok) {
    const msg = await res.text().catch(() => 'Failed to update episode');
    throw new Error(msg);
  }
  return res.json();
};

export const getUserRankings = async (userId: string) => {
  const rankingsRes = await apiFetch(`/api/rankings/userRankings?userId=${userId}`);
  if (!rankingsRes.ok) throw new Error('Failed to fetch user rankings');
  const rankingsData = await rankingsRes.json();
  return rankingsData;
};

export const submitRanking = async (userId: string, episodeId: string, rankings: string[], type: string) => {
  const submitRes = await apiFetch('/api/rankings/create', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ userId, episodeId, rankings, type }),
  });
  if (!submitRes.ok) {
    const msg = await submitRes.text().catch(() => 'Failed to submit rankings');
    throw new Error(msg);
  }
  const submitData = await submitRes.json();
  return submitData;
};

export const submitRankings = async (rankingsList: { userId: string; episodeId: string; rankings: string[]; type: string }[]) => {
  
  const submitRes = await apiFetch('/api/rankings/createMany', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ rankingsList }),
  });
  if (!submitRes.ok) {
    const msg = await submitRes.text().catch(() => 'Failed to submit rankings');
    throw new Error(msg);
  }
  const submitData = await submitRes.json();
  return submitData;
};

export const getRanking = async (rankingId: string) => {
  const rankingRes = await apiFetch('/api/rankings/fetchRanking', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ ranking_id: rankingId }),
  });
  if (!rankingRes.ok) {
    const msg = await rankingRes.text().catch(() => 'Failed to fetch ranking');
    throw new Error(msg);
  }
  const rankingData = await rankingRes.json();
  return rankingData;
}

export const addElimination = async (elimination: Partial<EliminationEntry>) => {
  const elimRes = await apiFetch('/api/eliminations/add', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ episodeId: elimination.episodeId, contestantId: elimination.contestantId, eliminationType: elimination.eliminationType, placement: elimination.placement ?? null }),
  });
  if (!elimRes.ok) {
    const msg = await elimRes.text().catch(() => 'Failed to add elimination');
    throw new Error(msg);
  }
  const elimData = await elimRes.json();
  return elimData;
};

export const deleteElimination = async (eliminationId: string) => {
  const deleteRes = await apiFetch(`/api/eliminations/delete/${eliminationId}`, {
    method: 'DELETE',
  });
  if (!deleteRes.ok) {
    const msg = await deleteRes.text().catch(() => 'Failed to delete elimination');
    throw new Error(msg);
  }
  const deleteData = await deleteRes.json();
  return deleteData;
};

export const getEliminations = async () => {
  const elimRes = await apiFetch('/api/eliminations/');
  if (!elimRes.ok) throw new Error('Failed to fetch eliminations');
  const elimData = await elimRes.json();
  return elimData;
};

export const getEliminationsBySeason = async (seasonId: string) => {
  const elimRes = await apiFetch(`/api/eliminations/bySeason/${seasonId}`);
  if (!elimRes.ok) throw new Error('Failed to fetch eliminations');
  const elimData = await elimRes.json();
  return elimData;
};

export const getRankingsInsights = async (seasonId: string, type: string) => {
  const insightsRes = await apiFetch(`/api/rankings/insights/${seasonId}?type=${type}`);
  if (!insightsRes.ok) throw new Error('Failed to fetch rankings insights');
  const insightsData = await insightsRes.json();
  return insightsData;
};

export const addManyEliminations = async (eliminationsList: { episodeId: string; contestantIds: string[] }[]) => {
  const elimRes = await apiFetch('/api/eliminations/addMany', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ eliminationsList }),
  });
  if (!elimRes.ok) {
    const msg = await elimRes.text().catch(() => 'Failed to add eliminations');
    throw new Error(msg);
  }
  const elimData = await elimRes.json();
  return elimData;
};

export const getContestantEliminationStatus = (eliminations: any, contestantId: string, episodeNumber: number) => {
  for (const episodeId in eliminations) {
    const episodeData = eliminations[episodeId];
    if (episodeData.episodeNumber <= episodeNumber && episodeData.contestant_ids.includes(contestantId)) {
      return true;
    }
  }
  return false;
};

export const getEliminationOrder = (
  eliminations: Elimination[],
  episodeNumber: number,
  getContestantName: (contestantId: string) => string = () => ""
) => {
  // Deduped: a contestant appearing in more than one elimination record (e.g. a
  // duplicate admin entry) must only ever occupy one row in the ranking grid —
  // otherwise every later episode column drifts by however many times they're
  // double-counted.
  const eliminatedContestants: string[] = [];
  for (const episodeData of eliminations) {
    if (episodeData.episodeNumber <= episodeNumber) {
      // Both callers immediately .reverse() the full returned array to render
      // the eliminated bucket most-recent-elimination-first, which also flips
      // each same-episode tie group's internal order — sort descending here
      // so a double (or larger) elimination ends up ascending alphabetically
      // (A→Z, top-to-bottom) in the actual rendered bucket, matching the
      // tie-break convention used by the Insights table's elimination backfill
      // (InsightsRankingTable.tsx's getEliminationBackfillIds) instead of the
      // arbitrary order eliminations happen to be stored in the backend.
      const tiedContestantIds = [...episodeData.contestantIds].sort((a, b) =>
        getContestantName(b).localeCompare(getContestantName(a))
      );
      for (const contestantId of tiedContestantIds) {
        if (!eliminatedContestants.includes(contestantId)) {
          eliminatedContestants.push(contestantId);
        }
      }
    }
  }
  return eliminatedContestants;
}

// Final placements (contestantId -> 1 for the winner, 2, 3, ...) decided at or
// before the given episode, i.e. in the finale.
export const getPlacements = (eliminations: Elimination[], episodeNumber: number) => {
  const placements = new Map<string, number>();
  for (const episodeData of eliminations) {
    if (episodeData.episodeNumber > episodeNumber) continue;
    for (const [contestantId, placement] of Object.entries(episodeData.placements ?? {})) {
      placements.set(contestantId, placement);
    }
  }
  return placements;
};

// "Winner", "2nd", "3rd", "4th", ... ("11th"-"13th" included).
export const formatPlacement = (placement: number) => {
  if (placement === 1) return "Winner";
  const lastTwo = placement % 100;
  const suffix = lastTwo >= 11 && lastTwo <= 13 ? "th" : ({ 1: "st", 2: "nd", 3: "rd" } as Record<number, string>)[placement % 10] ?? "th";
  return `${placement}${suffix}`;
};

// Medal colours for 1st-3rd; every lower placement shares the purple accent.
export const placementTier = (placement: number) =>
  placement === 1 ? "gold" : placement === 2 ? "silver" : placement === 3 ? "bronze" : "other";

// Moves placed finalists to the top of a column, best placement first, and
// leaves everyone else in their existing order. Shared by the Ranking page
// (buildPastRankingColumn) and the Insights table.
export const placeFinalistsFirst = <T extends string | null>(
  ids: T[],
  placements: Map<string, number>,
  getContestantName: (contestantId: string) => string = () => ""
): T[] => {
  const placed = ids
    .filter((id): id is T & string => id !== null && placements.has(id))
    .sort((a, b) => (placements.get(a)! - placements.get(b)!) || getContestantName(a).localeCompare(getContestantName(b)));
  return [...placed, ...ids.filter((id) => id === null || !placements.has(id))];
};

export interface RankingColumnEntry {
  contestantId: string | null;
  eliminated: boolean;
  // Set for a finalist with a final placement: shown at the top of the
  // column with a medal border instead of greyed out with the eliminations.
  placement?: number;
}

// Builds one ordered column of a past-rankings table for a single episode's ranking:
// non-eliminated contestants first (by submitted position), then eliminated
// contestants appended in elimination order. Row index == rank position.
// All contestant references (ranking entries and elimination ids) are real
// Contestant.id values; resolve to a display name at render time.
export const buildPastRankingColumn = (
  ranking: Ranking,
  episodeNumber: number,
  eliminations: Elimination[],
  seasonContestantIds: string[] = [],
  eligibleContestantIds: string[] = seasonContestantIds,
  getContestantName: (contestantId: string) => string = () => ""
): RankingColumnEntry[] => {
  // Eliminations are immutable at the bottom of the column starting the same
  // episode/day a contestant is eliminated — matches Episode.tsx's
  // EpisodeComponent, which uses the same single threshold.
  const eliminatedIds = getEliminationOrder(eliminations, episodeNumber, getContestantName).reverse();

  const active = ranking.contestantIds
    .filter((contestantId) => !eliminatedIds.includes(contestantId))
    .map((contestantId) => ({ contestantId, eliminated: false }));

  // Unconditional over eliminatedIds (not filtered by ranking.contestantIds)
  // so a contestant eliminated this episode still renders even if the
  // ranking they were part of happens to be missing them for some
  // unrelated data reason.
  const eliminated = eliminatedIds.map((id) => ({ contestantId: id, eliminated: true }));

  // Some historical rankings are just missing a contestant altogether — not
  // because they were eliminated, but because they weren't included in that
  // particular submission for unrelated reasons. Anyone who was already on
  // the roster as of this episode (eligibleContestantIds — callers exclude
  // contestants added to the season after this episode happened) and isn't
  // otherwise accounted for still isn't eliminated as of this episode (we'd
  // have caught that above), so append them as active rather than dropping
  // them from the grid entirely. A contestant added after the fact is
  // deliberately left out of this step — they still get a blank slot via the
  // padding below, just not an active one.
  const stillUncoveredIds = new Set([
    ...active.map((entry) => entry.contestantId),
    ...eliminated.map((entry) => entry.contestantId),
  ]);
  const unaccountedFor = eligibleContestantIds
    .filter((id) => !stillUncoveredIds.has(id))
    .map((id) => ({ contestantId: id, eliminated: false }));

  // Finalists placed in the finale aren't eliminations: they go above
  // everyone else, ordered by placement, and render in colour.
  const placements = getPlacements(eliminations, episodeNumber);
  const placed = placeFinalistsFirst(eliminatedIds.filter((id) => placements.has(id)), placements, getContestantName)
    .map((id) => ({ contestantId: id, eliminated: false, placement: placements.get(id) }));
  const unplaced = (entries: RankingColumnEntry[]) =>
    entries.filter((entry) => entry.contestantId === null || !placements.has(entry.contestantId));

  const column: RankingColumnEntry[] = [...placed, ...unplaced(active), ...unplaced(eliminated), ...unplaced(unaccountedFor)];

  // Pad/truncate to exactly the season's row count (mirrors
  // InsightsRankingTable's buildRankColumn) so every column contributes the
  // same number of grid cells regardless of any remaining data quirks — a
  // mismatched count is what drifts every later column out of alignment
  // under grid-auto-flow: column.
  if (seasonContestantIds.length > 0) {
    while (column.length < seasonContestantIds.length) {
      column.push({ contestantId: null, eliminated: false });
    }
    column.length = seasonContestantIds.length;
  }

  return column;
};

// Builds an InsightsResponse-shaped object from only a single user's own
// submitted rankings (as opposed to /api/rankings/insights, which averages
// across every user in the season) so the shared ContestantTrendChart /
// InsightsRankingTable components can be fed a "my submissions only" view
// without needing to know the difference.
export const buildOwnInsights = (rankings: Ranking[], type: RankType, seasonId: string): InsightsResponse => {
  const episodes = rankings
    .filter((r) => r.episode?.episodeNumber != null)
    .map((r) => ({
      episodeId: r.episodeId,
      episodeNumber: r.episode!.episodeNumber,
      contestantAverages: r.contestantIds.map((contestantId, index) => ({
        contestantId,
        averagePosition: index + 1,
      })),
    }))
    .sort((a, b) => a.episodeNumber - b.episodeNumber);

  const positionsByContestant = new Map<string, number[]>();
  episodes.forEach((episode) =>
    episode.contestantAverages.forEach(({ contestantId, averagePosition }) => {
      const positions = positionsByContestant.get(contestantId) ?? [];
      positions.push(averagePosition);
      positionsByContestant.set(contestantId, positions);
    })
  );
  const overall = [...positionsByContestant.entries()].map(([contestantId, positions]) => ({
    contestantId,
    overallAveragePosition: positions.reduce((sum, p) => sum + p, 0) / positions.length,
  }));

  return { seasonId, type, episodes, overall };
};

export const addShow = async (show: Partial<Show>) => {
  const response = await apiFetch('/api/shows/add', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: show.name,
      network: show.network,
      currSeason: show.currSeason,
      rankingMode: show.rankingMode
     }),
  });

  if (!response.ok) {
    throw new Error(`Failed to add show: ${response.status}`);
  }

  const showRes = await response.json();

  const seasonRes = await addSeason({ showId: showRes.id, seasonNumber: showRes.currSeason, contestants: [], isCurrent: true });
  return showRes;
}

export const deleteShow = async (showId: string) => {
  const response = await apiFetch(`/api/shows/delete/${showId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error(`Failed to delete show: ${response.status}`);
  }

  const deleteRes = await response.json();
  return deleteRes;
};

export const updateShowRankingMode = async (showId: string, rankingMode: string) => {
  const response = await apiFetch('/api/shows/update', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ showId, rankingMode }),
  });

  if (!response.ok) {
    throw new Error(`Failed to update show: ${response.status}`);
  }

  return response.json();
};

// null removes the logo (the homepage card then shows a coloured letter tile).
export const updateShowLogo = async (showId: string, logoUrl: string | null) => {
  const response = await apiFetch('/api/shows/update', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ showId, logoUrl }),
  });

  if (!response.ok) {
    throw new Error(`Failed to update show: ${response.status}`);
  }

  return response.json();
};

// A contestant's photo URL: their stored photoUrl, else the old naming
// convention under /uploads/<show-slug>/season_<n>/contestants/.
export const getContestantPhotoUrl = (name: string, photoUrl: string | undefined, season: Season, show?: Show | null) => {
  if (photoUrl) {
    return backendUrl(photoUrl);
  }
  if (!show?.name) {
    return undefined;
  }
  const showFolder = show.name
    .trim()
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const contestantName = `${name.replace(/\s+/g, '_').replace(/['']/g, '').toLowerCase()}.png`;
  return backendUrl(`/uploads/${showFolder}/season_${season.seasonNumber}/contestants/${contestantName}`);
};

// Uploads a contestant photo to <show-slug>/season_<n>/contestants/ (on R2 in
// production, uploads/ locally) and returns its URL.
export const uploadContestantPhoto = async (image: File, showName: string, seasonNumber: number) => {
  const fd = new FormData();
  // Field order matters: multer only puts fields parsed before the file into
  // req.body.
  fd.append('showName', showName);
  fd.append('seasonNumber', String(seasonNumber));
  fd.append('category', 'contestants');
  fd.append('image', image);

  const response = await apiFetch('/api/images/upload', { method: 'POST', body: fd });
  if (!response.ok) {
    throw new Error(`Failed to upload image: ${response.status}`);
  }
  const data = await response.json();
  // The upload's filename is derived from the contestant's name, so a
  // replacement photo lands at the exact same path as the old one. The ?v=
  // suffix gives it a new URL so <img> tags don't keep showing the
  // browser-cached old image.
  return `${data.file as string}?v=${Date.now()}`;
};

// Uploads a show's logo to <show-slug>/logo/ (on R2 in production, uploads/
// locally) and returns its URL.
export const uploadShowLogo = async (file: File, showName: string) => {
  const ext = (file.name.match(/\.[a-z0-9]+$/i)?.[0] ?? '.png').toLowerCase();
  const fd = new FormData();
  // Field order matters: multer only puts fields parsed before the file into
  // req.body.
  fd.append('showName', showName);
  fd.append('category', 'logo');
  fd.append('image', new File([file], `logo${ext}`, { type: file.type }));

  const response = await apiFetch('/api/images/upload', { method: 'POST', body: fd });
  if (!response.ok) {
    throw new Error(`Failed to upload logo: ${response.status}`);
  }
  const data = await response.json();
  // Every logo for a show is saved as logo.<ext>, so a replacement usually
  // lands at the same path as the old one. The ?v= suffix gives it a new URL
  // so browsers don't keep showing the cached old image.
  return `${data.file as string}?v=${Date.now()}`;
};

export const addSeason = async (season: Partial<Season>) => {
  const seasonRes = await apiFetch('/api/shows/addSeason', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ showId: season.showId, seasonNumber: season.seasonNumber, cast: season.contestants, isCurrent: season.isCurrent, premiereDate: season.premiereDate}),
  });
  if (!seasonRes.ok) {
    const msg = await seasonRes.text().catch(() => 'Failed to add season');
    throw new Error(msg);
  }
  const seasonData = await seasonRes.json();
  return seasonData;
};

export const updateSeasonPremiereDate = async (seasonId: string, premiereDate: string | null) => {
  const response = await apiFetch('/api/shows/updateSeason', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ seasonId, premiereDate }),
  });

  if (!response.ok) {
    throw new Error(`Failed to update season: ${response.status}`);
  }

  return response.json();
};

export const updateSeasonEndDate = async (seasonId: string, endDate: string | null) => {
  const response = await apiFetch('/api/shows/updateSeason', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ seasonId, endDate }),
  });

  if (!response.ok) {
    throw new Error(`Failed to update season end date: ${response.status}`);
  }

  return response.json();
};

export const updateSeasonStartDate = async (seasonId: string, startDate: string | null) => {
  const response = await apiFetch('/api/shows/updateSeason', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ seasonId, startDate }),
  });

  if (!response.ok) {
    throw new Error(`Failed to update season start date: ${response.status}`);
  }

  return response.json();
};

export const deleteSeason = async (seasonId: string) => {
  const deleteRes = await apiFetch(`/api/shows/deleteSeason/${seasonId}`, {
    method: 'DELETE',
  });
  if (!deleteRes.ok) {
    const msg = await deleteRes.text().catch(() => 'Failed to delete season');
    throw new Error(msg);
  }
  const deleteData = await deleteRes.json();
  return deleteData;
};

export const getShows = async () => {
  const showsRes = await apiFetch('/api/shows/');
  if (!showsRes.ok) throw new Error('Failed to fetch shows');
  const showsData = await showsRes.json();
  return showsData;
};

export const getShow = async (showId: string) => {
  const showRes = await apiFetch(`/api/shows/${showId}`);
  if (!showRes.ok) throw new Error('Failed to fetch show');
  const showData = await showRes.json();
  return showData;
};

export const getContestantsBySeason = async (seasonId: string) => {
  const contestantsRes = await apiFetch(`/api/contestants/bySeason/${seasonId}`);
  if (!contestantsRes.ok) throw new Error('Failed to fetch contestants');
  const contestantsData = await contestantsRes.json();
  return contestantsData;
};

export const getContestantsByShow = async (showId: string) => {
  const contestantsRes = await apiFetch(`/api/contestants/byShow/${showId}`);
  if (!contestantsRes.ok) throw new Error('Failed to fetch contestants');
  const contestantsData = await contestantsRes.json();
  return contestantsData;
};

export const getSeasons = async (showId: string) => {
  const seasonsRes = await apiFetch(`/api/shows/${showId}`);
  if (!seasonsRes.ok) throw new Error('Failed to fetch seasons');
  const seasonsData = await seasonsRes.json();
  return seasonsData.seasons;
};

export const getCurrentSeason = async (showId: string) => {
  const seasonRes = await apiFetch(`/api/shows/current/${showId}`);
  if (!seasonRes.ok) throw new Error('Failed to fetch current season');
  const seasonData = await seasonRes.json();
  return seasonData;
};

export const changeCurrentSeason = async (showId: string, newSeasonId: string) => {
  const changeRes = await apiFetch('/api/shows/changeCurrentSeason', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ showId, newSeasonId }),
  });
  if (!changeRes.ok) {
    const msg = await changeRes.text().catch(() => 'Failed to change current season');
    throw new Error(msg);
  }
  const changeData = await changeRes.json();
  return changeData;
};

export const addContestant = async (contestant: Partial<Contestant>) => {
  const contestantRes = await apiFetch('/api/contestants/add', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name: contestant.name, seasonId: contestant.seasonId, photoUrl: contestant.photoUrl, firstNameHasSpace: contestant.firstNameHasSpace }),
  });
  if (!contestantRes.ok) {
    const msg = await contestantRes.text().catch(() => 'Failed to add contestant');
    throw new Error(msg);
  }
  const contestantData = await contestantRes.json();
  return contestantData;
};

export const updateContestant = async (contestantId: string, changes: { name?: string; photoUrl?: string; firstNameHasSpace?: boolean }) => {
  const updateRes = await apiFetch(`/api/contestants/${contestantId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(changes),
  });
  if (!updateRes.ok) {
    const msg = await updateRes.text().catch(() => 'Failed to update contestant');
    throw new Error(msg);
  }
  const updateData = await updateRes.json();
  return updateData;
};

// Label shown on a contestant's icon: their first name, which is the first
// word of their full name, or the first two words when the admin has marked
// the first name as containing a space (e.g. "Thien An Nguyen" → "THIEN AN").
export const getIconLabel = (name: string, firstNameHasSpace?: boolean) =>
  name.trim().toUpperCase().split(/\s+/).slice(0, firstNameHasSpace ? 2 : 1).join(' ');

export const deleteContestant = async (contestantId: string) => {
  const deleteRes = await apiFetch(`/api/contestants/delete/${contestantId}`, {
    method: 'DELETE',
  });
  if (!deleteRes.ok) {
    const msg = await deleteRes.text().catch(() => 'Failed to delete contestant');
    throw new Error(msg);
  }
  const deleteData = await deleteRes.json();
  return deleteData;
};

export const deleteManyEliminations = async (eliminations:any[]) => {
  const deleteRes = await apiFetch(`/api/eliminations/deleteMany`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(eliminations),
  });
  if (!deleteRes.ok) {
    const msg = await deleteRes.text().catch(() => 'Failed to delete eliminations');
    throw new Error(msg);
  }
  const deleteData = await deleteRes.json();
  return deleteData;
};
