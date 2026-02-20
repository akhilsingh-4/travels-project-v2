import React, { useEffect, useState } from "react";
import api from "../../api/api";
import { toast } from "react-toastify";

const AdminBookings = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const res = await api.get("/api/admin/dashboard/recent-bookings/");
        setBookings(res.data);
      } catch {
        toast.error("Failed to load bookings");
      } finally {
        setLoading(false);
      }
    };

    fetchBookings();
  }, []);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold text-cyan-300">All Bookings</h2>

      <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
        {loading ? (
          <p className="text-gray-400">Loading bookings…</p>
        ) : bookings.length === 0 ? (
          <p className="text-gray-400">No bookings found</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-gray-400 border-b border-white/10">
              <tr>
                <th className="text-left py-2">Date</th>
                <th className="text-left py-2">User</th>
                <th className="text-left py-2">Bus</th>
                <th className="text-left py-2">Seat</th>
                <th className="text-left py-2">Route</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((b) => (
                <tr key={b.id} className="border-b border-white/5">
                  <td className="py-2 text-gray-300">
                    {b.journey_date || "-"}
                  </td>
                  <td className="py-2">{b.username}</td>
                  <td className="py-2">{b.bus_name}</td>
                  <td className="py-2">{b.seat_number}</td>
                  <td className="py-2">
                    {b.origin} → {b.destination}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default AdminBookings;