import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../api/api";

const LoginForm = ({ onLogin }) => {
  const [form, setForm] = useState({ username: "", password: "" });
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const res = await api.post("/api/token/", form);
      onLogin(res.data.access, res.data.refresh, res.data.user_id || null);
      navigate("/");
    } catch {
      setMessage("Invalid credentials. Please check your username or password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-black via-gray-900 to-black px-4">
      {/* Soft background glows */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-cyan-500 rounded-full blur-3xl opacity-10"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-purple-600 rounded-full blur-3xl opacity-10"></div>
      </div>

      <div className="relative w-full max-w-md backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl shadow-[0_0_32px_rgba(34,211,238,0.18)] p-8">
        {/* Top accent */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 rounded-t-3xl" />

        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-gradient-to-br from-cyan-400 to-purple-600 shadow-[0_0_24px_rgba(34,211,238,0.4)] flex items-center justify-center text-xl">
            🚌
          </div>
          <h2 className="text-3xl font-semibold bg-gradient-to-r from-cyan-300 to-purple-400 bg-clip-text text-transparent">
            Sign in to your account
          </h2>
          <p className="text-gray-400 mt-1">
            Access your bookings and manage your trips
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Username */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">Username</label>
            <input
              className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/20 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-400/70 focus:ring-2 focus:ring-cyan-400/30 transition"
              placeholder="Enter your username"
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              required
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/20 text-white placeholder-gray-500 focus:outline-none focus:border-purple-400/70 focus:ring-2 focus:ring-purple-400/30 transition pr-12"
                placeholder="Enter your password"
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
              />
              <button
                type="button"
                aria-label="Toggle password visibility"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute inset-y-0 right-3 text-gray-400 hover:text-cyan-300 transition"
              >
                {showPassword ? "🙈" : "👁️"}
              </button>
            </div>
          </div>

          {/* Forgot password */}
          <div className="flex justify-end text-sm">
            <Link to="/forgot-password" className="text-cyan-300 hover:underline">
              Forgot password?
            </Link>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-600 text-black font-semibold shadow hover:shadow-cyan-500/30 transition disabled:opacity-60"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>

          {/* Error */}
          {message && (
            <div className="p-3 rounded-xl border border-red-400/30 bg-red-500/10 text-red-300">
              {message}
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-400">
          Don’t have an account?{" "}
          <Link to="/register" className="text-cyan-300 hover:underline">
            Create one
          </Link>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;
