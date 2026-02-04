import React, { useEffect, useState } from "react";
import api from "../api/api";
import { useNavigate, useParams } from "react-router-dom";

const BusSeats = () => {
  const [bus, setBus] = useState(null);
  const [seats, setSeats] = useState([]);
  const [loading, setLoading] = useState(false);
  const { busId } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchBus = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/api/buses/${busId}/`);
        setBus(res.data);
        setSeats(res.data.seats || []);
      } finally {
        setLoading(false);
      }
    };
    fetchBus();
  }, [busId]);

  const handleBook = async (seatId) => {
    try {
      await api.post("/api/booking/", { seat: seatId });
      setSeats((prev) =>
        prev.map((s) =>
          s.id === seatId ? { ...s, is_booked: true } : s
        )
      );
      alert("✅ Seat booked successfully");
    } catch {
      navigate("/login");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-3">
      <div className="max-w-4xl mx-auto">
        {/* Bus Info */}
        {bus && (
          <div className="bg-white rounded-xl shadow-sm border p-5 mb-6">
            <h2 className="text-xl font-semibold text-gray-800">
              {bus.bus_name}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {bus.origin} → {bus.destination}
            </p>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <p className="text-center text-sm text-gray-500">
            Loading seats...
          </p>
        )}

        {/* Seats */}
        {!loading && (
          <div className="bg-white rounded-xl shadow-sm border p-5">
            <h3 className="text-sm font-semibold mb-4 text-gray-700">
              Select Your Seat
            </h3>

            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3">
              {seats.map((seat) => (
                <button
                  key={seat.id}
                  disabled={seat.is_booked}
                  onClick={() => handleBook(seat.id)}
                  className={`py-2 rounded-lg text-sm font-medium border transition
                    ${
                      seat.is_booked
                        ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                        : "bg-white hover:bg-indigo-50 hover:border-indigo-400"
                    }`}
                >
                  {seat.seat_number}
                </button>
              ))}
            </div>

            {/* Legend */}
            <div className="flex gap-4 mt-6 text-xs text-gray-600">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded bg-white border"></span>
                <span>Available</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded bg-gray-200 border"></span>
                <span>Booked</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BusSeats;
