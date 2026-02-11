import React, { useEffect, useState } from "react";
import api from "../api/api";

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
  const [message, setMessage] = useState("");

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      setMessage("");
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
        setMessage("Unable to load profile. Please sign in again.");
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setMessage("Image must be less than 2MB");
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
    setMessage("");

    try {
      const formData = new FormData();
      formData.append("email", form.email);
      formData.append("first_name", form.first_name);
      formData.append("last_name", form.last_name);

      if (form.avatar) {
        formData.append("avatar", form.avatar);
      }

      await api.put("/api/profile/", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

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

      setMessage("Profile updated successfully.");
    } catch {
      setMessage("Failed to update profile. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black text-white py-10 px-4">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="w-20 h-20 mx-auto mb-4 rounded-xl bg-gradient-to-br from-cyan-400 to-purple-600 shadow-[0_0_24px_rgba(34,211,238,0.4)] flex items-center justify-center overflow-hidden">
            {form.avatar_url ? (
              <img
                src={form.avatar_url}
                alt="avatar"
                className="w-full h-full object-cover rounded-xl"
              />
            ) : (
              <span className="text-2xl">👤</span>
            )}
          </div>

          <h1 className="text-3xl font-semibold bg-gradient-to-r from-cyan-300 to-purple-400 bg-clip-text text-transparent">
            Profile
          </h1>
          <p className="text-gray-400 mt-1">Manage your personal details</p>
        </div>

        {/* Card */}
        <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl p-6 shadow-[0_0_24px_rgba(168,85,247,0.15)]">
          {loading && (
            <div className="text-center py-6 text-cyan-300">
              <div className="w-8 h-8 mx-auto border-4 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
              <p className="mt-2">Loading profile…</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Avatar */}
            <div>
              <label className="block text-sm text-gray-400 mb-2">
                Profile Picture
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="w-full text-sm text-gray-300
                file:mr-4 file:py-2 file:px-4
                file:rounded-xl file:border-0
                file:bg-cyan-500 file:text-black
                hover:file:bg-cyan-400 transition"
              />
            </div>

            {/* Username */}
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                Username
              </label>
              <input
                name="username"
                value={form.username}
                disabled
                className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-gray-400 cursor-not-allowed"
              />
            </div>

            {/* Email */}
            <input
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              placeholder="Email"
              className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/20 text-white"
            />

            {/* Names */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <input
                name="first_name"
                value={form.first_name}
                onChange={handleChange}
                placeholder="First name"
                className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/20 text-white"
              />
              <input
                name="last_name"
                value={form.last_name}
                onChange={handleChange}
                placeholder="Last name"
                className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/20 text-white"
              />
            </div>

            {/* Message */}
            {message && (
              <div
                className={`p-4 rounded-xl border ${
                  message.toLowerCase().includes("success")
                    ? "border-green-400/30 bg-green-500/10 text-green-300"
                    : "border-red-400/30 bg-red-500/10 text-red-300"
                }`}
              >
                {message}
              </div>
            )}

            {/* Save */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-600 text-black font-semibold shadow hover:shadow-cyan-500/30 transition disabled:opacity-60"
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
