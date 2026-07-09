import { createAsyncThunk } from "@reduxjs/toolkit";
import { removeShow, setCurrShow, upsertShow, upsertShows } from "../slices/showsSlice";
import { removeSeason, removeSeasons, upsertSeasons } from "../slices/seasonsSlice";
import { removeEpisodes, upsertEpisodes } from "../slices/episodesSlice";
import type { RootState } from "../store";
import { backendUrl } from "../../utils/apiBase";

export const fetchAllShows = createAsyncThunk(
  'shows/fetchAll',
  async (_, {dispatch}) => {
    const response = await fetch(backendUrl('/api/shows/'));
    const shows = await response.json();

    const flatShows = [];
    const flatSeasons = [];
    const flatEpisodes = [];

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
        season.episodes?.forEach((episode: any) => {
          flatEpisodes.push({
            id: episode.id,
            episodeNumber: episode.episodeNumber,
            seasonId: season.id,
            airDate: episode.airDate,
            eliminations: episode.eliminations
          });
        });
      });
    });

    dispatch(upsertShows(flatShows));
    dispatch(upsertSeasons(flatSeasons));
    dispatch(upsertEpisodes(flatEpisodes));

    return flatShows;
  }
);

export const deleteShowAndCleanup = createAsyncThunk(
  'shows/deleteAndCleanup',
  async (showId: string, { dispatch, getState }) => {
    const state = getState() as RootState;
    const allSeasons = Object.values(state.seasons.entities);
    const allEpisodes = Object.values(state.episodes.entities);
    const seasonIdsToRemove = allSeasons
      .filter((season) => season?.showId === showId)
      .map((season) => season!.id);
    const episodeIdsToRemove = allEpisodes
      .filter((episode) => episode && seasonIdsToRemove.includes(episode.seasonId))
      .map((episode) => episode!.id);

    dispatch(removeShow(showId));
    if (seasonIdsToRemove.length > 0) {
      dispatch(removeSeasons(seasonIdsToRemove));
    }
    if (episodeIdsToRemove.length > 0) {
      dispatch(removeEpisodes(episodeIdsToRemove));
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
    const episodeIdsToRemove = Object.values(stateAfterDelete.episodes.entities)
      .filter((episode) => episode?.seasonId === seasonId)
      .map((episode) => episode!.id);
    if (episodeIdsToRemove.length > 0) {
      dispatch(removeEpisodes(episodeIdsToRemove));
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
