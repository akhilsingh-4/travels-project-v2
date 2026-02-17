import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api/api";

const ResetPassword = () => {
  const { uid, token } = useParams();
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (password !== confirm) {
      setMessage("Passwords do not match.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      await api.post("/api/password-reset/confirm/", {
        uid,
        token,
        password,
      });
      setMessage("Password reset successful. Redirecting to login…");
      setTimeout(() => navigate("/login"), 1500);
    } catch {
      setMessage("This reset link is invalid or has expired.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-black via-gray-900 to-black px-4">

      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-cyan-500 rounded-full blur-3xl opacity-15"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-600 rounded-full blur-3xl opacity-15"></div>
      </div>

      <div className="relative w-full max-w-md backdrop-blur-2xl bg-white/5 border border-white/10 rounded-3xl shadow-[0_0_28px_rgba(34,211,238,0.2)] p-8">

        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 rounded-t-3xl" />


        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-gradient-to-br from-cyan-400 to-purple-600 shadow-[0_0_20px_rgba(34,211,238,0.45)] flex items-center justify-center text-xl">
            🔁
          </div>
          <h2 className="text-2xl font-semibold bg-gradient-to-r from-cyan-300 to-purple-400 bg-clip-text text-transparent">
            Set new password
          </h2>
          <p className="text-gray-400 mt-1">
            Create a new password for your account
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
    
          <div>
            <label className="block text-sm text-gray-400 mb-1">
              New password
            </label>
            <input
              type="password"
              className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/20 text-white focus:outline-none focus:border-cyan-400 transition"
              placeholder="Enter a new password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">
              Confirm password
            </label>
            <input
              type="password"
              className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/20 text-white focus:outline-none focus:border-purple-400 transition"
              placeholder="Re-enter your password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
            />
          </div>


          <div className="p-4 rounded-xl border border-white/10 bg-white/5 text-gray-400 text-sm">
            Use at least 8 characters and include letters and numbers.
          </div>

          {message && (
            <div
              className={`p-3 rounded-xl border ${
                message.toLowerCase().includes("invalid") ||
                message.toLowerCase().includes("expired")
                  ? "border-red-400/30 bg-red-500/10 text-red-300"
                  : "border-green-400/30 bg-green-500/10 text-green-300"
              }`}
            >
              {message}
            </div>
          )}

          <button
            disabled={loading}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-600 text-black font-semibold shadow hover:shadow-cyan-500/30 transition disabled:opacity-60"
          >
            {loading ? "Resetting password…" : "Reset password"}
          </button>

       
          <div className="text-center text-sm text-gray-400">
            You’ll be redirected to login after success.
          </div>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;
