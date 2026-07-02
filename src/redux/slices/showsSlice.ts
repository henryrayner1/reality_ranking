import { createSlice, createEntityAdapter, type PayloadAction } from "@reduxjs/toolkit";
import { type Show } from "../../utils/Constants";

const showsAdapter = createEntityAdapter<Show>();

type ShowsState = ReturnType<typeof showsAdapter.getInitialState> & {
  currShow: Show | null;
};

const initialState: ShowsState = showsAdapter.getInitialState({
  currShow: null,
});

const showsSlice = createSlice({
  name: "shows",
  initialState,
  reducers: {
    upsertShow: showsAdapter.upsertOne,
    upsertShows: showsAdapter.upsertMany,
    removeShow: showsAdapter.removeOne,
    setCurrShow: (state, action: PayloadAction<Show | null>) => {
      state.currShow = action.payload;
    },
  },
});

export const { upsertShow, upsertShows, removeShow, setCurrShow } = showsSlice.actions;
export const showsSelectors = showsAdapter.getSelectors(
  (state: any) => state.shows ?? initialState
);
export default showsSlice.reducer;