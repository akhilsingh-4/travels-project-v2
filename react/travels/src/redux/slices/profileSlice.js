import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../api/api";

export const fetchProfile = createAsyncThunk("profile/fetchProfile", async () => {
  const res = await api.get("/api/profile/");
  return res.data;
});

export const updateProfile = createAsyncThunk("profile/updateProfile", async (formData) => {
  await api.put("/api/profile/", formData);
  const res = await api.get("/api/profile/");
  return res.data;
});

const profileSlice = createSlice({
  name: "profile",
  initialState: {
    user: null,
    loading: false,
  },

  reducers: {
    setProfileUser: (state, action) => {
      state.user = action.payload;
    },
  },

  extraReducers: (builder) => {
    builder
      .addCase(fetchProfile.pending, (state) => {
        state.loading = true;
      })

      .addCase(fetchProfile.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
      })

      .addCase(updateProfile.fulfilled, (state, action) => {
        state.user = action.payload;
      });
  },
});

export const { setProfileUser } = profileSlice.actions;
export default profileSlice.reducer;
