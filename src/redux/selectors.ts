import { createSelector } from '@reduxjs/toolkit';
import { showsSelectors } from './slices/showsSlice';
import { seasonsSelectors } from './slices/seasonsSlice';
import { weeksSelectors } from './slices/weeksSlice';
import { type RootState } from './store';
import type { Season, Week } from '../utils/Constants';

// Create a single stable selector that takes showId as part of the input
export const selectShowWithSeasonsAndWeeks = createSelector(
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
        return weeksSelectors.selectAll(state);
      } catch (error) {
        console.error("Error in weeksSelectors.selectAll:", error);
        return [];
      }
    },
    (state: RootState, showId: string) => showId,
  ],
  (show, seasons, weeks, showId) => {
    if (!show || !showId) return null;

    const weeksBySeason: Record<string, Week[]> = {};
    for (const w of weeks || []) {
      if (w && w.seasonId) {
        (weeksBySeason[w.seasonId] ||= []).push(w);
      }
    }

    const seasonsForShow = (seasons ?? [])
      .filter(se => se && String(se.showId) === String(showId))
      .map(se => ({ ...se, weeks: weeksBySeason[se.id] ?? [] }))
      .sort((a, b) => a.seasonNumber - b.seasonNumber);

    return { ...show, seasons: seasonsForShow};
  }
);