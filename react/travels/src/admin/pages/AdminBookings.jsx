import React, { useEffect, useState } from "react";
import api from "../../api/api";

const AdminBookings = () => {
  const [bookings, setBookings] = useState([]);

  useEffect(() => {
    api
      .get("/api/admin/dashboard/recent-bookings/")
      .then((res) => setBookings(res.data))
      .catch(() => alert("Failed to load bookings"));
  }, []);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold text-cyan-300">
        All Bookings
      </h2>

      <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
        {bookings.length === 0 ? (
          <p className="text-gray-400">No bookings found</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-gray-400 border-b border-white/10">
              <tr>
                <th className="text-left py-2">User</th>
                <th className="text-left py-2">Bus</th>
                <th className="text-left py-2">Seat</th>
                <th className="text-left py-2">Route</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((b) => (
                <tr key={b.id} className="border-b border-white/5">
                  <td>{b.journey_date}</td>
                  <td className="py-2">{b.username}</td>
                  <td>{b.bus_name}</td>
                  <td>{b.seat_number}</td>
                  <td>{b.origin} → {b.destination}</td>
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
