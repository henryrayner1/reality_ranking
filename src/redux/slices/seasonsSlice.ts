import { createSlice, createEntityAdapter } from "@reduxjs/toolkit";
import { type Season } from "../../utils/Constants";

const seasonsAdapter = createEntityAdapter<Season>();

const seasonsSlice = createSlice({
    name: 'seasons',
    initialState: seasonsAdapter.getInitialState(),
    reducers: {
        upsertSeason: seasonsAdapter.upsertOne,
        // Called only from fetchAllShows with the full authoritative list —
        // setAll so seasons removed server-side get pruned from the client
        // cache rather than persisting as ghosts (see weeksSlice.upsertWeeks).
        upsertSeasons: seasonsAdapter.setAll,
        removeSeason: seasonsAdapter.removeOne,
        removeSeasons: seasonsAdapter.removeMany,

    }
});
export const { upsertSeason, upsertSeasons, removeSeason, removeSeasons } = seasonsSlice.actions;
export const seasonsSelectors = seasonsAdapter.getSelectors((state: any) => state.seasons || seasonsAdapter.getInitialState());
export default seasonsSlice.reducer;