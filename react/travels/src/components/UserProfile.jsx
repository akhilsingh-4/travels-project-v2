import React, { useEffect, useState } from "react";
import api from "../api/api";

const UserProfile = () => {
  const [form, setForm] = useState({
    username: "",
    email: "",
    first_name: "",
    last_name: "",
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      setMessage("");
      try {
        const res = await api.get("/api/profile/");
        setForm(res.data);
      } catch {
        setMessage("Unable to load profile. Please sign in again.");
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      await api.put("/api/profile/", form);
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
          <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-gradient-to-br from-cyan-400 to-purple-600 shadow-[0_0_24px_rgba(34,211,238,0.4)] flex items-center justify-center text-xl">
            👤
          </div>
          <h1 className="text-3xl font-semibold bg-gradient-to-r from-cyan-300 to-purple-400 bg-clip-text text-transparent">
            Profile
          </h1>
          <p className="text-gray-400 mt-1">
            Manage your personal details
          </p>
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
              <p className="text-xs text-gray-500 mt-1">
                Username cannot be changed
              </p>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                Email
              </label>
              <input
                name="email"
                type="email"
                value={form.email || ""}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/20 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-400/70 focus:ring-2 focus:ring-cyan-400/30 transition"
                placeholder="you@example.com"
              />
            </div>

            {/* Names */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  First name
                </label>
                <input
                  name="first_name"
                  value={form.first_name || ""}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/20 text-white placeholder-gray-500 focus:outline-none focus:border-purple-400/70 focus:ring-2 focus:ring-purple-400/30 transition"
                  placeholder="First name"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  Last name
                </label>
                <input
                  name="last_name"
                  value={form.last_name || ""}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/20 text-white placeholder-gray-500 focus:outline-none focus:border-purple-400/70 focus:ring-2 focus:ring-purple-400/30 transition"
                  placeholder="Last name"
                />
              </div>
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

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-600 text-black font-semibold shadow hover:shadow-cyan-500/30 transition disabled:opacity-60"
            >
              {loading ? "Saving changes..." : "Save changes"}
            </button>

            <p className="text-center text-xs text-gray-500 mt-2">
              Keeping your profile up to date helps with faster bookings.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;
