import React, { useEffect, useMemo, useState } from "react";
import api from "../api/api";
import { useNavigate } from "react-router-dom";

const SkeletonCard = () => (
  <div className="animate-pulse flex flex-col overflow-hidden rounded-3xl border border-white/10 bg-white/5">
    <div className="h-48 w-full bg-white/10" />
    <div className="p-6 space-y-4">
      <div className="h-4 w-2/3 bg-white/10 rounded" />
      <div className="h-4 w-1/3 bg-white/10 rounded" />
      <div className="h-10 w-full bg-white/10 rounded-xl mt-4" />
    </div>
  </div>
);

const BusList = () => {
  const [buses, setBuses] = useState([]);
  const [recentlyViewed, setRecentlyViewed] = useState([]);
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [loading, setLoading] = useState(false);
  const [sortBy, setSortBy] = useState(null);
  const navigate = useNavigate();

  // Fetch buses
  const fetchBuses = async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/buses/", {
        params: {
          origin: origin || undefined,
          destination: destination || undefined,
        },
      });
      const active = res.data.filter((b) => b.is_active !== false);
      setBuses(active);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBuses();
  }, [origin, destination]);

  // Load recently viewed from localStorage
  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem("recent_buses") || "[]");
    setRecentlyViewed(stored);
  }, []);

  const sortedBuses = useMemo(() => {
    const arr = [...buses];
    if (sortBy === "price") return arr.sort((a, b) => Number(a.price) - Number(b.price));
    if (sortBy === "time") return arr.sort((a, b) => a.start_time.localeCompare(b.start_time));
    return arr;
  }, [buses, sortBy]);

  // Trending routes
  const trendingRoutes = useMemo(() => {
    const set = new Set();
    buses.forEach((b) => set.add(`${b.origin} → ${b.destination}`));
    return Array.from(set).slice(0, 3);
  }, [buses]);

  const handleViewSeats = (bus) => {
    const prev = JSON.parse(localStorage.getItem("recent_buses") || "[]");
    const updated = [bus, ...prev.filter((b) => b.id !== bus.id)].slice(0, 4);
    localStorage.setItem("recent_buses", JSON.stringify(updated));
    setRecentlyViewed(updated);
    navigate(`/bus/${bus.id}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-slate-900 to-black text-white">
      <div className="mx-auto max-w-7xl px-4 py-12 space-y-20">

        {/* HERO */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <span className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3 py-1 text-xs text-cyan-300">
              🚍 Smart Bus Booking Platform
            </span>

            <h1 className="text-4xl md:text-5xl xl:text-6xl font-extrabold leading-tight">
              Book Bus Tickets{" "}
              <span className="bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">
                in Seconds
              </span>
            </h1>

            <p className="max-w-xl text-gray-400">
              Search routes, choose seats in real-time, pay securely and download tickets instantly.
            </p>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={() =>
                  document.getElementById("search-section")?.scrollIntoView({ behavior: "smooth" })
                }
                className="rounded-xl bg-gradient-to-r from-cyan-500 to-purple-600 px-6 py-3 font-semibold text-black"
              >
                Find Buses
              </button>

              <button
                onClick={() => navigate("/my-bookings")}
                className="rounded-xl border border-white/20 px-6 py-3 text-gray-200 hover:bg-white/5 transition"
              >
                My Bookings
              </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-xl">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-center">
                <p className="text-lg font-semibold text-cyan-300">{buses.length}+</p>
                <p className="text-xs text-gray-400">Available Buses</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-center">
                <p className="text-lg font-semibold text-purple-300">Multiple</p>
                <p className="text-xs text-gray-400">Routes Supported</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-center">
                <p className="text-lg font-semibold text-green-300">24/7</p>
                <p className="text-xs text-gray-400">Booking Access</p>
              </div>
            </div>
          </div>

          {/* Trending Routes */}
          <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl p-6">
            <p className="text-sm text-gray-400 mb-3">🔥 Trending Routes</p>
            <div className="space-y-2">
              {trendingRoutes.map((route, idx) => (
                <div
                  key={`${route}-${idx}`}
                  className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm hover:bg-white/10 cursor-pointer"
                  onClick={() => {
                    const [o, d] = route.split(" → ");
                    setOrigin(o);
                    setDestination(d);
                    document.getElementById("search-section")?.scrollIntoView({ behavior: "smooth" });
                  }}
                >
                  {route}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* RECENTLY VIEWED */}
        {recentlyViewed.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-cyan-300">Recently Viewed</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
              {recentlyViewed.map((bus) => (
                <div
                  key={`recent-${bus.id}`}
                  className="rounded-2xl border border-white/10 bg-white/5 p-4 hover:bg-white/10 cursor-pointer transition"
                  onClick={() => handleViewSeats(bus)}
                >
                  <p className="font-medium">{bus.bus_name}</p>
                  <p className="text-xs text-gray-400">
                    {bus.origin} → {bus.destination}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* SEARCH + LIST */}
        <section id="search-section" className="space-y-10">
          {/* Filters */}
          <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <input
                className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-white"
                placeholder="From (Origin)"
                value={origin}
                onChange={(e) => setOrigin(e.target.value)}
              />
              <input
                className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-white"
                placeholder="To (Destination)"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
              />
            </div>
          </div>

          {/* Cards */}
          {loading ? (
            <div className="grid grid-cols-1 gap-8 md:grid-cols-2 xl:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <SkeletonCard key={`sk-${i}`} />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-8 md:grid-cols-2 xl:grid-cols-3">
              {sortedBuses.map((bus) => (
                <div
                  key={bus.id}
                  className="group flex flex-col overflow-hidden rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl transition hover:-translate-y-2"
                >
                  <div className="h-48 w-full overflow-hidden">
                    <img
                      src={
                        bus.image
                          ? bus.image.startsWith("http")
                            ? bus.image
                            : `http://localhost:8000${bus.image}`
                          : "/no-image.jpg"
                      }
                      alt={bus.bus_name}
                      className="h-full w-full object-cover transition duration-700 group-hover:scale-110"
                    />
                  </div>

                  <div className="flex flex-1 flex-col p-6 space-y-4">
                    <h3 className="text-lg font-semibold">{bus.bus_name}</h3>

                    <button
                      onClick={() => handleViewSeats(bus)}
                      className="mt-auto w-full rounded-xl bg-gradient-to-r from-cyan-400 to-purple-600 py-3 font-semibold text-black"
                    >
                      View Seats
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default BusList;
