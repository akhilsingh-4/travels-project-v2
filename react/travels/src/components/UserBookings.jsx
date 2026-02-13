import React, { useEffect, useState } from "react";
import api from "../api/api";
import { Link } from "react-router-dom";

const UserBookings = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionId, setActionId] = useState(null);

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
    if (!window.confirm("Are you sure you want to cancel this booking?")) return;
    try {
      setActionId(id);
      await api.post("/api/bookings/cancel/", { booking_id: id });
      setBookings((prev) => prev.filter((b) => b.id !== id));
    } catch {
      alert("Failed to cancel booking. Please try again.");
    } finally {
      setActionId(null);
    }
  };

  const refundTicket = async (bookingId) => {
  if (!window.confirm("Refund this ticket? This action cannot be undone.")) return;

  try {
    await api.post(`/api/bookings/${bookingId}/refund/`);
    alert("Refund successful");
    setBookings((prev) => prev.filter((b) => b.id !== bookingId));
  } catch {
    alert("Refund failed");
  }
};

 const handlePrint = async (booking) => {
  try {
    const res = await api.get(`/api/bookings/${booking.id}/ticket/`, {
      responseType: "blob",
    });

    const blob = new Blob([res.data], { type: "application/pdf" });
    const url = window.URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `ticket_${booking.id}.pdf`;
    a.click();

    window.URL.revokeObjectURL(url);
  } catch (err) {
    alert("Failed to download ticket.");
  }
};

  const formatDate = (dateStr) => {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleString();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black text-white py-10 px-4">
      <div className="max-w-5xl mx-auto">

        <div className="text-center mb-12">
          <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-gradient-to-br from-cyan-400 to-purple-600 shadow flex items-center justify-center text-xl">
            🎫
          </div>
          <h1 className="text-3xl font-semibold bg-gradient-to-r from-cyan-300 to-purple-400 bg-clip-text text-transparent">
            My Bookings
          </h1>
          <p className="text-gray-400 mt-1">View and manage your reservations</p>
        </div>


        {loading && (
          <div className="text-center py-16 text-cyan-300">
            <div className="w-10 h-10 mx-auto border-4 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-4">Loading bookings…</p>
          </div>
        )}


        {!loading && bookings.length === 0 && (
          <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl p-10 text-center max-w-md mx-auto">
            <div className="text-4xl mb-4">🚌</div>
            <h3 className="text-lg font-semibold text-cyan-300 mb-2">
              No bookings found
            </h3>
            <p className="text-gray-400 mb-6">
              You haven’t booked any seats yet.
            </p>
            <Link
              to="/"
              className="inline-block px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-600 text-black font-semibold"
            >
              Explore buses
            </Link>
          </div>
        )}


        {!loading && bookings.length > 0 && (
          <div className="space-y-5">
            {bookings.map((b) => (
              <div
                key={b.id}
                className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl p-6 transition"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      
                  <div>
                    <h3 className="text-lg font-semibold text-cyan-300">
                      {b.bus_name || b.bus}
                    </h3>

                    {b.origin && b.destination && (
                      <p className="text-sm text-gray-400">
                        {b.origin} → {b.destination}
                      </p>
                    )}

                    <div className="mt-2 text-sm text-gray-400 space-y-1">
                      <p>Seat: <span className="text-white">{b.seat}</span></p>
                      <p>Booking ID: <span className="text-white">#{b.id}</span></p>
                      <p>
                        {formatDate(b.created_at)
                          ? `Booked on ${formatDate(b.created_at)}`
                          : "Booking confirmed"}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3 items-center">
                    <span className="px-3 py-1 rounded-full text-xs border border-green-400/30 bg-green-500/10 text-green-300">
                      {b.status || "Confirmed"}
                    </span>

                    
                    <button
                      disabled={actionId === b.id}
                      onClick={() => cancelBooking(b.id)}
                      className="px-4 py-2 rounded-xl border border-red-400/30 text-red-300 hover:bg-red-500/10 transition disabled:opacity-50"
                    >
                      {actionId === b.id ? "Cancelling..." : "Cancel"}
                    </button>

                    <button
                      onClick={() => handlePrint(b)}
                      className="px-4 py-2 rounded-xl border border-cyan-400/30 text-cyan-300 hover:bg-cyan-500/10 transition"
                    >
                      Print Ticket
                    </button>

                    <button
                      onClick={() => refundTicket(b.id)}
                      className="px-4 py-2 rounded-xl border border-purple-400/30 text-purple-300 hover:bg-purple-500/10 transition"
                    >
                    Refund
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}


        {!loading && bookings.length > 0 && (
          <div className="mt-10 backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl p-5 text-center">
            <p className="text-gray-400">
              You have{" "}
              <span className="text-cyan-300 font-semibold">
                {bookings.length}
              </span>{" "}
              active booking{bookings.length !== 1 ? "s" : ""}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserBookings;
