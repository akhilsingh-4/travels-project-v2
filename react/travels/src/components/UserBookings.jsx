import React, { useEffect, useState } from "react";
import api from "../api/api";

const UserBookings = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchBookings = async () => {
      setLoading(true);
      try {
        const res = await api.get("/api/my/bookings/");
        setBookings(res.data);
      } finally {
        setLoading(false);
      }
    };

    fetchBookings();
  }, []);

  const cancelBooking = async (id) => {
    try {
      await api.post("/api/bookings/cancel/", { booking_id: id });
      setBookings((prev) => prev.filter((b) => b.id !== id));
    } catch {
      alert("❌ Failed to cancel booking. Try again.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-3">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold mb-6 text-center">My Bookings</h2>

        {loading && <p className="text-center text-sm text-gray-500">Loading...</p>}

        {!loading && bookings.length === 0 && (
          <p className="text-center text-sm text-gray-500">No bookings yet.</p>
        )}

        <div className="space-y-4">
          {bookings.map((b) => (
            <div key={b.id} className="bg-white rounded-xl shadow-sm border p-5 flex justify-between">
              <div>
                <p>Bus: {b.bus}</p>
                <p>Seat: {b.seat}</p>
              </div>
              <button
                onClick={() => cancelBooking(b.id)}
                className="px-3 py-1 border border-red-500 text-red-600 rounded"
              >
                Cancel
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default UserBookings;
