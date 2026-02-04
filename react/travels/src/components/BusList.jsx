import React, { useEffect, useState } from "react";
import api from "../api/api";
import { useNavigate } from "react-router-dom";

const BusList = () => {
  const [buses, setBuses] = useState([]);
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [loading, setLoading] = useState(false);
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

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-3">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6 text-center text-gray-800">
          Available Buses
        </h1>

        <div className="bg-white p-4 rounded-xl shadow-sm mb-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              className="border border-gray-300 px-3 py-2 rounded-lg text-sm w-full focus:outline-none focus:ring-2 focus:ring-indigo-400"
              placeholder="From (Origin)"
              value={origin}
              onChange={(e) => setOrigin(e.target.value)}
            />
            <input
              className="border border-gray-300 px-3 py-2 rounded-lg text-sm w-full focus:outline-none focus:ring-2 focus:ring-indigo-400"
              placeholder="To (Destination)"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
            />
          </div>
        </div>

        {loading && (
          <p className="text-center text-sm text-gray-500">
            Fetching available buses...
          </p>
        )}
        {!loading && buses.length === 0 && (
          <p className="text-center text-sm text-gray-500">
            No buses found for the selected route.
          </p>
        )}

        <div className="space-y-4">
          {buses.map((bus) => (
            <div
              key={bus.id}
              className="bg-white rounded-xl shadow-sm border p-5 hover:shadow-md transition"
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-lg font-semibold text-gray-800">
                    {bus.bus_name}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    {bus.origin} → {bus.destination}
                  </p>
                </div>

                <div className="mt-3 sm:mt-0 text-sm text-gray-700">
                  <p>
                    <span className="font-medium">Start:</span> {bus.start_time}
                  </p>
                  <p>
                    <span className="font-medium">Reach:</span> {bus.reach_time}
                  </p>
                  <p className="mt-1 font-semibold text-indigo-600">
                    ₹{bus.price}
                  </p>
                </div>
              </div>

              <div className="text-right mt-4">
                <button
                  onClick={() => navigate(`/bus/${bus.id}`)}
                  className="px-4 py-2 text-sm rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition"
                >
                  View Seats
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default BusList;
