import { createSlice } from "@reduxjs/toolkit";

interface Rankings {
  contestant_id: string;
  position: string;
}

const initialState = {
    value: null as { [weekId: string]: Rankings[] } | null,
}

const rankingsSlice = createSlice({
    name: 'activeRankings',
    initialState: initialState,
    reducers: {
        setRankings: (state, action) => {
            state.value = action.payload;
        }
    }
});

export const { setRankings } = rankingsSlice.actions;
export default rankingsSlice.reducer;