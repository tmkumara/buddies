import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type AuthUser = {
  id: number;
  email: string;
  fullName?: string | null;
  enabled: boolean;
  roles: string[];
  permissions: string[];
};

export type AuthState = {
  accessToken: string | null;
  user: AuthUser | null;
  loading: boolean;
};

const persisted = localStorage.getItem('auth');
const initialState: AuthState = persisted
  ? JSON.parse(persisted)
  : {
      accessToken: null,
      user: null,
      loading: false,
    };

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials(state, action: PayloadAction<{ accessToken: string; user: AuthUser }>) {
      state.accessToken = action.payload.accessToken;
      state.user = action.payload.user;
      localStorage.setItem('auth', JSON.stringify(state));
    },
    clearAuth(state) {
      state.accessToken = null;
      state.user = null;
      localStorage.removeItem('auth');
    },
    setUser(state, action: PayloadAction<AuthUser>) {
      state.user = action.payload;
      localStorage.setItem('auth', JSON.stringify(state));
    },
    setLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload;
    },
  },
});

export const { setCredentials, clearAuth, setUser, setLoading } = authSlice.actions;
export default authSlice.reducer;
