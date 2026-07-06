import { createSlice, createEntityAdapter } from "@reduxjs/toolkit";
import { type Week } from "../../utils/Constants";

const weeksAdapter = createEntityAdapter<Week>();

const weekSlice = createSlice({
    name: 'weeks',
    initialState: weeksAdapter.getInitialState(),
    reducers: {
        upsertWeek: weeksAdapter.upsertOne,
        // Called only from fetchAllShows with the full authoritative list from
        // the API — setAll (not upsertMany) so weeks deleted server-side are
        // pruned from the (redux-persist-backed) client cache instead of
        // lingering forever.
        upsertWeeks: weeksAdapter.setAll,
        removeWeek: weeksAdapter.removeOne,
        removeWeeks: weeksAdapter.removeMany,
    }
});
export const { upsertWeek, upsertWeeks, removeWeek, removeWeeks } = weekSlice.actions;
export const weeksSelectors = weeksAdapter.getSelectors((state: any) => state.weeks || weeksAdapter.getInitialState());
export default weekSlice.reducer;