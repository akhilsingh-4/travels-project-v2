import React, { useEffect, useState } from "react";
import api from "../api/api";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";

const MyPayments = () => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPayments = async () => {
      try {
        const res = await api.get("/api/payments/my/");
        setPayments(res.data);

        // Optional: info toast when no payments
        // if (res.data.length === 0) {
        //   toast.info("No payments found yet");
        // }
      } catch (err) {
        toast.error("Failed to load payments");
      } finally {
        setLoading(false);
      }
    };
    fetchPayments();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black text-white py-12 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-purple-400">
            My Payments
          </h1>
          <p className="text-gray-400 mt-2">All your transactions in one place</p>
        </div>

        {loading && (
          <div className="text-center py-12 text-cyan-300">
            <div className="w-10 h-10 mx-auto border-4 border-cyan-300 border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-3">Loading payments…</p>
          </div>
        )}

        {!loading && payments.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <p className="text-xl font-semibold">No payments found</p>
            <p className="text-sm mt-2">You haven’t made any payments yet</p>
          </div>
        )}

        {!loading && payments.length > 0 && (
          <div className="hidden sm:grid grid-cols-5 gap-4 px-4 py-2 text-xs uppercase tracking-wide text-gray-400 border-b border-white/10 mb-3">
            <div>Order ID</div>
            <div>Amount</div>
            <div>Status</div>
            <div>Booking</div>
            <div>Action</div>
          </div>
        )}

        <div className="divide-y divide-white/10">
          {payments.map((p) => (
            <div
              key={p.id}
              className="grid grid-cols-1 sm:grid-cols-5 gap-3 px-4 py-4 hover:bg-white/5 transition rounded-xl"
            >
              <div className="text-xs sm:text-sm break-all text-cyan-300">
                {p.razorpay_order_id}
              </div>

              <div className="text-sm font-medium">
                ₹{(p.amount / 100).toFixed(2)}
              </div>

              <div
                className={`text-sm font-semibold ${
                  p.status === "SUCCESS"
                    ? "text-green-400"
                    : p.status === "FAILED"
                    ? "text-red-400"
                    : p.status === "REFUNDED"
                    ? "text-purple-400"
                    : "text-yellow-400"
                }`}
              >
                {p.status}
              </div>

              <div className="text-xs text-gray-400">
                {p.booking ? `#${p.booking}` : "Not linked"}
              </div>

              <div>
                <Link
                  to={`/payment-status/${p.razorpay_order_id}`}
                  className="text-xs text-cyan-400 hover:text-cyan-300 underline underline-offset-4"
                >
                  View status →
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MyPayments;