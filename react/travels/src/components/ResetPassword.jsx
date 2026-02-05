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
      setMessage("❌ Passwords do not match");
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
      setMessage("✅ Password reset successful. You can login now.");
      setTimeout(() => navigate("/login"), 1500);
    } catch {
      setMessage("❌ Invalid or expired reset link");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-8">
        <h2 className="text-2xl font-bold text-center text-gray-800 mb-2">
          Reset Password 🔒
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            placeholder="New password"
            className="w-full border border-gray-300 px-3 py-2 rounded-lg"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <input
            type="password"
            placeholder="Confirm new password"
            className="w-full border border-gray-300 px-3 py-2 rounded-lg"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
          />

          <button
            disabled={loading}
            className="w-full bg-indigo-600 text-white py-2 rounded-lg disabled:opacity-60"
          >
            {loading ? "Resetting..." : "Reset Password"}
          </button>

          {message && (
            <p className="text-center text-sm mt-2">{message}</p>
          )}
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;
