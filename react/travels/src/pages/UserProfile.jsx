import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchProfile, updateProfile } from "../redux/slices/profileSlice";
import { toast } from "react-toastify";
import { resolveMediaUrl } from "../utils/url";

const UserProfile = () => {

  const dispatch = useDispatch();
  const { user, loading } = useSelector((state) => state.profile);

  const [form, setForm] = useState({
    username: "",
    email: "",
    first_name: "",
    last_name: "",
    avatar: null,
    avatar_url: "",
  });

  useEffect(() => {
    dispatch(fetchProfile());
  }, [dispatch]);

  useEffect(() => {
    if (user) {
      setForm({
        username: user.username,
        email: user.email || "",
        first_name: user.first_name || "",
        last_name: user.last_name || "",
        avatar: null,
        avatar_url: resolveMediaUrl(user.avatar),
      });
    }
  }, [user]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image must be less than 2MB");
      return;
    }

    setForm((prev) => ({
      ...prev,
      avatar: file,
      avatar_url: URL.createObjectURL(file),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const formData = new FormData();
    formData.append("email", form.email);
    formData.append("first_name", form.first_name);
    formData.append("last_name", form.last_name);

    if (form.avatar) {
      formData.append("avatar", form.avatar);
    }

    const result = await dispatch(updateProfile(formData));

    if (updateProfile.fulfilled.match(result)) {
      toast.success("Profile updated successfully");
    } else {
      toast.error("Failed to update profile");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-slate-900 to-black text-white py-16 px-4">
      <div className="max-w-lg mx-auto">

        <div className="text-center mb-12">
          <div className="relative w-24 h-24 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-cyan-400 to-purple-600 overflow-hidden">

            {form.avatar_url ? (
              <img
                src={form.avatar_url}
                alt="avatar"
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-3xl flex items-center justify-center h-full">
                👤
              </span>
            )}

          </div>

          <h1 className="text-3xl font-bold text-cyan-300">
            Profile
          </h1>
        </div>

        {loading && (
          <div className="text-center py-4">
            Loading profile...
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">

          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
          />

          <input
            value={form.username}
            disabled
            className="w-full p-3 rounded bg-gray-800"
          />

          <input
            name="email"
            value={form.email}
            onChange={handleChange}
            placeholder="Email"
            className="w-full p-3 rounded bg-gray-800"
          />

          <input
            name="first_name"
            value={form.first_name}
            onChange={handleChange}
            placeholder="First Name"
            className="w-full p-3 rounded bg-gray-800"
          />

          <input
            name="last_name"
            value={form.last_name}
            onChange={handleChange}
            placeholder="Last Name"
            className="w-full p-3 rounded bg-gray-800"
          />

          <button
            type="submit"
            className="w-full p-3 bg-cyan-500 rounded"
          >
            Save Changes
          </button>

        </form>

      </div>
    </div>
  );
};

export default UserProfile;
