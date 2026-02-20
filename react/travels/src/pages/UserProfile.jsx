import React, { useEffect, useState } from "react";
import api from "../api/api";
import { toast } from "react-toastify";

const UserProfile = () => {
  const [form, setForm] = useState({
    username: "",
    email: "",
    first_name: "",
    last_name: "",
    avatar: null,
    avatar_url: "",
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      try {
        const res = await api.get("/api/profile/");
        setForm({
          username: res.data.username,
          email: res.data.email || "",
          first_name: res.data.first_name || "",
          last_name: res.data.last_name || "",
          avatar: null,
          avatar_url: res.data.avatar
            ? `http://localhost:8000${res.data.avatar}`
            : "",
        });
      } catch {
        toast.error("Unable to load profile. Please sign in again.");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();

    return () => {
      if (form.avatar_url?.startsWith("blob:")) {
        URL.revokeObjectURL(form.avatar_url);
      }
    };
  }, []);

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

    if (form.avatar_url?.startsWith("blob:")) {
      URL.revokeObjectURL(form.avatar_url);
    }

    setForm((prev) => ({
      ...prev,
      avatar: file,
      avatar_url: URL.createObjectURL(file),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("email", form.email);
      formData.append("first_name", form.first_name);
      formData.append("last_name", form.last_name);
      if (form.avatar) formData.append("avatar", form.avatar);

      await api.put("/api/profile/", formData);

      const res = await api.get("/api/profile/");
      setForm({
        username: res.data.username,
        email: res.data.email || "",
        first_name: res.data.first_name || "",
        last_name: res.data.last_name || "",
        avatar: null,
        avatar_url: res.data.avatar
          ? `http://localhost:8000${res.data.avatar}`
          : "",
      });

      toast.success("Profile updated successfully");
    } catch {
      toast.error("Failed to update profile. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-slate-900 to-black text-white py-16 px-4">
      <div className="max-w-lg mx-auto">
      
        <div className="text-center mb-12">
          <div className="relative w-24 h-24 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-cyan-400 to-purple-600 shadow-[0_0_30px_rgba(34,211,238,0.45)] overflow-hidden group">
            {form.avatar_url ? (
              <img
                src={form.avatar_url}
                alt="avatar"
                className="w-full h-full object-cover transition group-hover:scale-105"
              />
            ) : (
              <span className="text-3xl flex items-center justify-center h-full">
                👤
              </span>
            )}
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-xs text-gray-200">
              Change
            </div>
          </div>

          <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-300 to-purple-400 bg-clip-text text-transparent">
            Profile
          </h1>
          <p className="text-gray-400 mt-1">
            Manage your personal details
          </p>
        </div>

        <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl p-6 md:p-7 shadow-[0_0_30px_rgba(168,85,247,0.18)]">
          {loading && (
            <div className="text-center py-6 text-cyan-300">
              <div className="w-8 h-8 mx-auto border-4 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
              <p className="mt-2 text-sm">Loading profile…</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
         
            <div>
              <label className="block text-xs text-gray-400 mb-2">
                Profile Picture
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="w-full text-sm text-gray-300
                file:mr-4 file:py-2.5 file:px-4
                file:rounded-xl file:border-0
                file:bg-cyan-500 file:text-black
                hover:file:bg-cyan-400 transition"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1">
                Username
              </label>
              <input
                value={form.username}
                disabled
                className="w-full px-4 py-3 rounded-xl bg-black/30 border border-white/10 text-gray-500 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1">Email</label>
              <input
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/20 text-white focus:border-cyan-400/40 focus:ring-2 focus:ring-cyan-400/20 outline-none"
              />
            </div>

      
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <input
                name="first_name"
                value={form.first_name}
                onChange={handleChange}
                placeholder="First name"
                className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/20 text-white focus:border-cyan-400/40 focus:ring-2 focus:ring-cyan-400/20 outline-none"
              />
              <input
                name="last_name"
                value={form.last_name}
                onChange={handleChange}
                placeholder="Last name"
                className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/20 text-white focus:border-purple-400/40 focus:ring-2 focus:ring-purple-400/20 outline-none"
              />
            </div>

        
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-600 text-black font-semibold shadow hover:shadow-cyan-500/40 transition disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? "Saving changes..." : "Save changes"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;