import { createSlice } from "@reduxjs/toolkit";
import type { AccountType } from "../../utils/Constants";
import { checkUserLoggedIn } from "../../utils/util";

interface User {
  id: string;
  email: string;
  accountType: AccountType;
}

// Restored synchronously (not in a useEffect) so `user` is already correct
// on the very first render. A direct/fresh load of a guarded route (e.g.
// /admin) evaluates its redirect on that first render — restoring
// asynchronously left a real window where `user` was still null, so the
// guard would redirect an already-logged-in admin away before their
// session had a chance to load.
const restoredUser = checkUserLoggedIn();

const initialState = {
    value: (restoredUser
      ? { id: restoredUser.id, email: restoredUser.email, accountType: restoredUser.accountType }
      : null) as User | null,
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