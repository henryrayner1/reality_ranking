import { createSlice } from "@reduxjs/toolkit";

interface User {
  id: string;
  email: string;
  isAdmin: boolean;
}

const initialState = {
    value: null as User | null,
}

const userSlice = createSlice({
    name: 'user',
    initialState: initialState,
    reducers: {
        setUser: (state, action) => {
            state.value = action.payload;
        }
    }
});

export const { setUser } = userSlice.actions;
export default userSlice.reducer;