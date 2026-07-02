import { createSlice, createEntityAdapter } from "@reduxjs/toolkit";
import { type Week } from "../../utils/Constants";

const weeksAdapter = createEntityAdapter<Week>();

const weekSlice = createSlice({
    name: 'weeks',
    initialState: weeksAdapter.getInitialState(),
    reducers: {
        upsertWeek: weeksAdapter.upsertOne,
        upsertWeeks: weeksAdapter.upsertMany,
        removeWeek: weeksAdapter.removeOne,
        removeWeeks: weeksAdapter.removeMany,
    }
});
export const { upsertWeek, upsertWeeks, removeWeek, removeWeeks } = weekSlice.actions;
export const weeksSelectors = weeksAdapter.getSelectors((state: any) => state.weeks || weeksAdapter.getInitialState());
export default weekSlice.reducer;