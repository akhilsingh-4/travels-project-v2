import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../api/api";

const PaymentStatus = () => {
  const { orderId } = useParams();
  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get(`/api/payments/status/${orderId}/`)
      .then((res) => setPayment(res.data))
      .finally(() => setLoading(false));
  }, [orderId]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black text-white py-12 px-4">
      <div className="max-w-xl mx-auto">

      
        {loading && (
          <div className="text-center py-12 text-cyan-300">
            <div className="w-10 h-10 mx-auto border-4 border-cyan-300 border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-3">Checking payment status...</p>
          </div>
        )}

    
        {!loading && !payment && (
          <div className="text-center py-16 text-gray-400">
            <p className="text-xl font-semibold">Payment not found</p>
            <p className="text-sm mt-2">Invalid or expired order ID</p>
            <Link
              to="/payments"
              className="inline-block mt-6 px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-600 text-black font-semibold"
            >
              Go to My Payments
            </Link>
          </div>
        )}

        {!loading && payment && (
          <div className="bg-white/10 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-[0_0_36px_rgba(34,211,238,0.25)]">
            <div className="text-center mb-6">
              <div className="text-4xl mb-2">
                {payment.status === "SUCCESS" ? "✅" : payment.status === "FAILED" ? "❌" : "⏳"}
              </div>
              <h2 className="text-2xl font-semibold text-cyan-300">
                Payment {payment.status}
              </h2>
              <p className="text-gray-400 mt-1">
                Order ID: {payment.razorpay_order_id}
              </p>
            </div>

            <div className="space-y-3 text-sm text-gray-300">
              <div className="flex justify-between">
                <span className="text-gray-500">Payment ID</span>
                <span>{payment.razorpay_payment_id || "N/A"}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-500">Amount</span>
                <span className="font-semibold text-white">
                  ₹{(payment.amount / 100).toFixed(2)}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-500">Date</span>
                <span>{new Date(payment.created_at).toLocaleString()}</span>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <Link
                to="/payments"
                className="w-full text-center py-3 rounded-xl border border-cyan-400/40 text-cyan-300 hover:bg-cyan-500/10 transition"
              >
                My Payments
              </Link>

              <Link
                to="/"
                className="w-full text-center py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-600 text-black font-semibold shadow hover:shadow-cyan-500/30 transition"
              >
                Book More Seats
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentStatus;
