import { createAsyncThunk } from "@reduxjs/toolkit";
import { upsertShows } from "../redux/slices/showsSlice";
import { upsertSeasons } from "../redux/slices/seasonsSlice";
import { upsertEpisodes } from "../redux/slices/episodesSlice";
import type { Contestant, Elimination, EliminationEntry, Episode, Ranking, Season, Show } from "./Constants";
import { backendUrl } from "./apiBase";

const apiFetch = (path: string, init?: RequestInit) => fetch(backendUrl(path), init);

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
  const createData = await createRes.json();
  localStorage.setItem('user', JSON.stringify(createData));
  return createData;
};

export const checkUserLoggedIn = () => {
  const userStr = localStorage.getItem('user');
  if (userStr) {
    try {
      const user = JSON.parse(userStr);
      if (user && user.id && user.email) {
        return user;
      }
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
    body: JSON.stringify({ episodeId: elimination.episodeId, contestantId: elimination.contestantId, eliminationType: elimination.eliminationType }),
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

export const getEliminationOrder = (eliminations: Elimination[], episodeNumber: number) => {
  const eliminatedContestants: string[] = [];
  console.log(episodeNumber, eliminations);
  for (const episodeData of eliminations) {
    if (episodeData.episodeNumber <= episodeNumber) {
      eliminatedContestants.push(...episodeData.contestantIds);
    }
  }
  return eliminatedContestants;
}

export interface RankingColumnEntry {
  contestantId: string;
  eliminated: boolean;
}

// Builds one ordered column of a past-rankings table for a single episode's ranking:
// non-eliminated contestants first (by submitted position), then eliminated
// contestants appended in elimination order. Row index == rank position.
// All contestant references (ranking entries and elimination ids) are real
// Contestant.id values; resolve to a display name at render time.
export const buildPastRankingColumn = (
  ranking: Ranking,
  episodeNumber: number,
  eliminations: Elimination[]
): RankingColumnEntry[] => {
  // Contestants eliminated in a *prior* episode are grouped at the bottom, in
  // elimination order, out of their submitted rank position. A contestant
  // eliminated during episode N itself stays at their submitted position for
  // N's own column (just flagged eliminated so it renders locked) and only
  // drops into the bottom group starting episode N+1 — otherwise every
  // contestant ranked below them would shift up a row the week they're
  // eliminated. Matches Episode.tsx's EpisodeComponent, which draws the same
  // prior-vs-this-episode distinction.
  const priorElimIds = getEliminationOrder(eliminations, episodeNumber - 1).reverse();
  const elimIdsThroughThisEpisode = getEliminationOrder(eliminations, episodeNumber).reverse();
  const thisEpisodeElimIds = elimIdsThroughThisEpisode.filter((id) => !priorElimIds.includes(id));

  const active = ranking.contestantIds
    .filter((contestantId) => !priorElimIds.includes(contestantId))
    .map((contestantId) => ({ contestantId, eliminated: thisEpisodeElimIds.includes(contestantId) }));

  const eliminated = priorElimIds.map((id) => ({ contestantId: id, eliminated: true }));

  return [...active, ...eliminated];
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
    body: JSON.stringify({ name: contestant.name, seasonId: contestant.seasonId, photoUrl: contestant.photoUrl }),
  });
  if (!contestantRes.ok) {
    const msg = await contestantRes.text().catch(() => 'Failed to add contestant');
    throw new Error(msg);
  }
  const contestantData = await contestantRes.json();
  return contestantData;
};

export const updateContestantPhoto = async (contestantId: string, photoUrl: string) => {
  const updateRes = await apiFetch(`/api/contestants/${contestantId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ photoUrl }),
  });
  if (!updateRes.ok) {
    const msg = await updateRes.text().catch(() => 'Failed to update contestant photo');
    throw new Error(msg);
  }
  const updateData = await updateRes.json();
  return updateData;
};

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
