import { createAsyncThunk } from "@reduxjs/toolkit";
import { upsertShows } from "../redux/slices/showsSlice";
import { upsertSeasons } from "../redux/slices/seasonsSlice";
import { upsertWeeks } from "../redux/slices/weeksSlice";
import type { Contestant, Elimination, EliminationEntry, Season, Show, Week } from "./Constants";

export const getUserId = async (email: string) => {
  const userRes = await fetch(`/api/users/lookup?email=${email}`);
  if (!userRes.ok) throw new Error('Failed to fetch userId');
  const userData = await userRes.json();
  const userId = userData.id;
  return userId;
};

export const userLogin = async (email: string, password: string) => {
  const loginRes = await fetch('/api/users/login', {
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
  const createRes = await fetch('/api/users/create', {
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

export const getWeeks = async () => {
  const weeksRes = await fetch('/api/weeks/');
  if (!weeksRes.ok) throw new Error('Failed to fetch weeks');
  const weeksData = await weeksRes.json();
  weeksData.sort((a: any, b: any) => a.weekNumber - b.weekNumber);
  return weeksData;
};

export const getWeeksByShow = async (showId: string) => {
  const weeksRes = await fetch(`/api/weeks/byShow/${showId}`);
  if (!weeksRes.ok) throw new Error('Failed to fetch weeks');
  const weeksData = await weeksRes.json();
  return weeksData;
};

export const addWeek = async ( week: Partial<Week>) => {
  const createRes = await fetch('/api/weeks/create', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ seasonId: week.seasonId, airDate: week.airDate }),
  });
  if (!createRes.ok) {
    const msg = await createRes.text().catch(() => 'Failed to create week');
    throw new Error(msg);
  }
  const createData = await createRes.json();
  return createData;
}

export const deleteWeek = async (weekId: string) => {
  const deleteRes = await fetch(`/api/weeks/delete/${weekId}`, {
    method: 'DELETE',
  });
  if (!deleteRes.ok) {
    const msg = await deleteRes.text().catch(() => 'Failed to delete week');
    throw new Error(msg);
  }
  const deleteData = await deleteRes.json();
  return deleteData;
};

export const getUserRankings = async (userId: string) => {
  const rankingsRes = await fetch(`/api/rankings/userRankings?userId=${userId}`);
  if (!rankingsRes.ok) throw new Error('Failed to fetch user rankings');
  const rankingsData = await rankingsRes.json();
  return rankingsData;
};

export const submitRanking = async (userId: string, weekId: string, rankings: string[], type: string) => {
  const submitRes = await fetch('/api/rankings/create', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ userId, weekId, rankings, type }),
  });
  if (!submitRes.ok) {
    const msg = await submitRes.text().catch(() => 'Failed to submit rankings');
    throw new Error(msg);
  }
  const submitData = await submitRes.json();
  return submitData;
};

export const submitRankings = async (rankingsList: { userId: string; weekId: string; rankings: {}; type: string }[]) => {
  
  const submitRes = await fetch('/api/rankings/createMany', {
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
  const rankingRes = await fetch('/api/rankings/fetchRanking', {
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
  const elimRes = await fetch('/api/eliminations/add', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ weekId: elimination.weekId, contestantId: elimination.contestantId, eliminationType: elimination.eliminationType }),
  });
  if (!elimRes.ok) {
    const msg = await elimRes.text().catch(() => 'Failed to add elimination');
    throw new Error(msg);
  }
  const elimData = await elimRes.json();
  return elimData;
};

export const deleteElimination = async (eliminationId: string) => {
  const deleteRes = await fetch(`/api/eliminations/delete/${eliminationId}`, {
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
  const elimRes = await fetch('/api/eliminations/');
  if (!elimRes.ok) throw new Error('Failed to fetch eliminations');
  const elimData = await elimRes.json();
  return elimData;
};

export const getEliminationsBySeason = async (seasonId: string) => {
  const elimRes = await fetch(`/api/eliminations/bySeason/${seasonId}`);
  if (!elimRes.ok) throw new Error('Failed to fetch eliminations');
  const elimData = await elimRes.json();
  return elimData;
};

export const addManyEliminations = async (eliminationsList: { weekId: string; contestantIds: string[] }[]) => {
  const elimRes = await fetch('/api/eliminations/addMany', {
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

export const getContestantEliminationStatus = (eliminations: any, contestantId: string, weekNumber: number) => {
  for (const weekId in eliminations) {
    const weekData = eliminations[weekId];
    if (weekData.weekNumber <= weekNumber && weekData.contestant_ids.includes(contestantId)) {
      return true;
    }
  }
  return false;
};

export const getEliminationOrder = (eliminations: Elimination[], weekNumber: number) => {
  const eliminatedContestants: string[] = [];
  console.log(weekNumber, eliminations);
  for (const weekData of eliminations) {
    if (weekData.weekNumber <= weekNumber) {
      eliminatedContestants.push(...weekData.contestantIds);
    }
  }
  return eliminatedContestants;
}

export const addShow = async (show: Partial<Show>) => {
  const response = await fetch('/api/shows/add', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ 
      name: show.name, 
      network: show.network,
      currSeason: show.currSeason
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
  const response = await fetch(`/api/shows/delete/${showId}`, {
    method: 'DELETE',
  });
  
  if (!response.ok) {
    throw new Error(`Failed to delete show: ${response.status}`);
  }
  
  const deleteRes = await response.json();
  return deleteRes;
};

export const addSeason = async (season: Partial<Season>) => {
  const seasonRes = await fetch('/api/shows/addSeason', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ showId: season.showId, seasonNumber: season.seasonNumber, cast: season.contestants, isCurrent: season.isCurrent}),
  });
  if (!seasonRes.ok) {
    const msg = await seasonRes.text().catch(() => 'Failed to add season');
    throw new Error(msg);
  }
  const seasonData = await seasonRes.json();
  return seasonData;
};

export const deleteSeason = async (seasonId: string) => {
  const deleteRes = await fetch(`/api/shows/deleteSeason/${seasonId}`, {
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
  const showsRes = await fetch('/api/shows/');
  if (!showsRes.ok) throw new Error('Failed to fetch shows');
  const showsData = await showsRes.json();
  return showsData;
};

export const getShow = async (showId: string) => {
  const showRes = await fetch(`/api/shows/${showId}`);
  if (!showRes.ok) throw new Error('Failed to fetch show');
  const showData = await showRes.json();
  return showData;
};

export const getContestantsBySeason = async (seasonId: string) => {
  const contestantsRes = await fetch(`/api/contestants/bySeason/${seasonId}`);
  if (!contestantsRes.ok) throw new Error('Failed to fetch contestants');
  const contestantsData = await contestantsRes.json();
  return contestantsData;
};

export const getContestantsByShow = async (showId: string) => {
  const contestantsRes = await fetch(`/api/contestants/byShow/${showId}`);
  if (!contestantsRes.ok) throw new Error('Failed to fetch contestants');
  const contestantsData = await contestantsRes.json();
  return contestantsData;
};

export const getSeasons = async (showId: string) => {
  const seasonsRes = await fetch(`/api/shows/${showId}`);
  if (!seasonsRes.ok) throw new Error('Failed to fetch seasons');
  const seasonsData = await seasonsRes.json();
  return seasonsData.seasons;
};

export const getCurrentSeason = async (showId: string) => {
  const seasonRes = await fetch(`/api/shows/current/${showId}`);
  if (!seasonRes.ok) throw new Error('Failed to fetch current season');
  const seasonData = await seasonRes.json();
  return seasonData;
};

export const changeCurrentSeason = async (showId: string, newSeasonId: string) => {
  const changeRes = await fetch('/api/shows/changeCurrentSeason', {
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
  const contestantRes = await fetch('/api/contestants/add', {
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

export const deleteContestant = async (contestantId: string) => {
  const deleteRes = await fetch(`/api/contestants/delete/${contestantId}`, {
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
  const deleteRes = await fetch(`/api/eliminations/deleteMany`, {
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
