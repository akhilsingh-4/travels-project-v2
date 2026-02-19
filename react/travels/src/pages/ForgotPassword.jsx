import React, { useState } from "react";
import api from "../api/api";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await api.post("/api/password-reset/request/", { email });
      toast.success("If this email exists, a reset link has been sent.");
    } catch {
      toast.error("Something went wrong. Please try again.");
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
            🔐
          </div>
          <h2 className="text-2xl font-semibold bg-gradient-to-r from-cyan-300 to-purple-400 bg-clip-text text-transparent">
            Reset Password
          </h2>
          <p className="text-gray-400 mt-1">
            Enter your email to receive a reset link
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm text-gray-400 mb-1">
              Email address
            </label>
            <input
              type="email"
              className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/20 text-white focus:outline-none focus:border-cyan-400 transition"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              We’ll send a reset link if this email exists.
            </p>
          </div>

          <button
            disabled={loading}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-600 text-black font-semibold shadow hover:shadow-cyan-500/30 transition disabled:opacity-60"
          >
            {loading ? "Sending reset link…" : "Send reset link"}
          </button>

          <div className="mt-4 p-4 rounded-xl border border-white/10 bg-white/5 text-gray-400 text-sm">
            Reset links expire in 1 hour. Check spam if you don’t see the email.
          </div>
        </form>

        <div className="mt-8 text-center text-sm text-gray-400">
          Remembered your password?{" "}
          <Link to="/login" className="text-cyan-300 hover:underline">
            Back to login
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
