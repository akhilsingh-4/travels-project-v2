import React, { useEffect, useState } from "react";
import api from "../api/api";
import { useNavigate } from "react-router-dom";

const BusList = () => {
  const [buses, setBuses] = useState([]);
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [loading, setLoading] = useState(false);
  const [sortBy, setSortBy] = useState(null); // "price" | "time"
  const navigate = useNavigate();

  const fetchBuses = async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/buses/", {
        params: {
          origin: origin || undefined,
          destination: destination || undefined,
        },
      });
      setBuses(res.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBuses();
  }, [origin, destination]);

  const sortedBuses = [...buses].sort((a, b) => {
    if (sortBy === "price") return a.price - b.price;
    if (sortBy === "time") return a.start_time.localeCompare(b.start_time);
    return 0;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black text-white py-12 px-4">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-purple-400">
            Available Buses
          </h1>
          <p className="text-gray-400 mt-2">
            Find the best routes and book your seat with ease
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 mb-6 border border-white/10 shadow-[0_0_24px_rgba(34,211,238,0.12)]">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <input
              className="w-full bg-black/40 border border-white/20 px-4 py-3 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/60 transition"
              placeholder="From (Origin)"
              value={origin}
              onChange={(e) => setOrigin(e.target.value)}
            />
            <input
              className="w-full bg-black/40 border border-white/20 px-4 py-3 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400/60 transition"
              placeholder="To (Destination)"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
            />
          </div>
        </div>

        {/* Sort Buttons */}
        {buses.length > 0 && (
          <div className="flex flex-wrap justify-between items-center mb-6 gap-3">
            <div className="text-sm text-gray-400">
              {buses.length} buses found
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setSortBy("price")}
                className={`px-4 py-2 rounded-xl text-sm border transition ${
                  sortBy === "price"
                    ? "border-cyan-400/40 text-cyan-300 bg-cyan-500/10"
                    : "border-white/10 text-gray-300 hover:text-cyan-300 hover:border-cyan-400/30"
                }`}
              >
                Sort by Price
              </button>
              <button
                onClick={() => setSortBy("time")}
                className={`px-4 py-2 rounded-xl text-sm border transition ${
                  sortBy === "time"
                    ? "border-purple-400/40 text-purple-300 bg-purple-500/10"
                    : "border-white/10 text-gray-300 hover:text-purple-300 hover:border-purple-400/30"
                }`}
              >
                Sort by Start Time
              </button>
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="text-center py-12 text-cyan-300">
            <div className="w-10 h-10 mx-auto border-4 border-cyan-300 border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-3">Fetching available routes...</p>
          </div>
        )}

        {/* Empty */}
        {!loading && sortedBuses.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <p className="text-xl font-semibold">No routes found</p>
            <p className="text-sm mt-2">Try adjusting origin or destination</p>
          </div>
        )}

        {/* Bus Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {sortedBuses.map((bus) => (
            <div
              key={bus.id}
              className="bg-white/10 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-[0_0_22px_rgba(168,85,247,0.12)] hover:shadow-[0_0_36px_rgba(34,211,238,0.25)] transition-all duration-300 hover:-translate-y-1"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-semibold text-cyan-300">
                    {bus.bus_name}
                  </h3>
                  <p className="text-sm text-gray-400">
                    {bus.origin} → {bus.destination}
                  </p>
                </div>
                <span className="text-xl font-bold text-purple-400">
                  ₹{bus.price}
                </span>
              </div>

              {/* Route preview chips */}
              <div className="flex flex-wrap gap-2 mb-4">
                <span className="px-3 py-1 rounded-full text-xs bg-cyan-500/10 text-cyan-300 border border-cyan-400/30">
                  {bus.origin}
                </span>
                <span className="px-2 py-1 text-xs text-gray-500">→</span>
                <span className="px-3 py-1 rounded-full text-xs bg-purple-500/10 text-purple-300 border border-purple-400/30">
                  {bus.destination}
                </span>
              </div>

              <div className="flex justify-between text-sm text-gray-300 mb-6">
                <div>
                  <p className="text-gray-500">Start</p>
                  <p className="font-medium text-white">{bus.start_time}</p>
                </div>
                <div>
                  <p className="text-gray-500">Reach</p>
                  <p className="font-medium text-white">{bus.reach_time}</p>
                </div>
              </div>

              <button
                onClick={() => navigate(`/bus/${bus.id}`)}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-600 text-black font-semibold shadow hover:shadow-cyan-500/30 transition"
              >
                View Seats
              </button>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
};

export default BusList;
