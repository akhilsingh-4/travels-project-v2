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
      } catch (err) {
        setMessage("❌ Failed to load profile. Please login again.");
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
      setMessage("✅ Profile updated successfully");
    } catch (err) {
      setMessage("❌ Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-3">
      <div className="max-w-md mx-auto bg-white p-6 rounded-xl shadow-sm border">
        <h2 className="text-2xl font-bold mb-4 text-center text-gray-800">
          My Profile
        </h2>

        {loading && (
          <p className="text-center text-sm text-gray-500">Loading...</p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Username</label>
            <input
              name="username"
              value={form.username}
              disabled
              className="w-full border px-3 py-2 rounded bg-gray-100 cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Email</label>
            <input
              name="email"
              type="email"
              value={form.email || ""}
              onChange={handleChange}
              className="w-full border px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-indigo-400"
              placeholder="Enter email"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">First Name</label>
            <input
              name="first_name"
              value={form.first_name || ""}
              onChange={handleChange}
              className="w-full border px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-indigo-400"
              placeholder="First name"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Last Name</label>
            <input
              name="last_name"
              value={form.last_name || ""}
              onChange={handleChange}
              className="w-full border px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-indigo-400"
              placeholder="Last name"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-lg transition disabled:opacity-60"
          >
            {loading ? "Saving..." : "Save Changes"}
          </button>

          {message && (
            <p
              className={`text-center text-sm ${
                message.startsWith("✅")
                  ? "text-green-600"
                  : "text-red-600"
              }`}
            >
              {message}
            </p>
          )}
        </form>
      </div>
    </div>
  );
};

export default UserProfile;
