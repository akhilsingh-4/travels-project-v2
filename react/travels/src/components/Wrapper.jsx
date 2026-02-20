import React, { useEffect, useState } from "react";
import { Link, useNavigate, useLocation, Outlet } from "react-router-dom";
import api from "../api/api";

const Wrapper = ({ token, handleLogout }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [me, setMe] = useState(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!token) {
      setMe(null);
      return;
    }

    api
      .get("/api/profile/")
      .then((res) => setMe(res.data))
      .catch(() => setMe(null));
  }, [token]);

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  const isActive = (path) =>
    location.pathname === path
      ? "text-cyan-300 bg-cyan-500/10 border border-cyan-400/30 shadow-[0_0_12px_rgba(34,211,238,0.25)]"
      : "text-gray-300 hover:text-cyan-300 hover:bg-white/5 border border-transparent";

  const avatarUrl = me?.avatar ? `http://localhost:8000${me.avatar}` : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-slate-900 to-black text-white">
      <nav className="sticky top-0 z-50 backdrop-blur-xl bg-white/5 border-b border-white/10 shadow-[0_0_24px_rgba(34,211,238,0.12)]">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-purple-500 text-black flex items-center justify-center shadow-[0_0_16px_rgba(168,85,247,0.5)] transition group-hover:shadow-[0_0_24px_rgba(34,211,238,0.6)]">
              🚍
            </div>
            <span className="text-xl font-semibold bg-gradient-to-r from-cyan-300 to-purple-400 bg-clip-text text-transparent tracking-wide">
              BusBooking
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-2 text-sm">
            {token && (
              <>
                <Link to="/profile" className={`px-4 py-2 rounded-xl transition ${isActive("/profile")}`}>
                  Profile
                </Link>
                <Link to="/my-bookings" className={`px-4 py-2 rounded-xl transition ${isActive("/my-bookings")}`}>
                  My Bookings
                </Link>
                <Link to="/my-payments" className={`px-4 py-2 rounded-xl transition ${isActive("/my-payments")}`}>
                  My Payments
                </Link>
              </>
            )}

            {!token ? (
              <>
                <Link to="/login" className="px-4 py-2 rounded-xl border border-white/20 text-gray-300 hover:text-cyan-300 hover:border-cyan-400/40 transition">
                  Login
                </Link>
                <Link to="/register" className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-600 text-black font-semibold shadow hover:shadow-cyan-500/30 transition">
                  Register
                </Link>
              </>
            ) : (
              <div className="flex items-center gap-3 ml-2">
                {me && (
                  <div className="w-9 h-9 rounded-full border border-white/20 overflow-hidden bg-white/10 flex items-center justify-center shadow-inner">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-cyan-300 font-semibold">
                        {me.username?.[0]?.toUpperCase()}
                      </span>
                    )}
                  </div>
                )}

                <button
                  onClick={() => {
                    handleLogout();
                    navigate("/login");
                  }}
                  className="px-4 py-2 rounded-xl border border-red-400/30 text-red-300 hover:bg-red-500/10 transition"
                >
                  Logout
                </button>
              </div>
            )}
          </div>

          <button
            onClick={() => setOpen((o) => !o)}
            className="md:hidden text-xl px-3 py-2 rounded-xl border border-white/10 hover:border-cyan-400/40 transition"
          >
            ☰
          </button>
        </div>

        {open && (
          <div className="md:hidden px-4 pb-4 pt-3 space-y-2 backdrop-blur-xl bg-black/70 border-t border-white/10">
            {token && (
              <>
                <Link to="/profile" className="block px-4 py-2 rounded-xl hover:bg-cyan-500/10 hover:text-cyan-300 transition">
                  Profile
                </Link>
                <Link to="/my-bookings" className="block px-4 py-2 rounded-xl hover:bg-cyan-500/10 hover:text-cyan-300 transition">
                  My Bookings
                </Link>
                <Link to="/my-payments" className="block px-4 py-2 rounded-xl hover:bg-cyan-500/10 hover:text-cyan-300 transition">
                  My Payments
                </Link>
              </>
            )}

            {!token ? (
              <>
                <Link to="/login" className="block px-4 py-2 rounded-xl hover:bg-white/10 transition">
                  Login
                </Link>
                <Link to="/register" className="block px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-600 text-black shadow">
                  Register
                </Link>
              </>
            ) : (
              <button
                onClick={() => {
                  handleLogout();
                  navigate("/login");
                }}
                className="w-full text-left px-4 py-2 rounded-xl text-red-300 hover:bg-red-500/10 transition"
              >
                Logout
              </button>
            )}
          </div>
        )}
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-10">
        <div className="backdrop-blur-2xl bg-white/5 rounded-3xl border border-white/10 shadow-[0_0_32px_rgba(168,85,247,0.15)] p-6 md:p-8">
          <Outlet />
        </div>
      </main>

      <footer className="border-t border-white/10 backdrop-blur-xl bg-white/5 py-5 text-center text-sm text-gray-400">
        BusBooking © 2026 — Travel smart. Book with confidence.
      </footer>
    </div>
  );
};

export default Wrapper;