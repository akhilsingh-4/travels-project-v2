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
      } catch {
        alert("Failed to load bookings");
      } finally {
        setLoading(false);
      }
    };
    fetchBookings();
  }, []);

  const refundTicket = async (bookingId) => {
    if (!window.confirm("Refund this ticket? This action cannot be undone.")) return;

    try {
      setActionId(bookingId);
      await api.post(`/api/bookings/${bookingId}/refund/`);
      setBookings((prev) => prev.filter((b) => b.id !== bookingId));
    } catch (err) {
      const msg = err?.response?.data?.error || "Refund failed. Please try again.";
      alert(msg);
    } finally {
      setActionId(null);
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
    } catch {
      alert("Failed to download ticket.");
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleString();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-slate-900 to-black text-white py-16 px-4">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="text-center mb-12">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-cyan-400 to-purple-600 shadow-[0_0_24px_rgba(34,211,238,0.4)] flex items-center justify-center text-xl">
            🎫
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-300 to-purple-400 bg-clip-text text-transparent">
            My Bookings
          </h1>
          <p className="text-gray-400 mt-1">View and manage your reservations</p>
        </div>

        {/* Loading */}
        {loading && (
          <div className="text-center py-20 text-cyan-300">
            <div className="w-12 h-12 mx-auto border-4 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-4 text-sm text-gray-400">Loading your bookings…</p>
          </div>
        )}

        {/* Empty */}
        {!loading && bookings.length === 0 && (
          <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl p-12 text-center max-w-md mx-auto">
            <div className="text-4xl mb-4">🚌</div>
            <h3 className="text-lg font-semibold text-cyan-300 mb-2">
              No bookings yet
            </h3>
            <p className="text-gray-400 mb-6">
              You haven’t booked any seats yet.
            </p>
            <Link
              to="/"
              className="inline-block px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-600 text-black font-semibold shadow hover:shadow-cyan-500/40 transition"
            >
              Explore buses
            </Link>
          </div>
        )}

        {/* List */}
        {!loading && bookings.length > 0 && (
          <div className="grid grid-cols-1 gap-6">
            {bookings.map((b) => (
              <div
                key={b.id}
                className="group backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl p-6 transition hover:shadow-[0_20px_60px_rgba(0,0,0,0.6)]"
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">

                  {/* Left */}
                  <div>
                    <h3 className="text-lg font-semibold text-cyan-300">
                      {b.bus?.bus_name || b.bus_name || "Bus"}
                    </h3>

                    {b.origin && b.destination && (
                      <p className="text-sm text-gray-400">
                        {b.origin} → {b.destination}
                      </p>
                    )}

                    <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm text-gray-400">
                      <p>Seat: <span className="text-white">{b.seat?.seat_number || b.seat}</span></p>
                      <p>ID: <span className="text-white">#{b.id}</span></p>
                      <p className="col-span-2 sm:col-span-1">
                        {b.booking_time
                          ? formatDate(b.booking_time)
                          : "Confirmed"}
                      </p>
                    </div>
                  </div>

                  {/* Right */}
                  <div className="flex flex-wrap gap-3 items-center">
                    <span className="px-3 py-1 rounded-full text-xs border border-green-400/30 bg-green-500/10 text-green-300">
                      Confirmed
                    </span>

                    <button
                      onClick={() => handlePrint(b)}
                      className="px-4 py-2 rounded-xl border border-cyan-400/30 text-cyan-300 hover:bg-cyan-500/10 transition"
                    >
                      Download
                    </button>

                    <button
                      disabled={actionId === b.id}
                      onClick={() => refundTicket(b.id)}
                      className="px-4 py-2 rounded-xl border border-purple-400/30 text-purple-300 hover:bg-purple-500/10 transition disabled:opacity-50"
                    >
                      {actionId === b.id ? "Refunding..." : "Refund"}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer summary */}
        {!loading && bookings.length > 0 && (
          <div className="mt-12 backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl p-5 text-center">
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
