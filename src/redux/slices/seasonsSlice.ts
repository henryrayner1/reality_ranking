import { createSlice, createEntityAdapter } from "@reduxjs/toolkit";
import { type Season } from "../../utils/Constants";

const seasonsAdapter = createEntityAdapter<Season>();

const seasonsSlice = createSlice({
    name: 'seasons',
    initialState: seasonsAdapter.getInitialState(),
    reducers: {
        upsertSeason: seasonsAdapter.upsertOne,
        upsertSeasons: seasonsAdapter.upsertMany,
        removeSeason: seasonsAdapter.removeOne,
        removeSeasons: seasonsAdapter.removeMany,

    }
});
export const { upsertSeason, upsertSeasons, removeSeason, removeSeasons } = seasonsSlice.actions;
export const seasonsSelectors = seasonsAdapter.getSelectors((state: any) => state.seasons || seasonsAdapter.getInitialState());
export default seasonsSlice.reducer;