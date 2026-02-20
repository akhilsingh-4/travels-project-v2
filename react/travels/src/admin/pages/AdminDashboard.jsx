import React, { useEffect, useState } from "react";
import api from "../../api/api";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    totalBookings: 0,
    totalRevenue: 0,
    activeBuses: 0,
  });

  const [recentBookings, setRecentBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = async () => {
    try {
      const [bookingsRes, revenueRes, busesRes, recentRes] =
        await Promise.all([
          api.get("/api/admin/dashboard/total-bookings/"),
          api.get("/api/admin/dashboard/total-revenue/"),
          api.get("/api/admin/dashboard/active-buses/"),
          api.get("/api/admin/dashboard/recent-bookings/"),
        ]);

      setStats({
        totalBookings: bookingsRes.data.total_bookings,
        totalRevenue: revenueRes.data.total_revenue,
        activeBuses: busesRes.data.active_buses,
      });

      setRecentBookings(recentRes.data);
    } catch {
      toast.error("Failed to load admin dashboard");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="py-20 text-center text-cyan-300">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-cyan-400 border-t-transparent" />
        <p className="mt-3 text-sm text-gray-400">
          Loading dashboard...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {/* HEADER */}
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">
          Admin Dashboard
        </h1>
        <p className="text-gray-400 text-sm mt-1">
          Overview of bookings and revenue
        </p>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <StatCard
          label="Total Bookings"
          value={stats.totalBookings}
          color="text-cyan-300"
        />
        <StatCard
          label="Total Revenue"
          value={`₹ ${Number(stats.totalRevenue).toLocaleString("en-IN")}`}
          color="text-green-300"
        />
        <StatCard
          label="Active Buses"
          value={stats.activeBuses}
          color="text-purple-300"
        />
      </div>

      {/* RECENT BOOKINGS */}
      <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-cyan-300">
            Recent Bookings
          </h2>
          <Link
            to="/admin/bookings"
            className="text-sm text-cyan-300 hover:underline"
          >
            View all
          </Link>
        </div>

        {recentBookings.length === 0 ? (
          <p className="text-gray-400 text-sm">
            No recent bookings
          </p>
        ) : (
          <div className="overflow-x-auto">
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
                {recentBookings.map((b) => (
                  <tr
                    key={b.id}
                    className="border-b border-white/5 hover:bg-white/5 transition"
                  >
                    <td className="py-2 text-white">
                      {b.journey_date || "-"}
                    </td>
                    <td className="py-2 text-white">
                      {b.username}
                    </td>
                    <td className="py-2">
                      {b.bus_name}
                    </td>
                    <td className="py-2">
                      {b.seat_number}
                    </td>
                    <td className="py-2 text-gray-400">
                      {b.origin} → {b.destination}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

const StatCard = ({ label, value, color }) => (
  <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl p-6">
    <p className="text-sm text-gray-400">{label}</p>
    <p className={`mt-2 text-2xl font-semibold ${color}`}>
      {value}
    </p>
  </div>
);

export default AdminDashboard;