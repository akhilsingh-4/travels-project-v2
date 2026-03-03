import React, { useEffect, useMemo, useState } from "react";
import api from "../api/api";
import { useNavigate, useLocation } from "react-router-dom"; // ✅ added useLocation
import { toast } from "react-toastify";

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
  const [journeyDate, setJourneyDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [sortBy, setSortBy] = useState(null);

  const navigate = useNavigate();
  const location = useLocation(); // ✅ added

  // 🔥 detect edit mode
  const editMode = location.state?.editMode;
  const bookingId = location.state?.bookingId;

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
      if (active.length === 0) {
        toast.info("No buses found for selected route");
      }
    } catch {
      toast.error("Failed to load buses");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBuses();
  }, [origin, destination]);

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem("recent_buses") || "[]");
    setRecentlyViewed(stored);
  }, []);

  const sortedBuses = useMemo(() => {
    const arr = [...buses];
    if (sortBy === "price")
      return arr.sort((a, b) => Number(a.price) - Number(b.price));
    if (sortBy === "time")
      return arr.sort((a, b) => a.start_time.localeCompare(b.start_time));
    return arr;
  }, [buses, sortBy]);

  const trendingRoutes = useMemo(() => {
    const set = new Set();
    buses.forEach((b) => set.add(`${b.origin} → ${b.destination}`));
    return Array.from(set).slice(0, 3);
  }, [buses]);

  const handleViewSeats = (bus) => {
    if (!journeyDate) {
      toast.error("Please select journey date");
      return;
    }

    const prev = JSON.parse(localStorage.getItem("recent_buses") || "[]");

    const minimalBus = {
      id: bus.id,
      bus_name: bus.bus_name,
      origin: bus.origin,
      destination: bus.destination,
    };

    const updated = [
      minimalBus,
      ...prev.filter((b) => b.id !== bus.id),
    ].slice(0, 4);

    localStorage.setItem("recent_buses", JSON.stringify(updated));
    setRecentlyViewed(updated);

    // ✅ pass edit state if exists
    navigate(`/bus/${bus.id}?date=${journeyDate}`, {
      state: editMode
        ? { editMode: true, bookingId }
        : undefined,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-slate-900 to-black text-white">
      <div className="mx-auto max-w-7xl px-4 py-12 space-y-20">

        {/* Everything else unchanged */}

        <section id="search-section" className="space-y-10">
          <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl p-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
              <input
                type="date"
                min={new Date().toISOString().split("T")[0]}
                className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-white [color-scheme:dark]"
                value={journeyDate}
                onChange={(e) => setJourneyDate(e.target.value)}
              />
            </div>
          </div>

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
                    <p className="text-xs text-gray-400">
                      {bus.origin} → {bus.destination}
                    </p>

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