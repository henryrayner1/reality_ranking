import { createAsyncThunk } from "@reduxjs/toolkit";
import { removeShow, setCurrShow, upsertShow, upsertShows } from "../slices/showsSlice";
import { removeSeason, removeSeasons, upsertSeasons } from "../slices/seasonsSlice";
import { removeWeeks, upsertWeeks } from "../slices/weeksSlice";
import type { RootState } from "../store";

export const fetchAllShows = createAsyncThunk(
  'shows/fetchAll',
  async (_, {dispatch}) => {
    const response = await fetch('/api/shows/');
    const shows = await response.json();

    const flatShows = [];
    const flatSeasons = [];
    const flatWeeks = [];

    shows.forEach((show: any) => {
      flatShows.push({
        id: show.id,
        name: show.name,
        currSeason: show.currSeason,
        network: show.network,
      });
      show.seasons?.forEach((season: any) => {
        flatSeasons.push({
          id: season.id,
          showId: season.showId,
          seasonNumber: season.seasonNumber,
          isCurrent: season.isCurrent,
          contestants: season.contestants
        });
        season.weeks?.forEach((week: any) => {
          flatWeeks.push({
            id: week.id,
            weekNumber: week.weekNumber,
            seasonId: season.id,
            eliminations: week.eliminations
          });
        });
      });
    });

    dispatch(upsertShows(flatShows));
    dispatch(upsertSeasons(flatSeasons));
    dispatch(upsertWeeks(flatWeeks));
    
    return flatShows;
  }
);

export const deleteShowAndCleanup = createAsyncThunk(
  'shows/deleteAndCleanup',
  async (showId: string, { dispatch, getState }) => {
    const state = getState() as RootState;
    const allSeasons = Object.values(state.seasons.entities);
    const allWeeks = Object.values(state.weeks.entities);
    const seasonIdsToRemove = allSeasons
      .filter((season) => season?.showId === showId)
      .map((season) => season!.id);
    const weekIdsToRemove = allWeeks
      .filter((week) => week && seasonIdsToRemove.includes(week.seasonId))
      .map((week) => week!.id);

    dispatch(removeShow(showId));
    if (seasonIdsToRemove.length > 0) {
      dispatch(removeSeasons(seasonIdsToRemove));
    }
    if (weekIdsToRemove.length > 0) {
      dispatch(removeWeeks(weekIdsToRemove));
    }

    if (state.shows.currShow?.id === showId) {
      dispatch(setCurrShow(null));
    }

    return showId;
  }
);

export const deleteSeasonAndCleanup = createAsyncThunk(
  'seasons/deleteAndCleanup',
  async (seasonId: string, { dispatch, getState }) => {
    const stateBeforeDelete = getState() as RootState;
    const seasonToRemove = stateBeforeDelete.seasons.entities[seasonId];

    dispatch(removeSeason(seasonId));

    const stateAfterDelete = getState() as RootState;
    const weekIdsToRemove = Object.values(stateAfterDelete.weeks.entities)
      .filter((week) => week?.seasonId === seasonId)
      .map((week) => week!.id);
    if (weekIdsToRemove.length > 0) {
      dispatch(removeWeeks(weekIdsToRemove));
    }

    if (seasonToRemove) {
      const show = stateAfterDelete.shows.entities[seasonToRemove.showId];
      if (show && show.currSeason === seasonToRemove.seasonNumber) {
        const remainingSeasonNumbers = Object.values(stateAfterDelete.seasons.entities)
          .filter((season) => season?.showId === seasonToRemove.showId && season.id !== seasonId)
          .map((season) => season!.seasonNumber);

        const nextCurrentSeason =
          remainingSeasonNumbers.length > 0 ? Math.max(...remainingSeasonNumbers) : 1;

        dispatch(
          upsertShow({
            ...show,
            currSeason: nextCurrentSeason,
          })
        );
      }
    }

    return seasonId;
  }
);