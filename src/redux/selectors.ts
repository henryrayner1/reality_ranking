import { createSelector } from '@reduxjs/toolkit';
import { showsSelectors } from './slices/showsSlice';
import { seasonsSelectors } from './slices/seasonsSlice';
import { episodesSelectors } from './slices/episodesSlice';
import { type RootState } from './store';
import type { Season, Episode } from '../utils/Constants';

// The explicitly-selected show, falling back to the first loaded show so
// pages default to something sensible before the user has picked one.
export const selectCurrShow = (state: RootState) =>
  state.shows.currShow ?? state.shows.entities[state.shows.ids[0]];

// Create a single stable selector that takes showId as part of the input
export const selectShowWithSeasonsAndEpisodes = createSelector(
  [
    (state: RootState, showId: string) => {
      if (!showId) return null;
      try {
        return showsSelectors.selectById(state, showId);
      } catch (error) {
        console.error("Error in showsSelectors.selectById:", error);
        return null;
      }
    },
    (state: RootState) => {
      try {
        return seasonsSelectors.selectAll(state);
      } catch (error) {
        console.error("Error in seasonsSelectors.selectAll:", error);
        return [];
      }
    },
    (state: RootState) => {
      try {
        return episodesSelectors.selectAll(state);
      } catch (error) {
        console.error("Error in episodesSelectors.selectAll:", error);
        return [];
      }
    },
    (state: RootState, showId: string) => showId,
  ],
  (show, seasons, episodes, showId) => {
    if (!show || !showId) return null;

    const episodesBySeason: Record<string, Episode[]> = {};
    for (const w of episodes || []) {
      if (w && w.seasonId) {
        (episodesBySeason[w.seasonId] ||= []).push(w);
      }
    }

    const seasonsForShow = (seasons ?? [])
      .filter(se => se && String(se.showId) === String(showId))
      .map(se => ({ ...se, episodes: episodesBySeason[se.id] ?? [] }))
      .sort((a, b) => a.seasonNumber - b.seasonNumber);

    return { ...show, seasons: seasonsForShow};
  }
);
