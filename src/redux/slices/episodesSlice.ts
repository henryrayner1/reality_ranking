import { createSlice, createEntityAdapter } from "@reduxjs/toolkit";
import { type Episode } from "../../utils/Constants";

const episodesAdapter = createEntityAdapter<Episode>();

const episodeSlice = createSlice({
    name: 'episodes',
    initialState: episodesAdapter.getInitialState(),
    reducers: {
        upsertEpisode: episodesAdapter.upsertOne,
        // Called only from fetchAllShows with the full authoritative list from
        // the API — setAll (not upsertMany) so episodes deleted server-side are
        // pruned from the (redux-persist-backed) client cache instead of
        // lingering forever.
        upsertEpisodes: episodesAdapter.setAll,
        removeEpisode: episodesAdapter.removeOne,
        removeEpisodes: episodesAdapter.removeMany,
    }
});
export const { upsertEpisode, upsertEpisodes, removeEpisode, removeEpisodes } = episodeSlice.actions;
export const episodesSelectors = episodesAdapter.getSelectors((state: any) => state.episodes || episodesAdapter.getInitialState());
export default episodeSlice.reducer;
