import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import type { RootState } from "../../store";

export type AuthUser = {
  id: number | null;
  email: string;
  roles: string[];
};

type LoginResponse = {
  token: string;
  user: AuthUser;
};

type AuthState = {
  token: string | null;
  user: AuthUser | null;
  status: "idle" | "loading" | "failed";
  error: string | null;
  checking: boolean;
};

const tokenStorageKey = "auth_token";

const initialState: AuthState = {
  token: typeof window !== "undefined" ? localStorage.getItem(tokenStorageKey) : null,
  user: null,
  status: "idle",
  error: null,
  checking: false,
};

export const login = createAsyncThunk<LoginResponse, { email: string; password: string }, { rejectValue: string }>(
  "auth/login",
  async (payload, { rejectWithValue }) => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errorBody = await safeJson(res);
      return rejectWithValue(errorBody?.message ?? `Login failed (${res.status})`);
    }

    const data = (await res.json()) as LoginResponse;
    if (typeof window !== "undefined") {
      localStorage.setItem(tokenStorageKey, data.token);
    }
    return data;
  }
);

export const fetchMe = createAsyncThunk<AuthUser, void, { state: RootState; rejectValue: string }>(
  "auth/fetchMe",
  async (_arg, { getState, rejectWithValue }) => {
    const token = getState().auth.token;
    if (!token) {
      return rejectWithValue("Missing token");
    }

    const res = await fetch("/api/auth/me", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      const errorBody = await safeJson(res);
      return rejectWithValue(errorBody?.message ?? `Failed to load profile (${res.status})`);
    }

    const data = (await res.json()) as { user: AuthUser };
    return data.user;
  }
);

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    logout: (state) => {
      state.token = null;
      state.user = null;
      state.status = "idle";
      state.error = null;
      if (typeof window !== "undefined") {
        localStorage.removeItem(tokenStorageKey);
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.status = "idle";
        state.token = action.payload.token;
        state.user = action.payload.user;
      })
      .addCase(login.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload ?? "Login failed";
      })
      .addCase(fetchMe.pending, (state) => {
        state.checking = true;
        state.error = null;
      })
      .addCase(fetchMe.fulfilled, (state, action) => {
        state.checking = false;
        state.user = action.payload;
      })
      .addCase(fetchMe.rejected, (state, action) => {
        state.checking = false;
        state.error = action.payload ?? "Unable to load profile";
      });
  },
});

async function safeJson(res: Response): Promise<{ message?: string } | null> {
  try {
    return (await res.json()) as { message?: string };
  } catch {
    return null;
  }
}

export const { logout } = authSlice.actions;

export default authSlice.reducer;
