import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../api/api";
import { toast } from "react-toastify";

const LoginForm = ({ onLogin }) => {
  const [form, setForm] = useState({ username: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await api.post("/api/login/", form);

      const { access, refresh, is_admin } = res.data;

      onLogin(access, refresh);
      localStorage.setItem("is_admin", is_admin);

      toast.success("Login successful");

      if (is_admin) {
        navigate("/admin/buses");
      } else {
        navigate("/");
      }
    } catch (err) {
      toast.error("Invalid credentials. Please check your username or password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-black via-gray-900 to-black px-4">
      <div className="relative w-full max-w-md backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl p-8">
        
        <div className="text-center mb-8">
          <h2 className="text-3xl font-semibold text-white">Sign in</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          
          <input
            className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Username"
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
            required
          />

          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/20 text-white pr-12 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              className="absolute right-3 top-3 text-white"
            >
              {showPassword ? "🙈" : "👁️"}
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 transition text-white font-semibold"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        {/* Links Section */}
        <div className="mt-6 text-center text-sm text-gray-300 space-y-3">
          
          <div>
            <Link
              to="/forgot-password"
              className="underline hover:text-white"
            >
              Forgot password?
            </Link>
          </div>

          <div>
            Don't have an account?{" "}
            <Link
              to="/register"
              className="text-indigo-400 font-semibold hover:text-indigo-300"
            >
              Register
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
};

export default LoginForm;