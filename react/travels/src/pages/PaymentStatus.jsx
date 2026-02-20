import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../api/api";
import { toast } from "react-toastify";

const PaymentStatus = () => {
  const { orderId } = useParams();
  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await api.get(`/api/payments/status/${orderId}/`);
        setPayment(res.data);
      } catch (err) {
        toast.error("Failed to fetch payment status");
        setPayment(null);
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();
  }, [orderId]);

  const statusConfig = {
    SUCCESS: {
      emoji: "✅",
      title: "Payment Successful",
      color: "text-green-300",
      border: "border-green-400/30",
      bg: "bg-green-500/10",
      glow: "shadow-[0_0_40px_rgba(34,197,94,0.25)]",
    },
    FAILED: {
      emoji: "❌",
      title: "Payment Failed",
      color: "text-red-300",
      border: "border-red-400/30",
      bg: "bg-red-500/10",
      glow: "shadow-[0_0_40px_rgba(239,68,68,0.25)]",
    },
    PENDING: {
      emoji: "⏳",
      title: "Payment Pending",
      color: "text-yellow-300",
      border: "border-yellow-400/30",
      bg: "bg-yellow-500/10",
      glow: "shadow-[0_0_40px_rgba(234,179,8,0.25)]",
    },
  };

  const status = statusConfig[payment?.status] || statusConfig.PENDING;

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-slate-900 to-black text-white py-16 px-4">
      <div className="max-w-xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-300 to-purple-400 bg-clip-text text-transparent">
            Payment Status
          </h1>
          <p className="text-gray-400 mt-2 text-sm">
            Track your transaction securely
          </p>
        </div>

        {loading && (
          <div className="text-center py-20 text-cyan-300">
            <div className="w-12 h-12 mx-auto border-4 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-4 text-sm text-gray-400">Checking payment status…</p>
          </div>
        )}

        {!loading && !payment && (
          <div className="text-center py-20 backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl p-10">
            <div className="text-5xl mb-4">⚠️</div>
            <p className="text-xl font-semibold text-red-300">
              Payment not found
            </p>
            <p className="text-sm mt-2 text-gray-400">
              Invalid or expired order ID
            </p>
            <Link
              to="/my-payments"
              className="inline-block mt-6 px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-600 text-black font-semibold shadow hover:shadow-cyan-500/40 transition"
            >
              Go to My Payments
            </Link>
          </div>
        )}

        {!loading && payment && (
          <div
            className={`relative backdrop-blur-xl rounded-3xl p-8 border ${status.border} ${status.bg} ${status.glow}`}
          >
            {payment.status === "SUCCESS" && (
              <div className="absolute inset-0 rounded-3xl animate-pulse bg-green-500/5 pointer-events-none" />
            )}

            <div className="relative z-10">
              <div className="text-center mb-8">
                <div className="text-5xl mb-3">{status.emoji}</div>
                <h2 className={`text-2xl font-semibold ${status.color}`}>
                  {status.title}
                </h2>
                <p className="text-gray-400 mt-1">
                  Order ID: {payment.razorpay_order_id}
                </p>
              </div>

              <div className="space-y-4 text-sm text-gray-300">
                <div className="flex justify-between">
                  <span className="text-gray-500">Payment ID</span>
                  <span className="text-white">
                    {payment.razorpay_payment_id || "N/A"}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-500">Amount</span>
                  <span className="font-semibold text-white">
                    ₹{(payment.amount / 100).toFixed(2)}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-500">Date</span>
                  <span className="text-white">
                    {new Date(payment.created_at).toLocaleString()}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Status</span>
                  <span
                    className={`px-3 py-1 rounded-full text-xs border ${status.border} ${status.color} ${status.bg}`}
                  >
                    {payment.status}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Order ID</span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(payment.razorpay_order_id);
                      toast.success("Order ID copied");
                    }}
                    className="text-cyan-300 hover:underline text-xs"
                  >
                    Copy
                  </button>
                </div>
              </div>

              <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Link
                  to="/my-payments"
                  className="w-full text-center py-3 rounded-xl border border-white/20 text-gray-200 hover:bg-white/10 transition"
                >
                  My Payments
                </Link>

                <Link
                  to="/"
                  className="w-full text-center py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-600 text-black font-semibold shadow hover:shadow-cyan-500/40 transition"
                >
                  Book More Seats
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentStatus;