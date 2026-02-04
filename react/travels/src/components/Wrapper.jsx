import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/api";

const Wrapper = ({ token, handleLogout, children }) => {
  const navigate = useNavigate();
  const [me, setMe] = useState(null);

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

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link
            to="/"
            className="text-lg font-bold text-indigo-600 hover:text-indigo-700"
          >
            Bus Booking
          </Link>

          <div className="flex items-center gap-4 text-sm">
            {token ? (
              <>
                {me && (
                  <span className="text-gray-600 hidden sm:block">
                    Hi, <b>{me.username}</b>
                  </span>
                )}

                <Link
                  to="/profile"
                  className="text-gray-700 hover:text-indigo-600 transition"
                >
                  Profile
                </Link>

                <Link
                  to="/my-bookings"
                  className="text-gray-700 hover:text-indigo-600 transition"
                >
                  My Bookings
                </Link>

                <button
                  onClick={() => {
                    handleLogout();
                    navigate("/login");
                  }}
                  className="px-3 py-1.5 rounded-lg border border-red-500 text-red-600 hover:bg-red-50 transition"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="px-3 py-1.5 rounded-lg text-gray-700 hover:bg-gray-100 transition"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition"
                >
                  Register
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
};

export default Wrapper;
