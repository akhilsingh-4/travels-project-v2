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

  const loadRazorpay = () =>
    new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });

  const handlePayAndBook = async (seatId) => {
    try {
      const ok = await loadRazorpay();
      if (!ok) return alert("Failed to load payment gateway");

      const orderRes = await api.post("/api/payments/create-order/", {
        seat_id: seatId,
      });

      const { order_id, amount, currency, key } = orderRes.data;

      const options = {
        key,
        amount,
        currency,
        name: "Travels App",
        description: "Bus Seat Booking",
        order_id,
        handler: async function (response) {
          try {
            await api.post("/api/payments/verify/", {
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature,
              seat_id: seatId,
            });

            await api.post("/api/booking/", { seat: seatId });

            setSeats((prev) =>
              prev.map((s) =>
                s.id === seatId ? { ...s, is_booked: true } : s
              )
            );

            alert("Payment successful. Your seat is confirmed.");
          } catch {
            alert("Payment verification failed. Please try again.");
          }
        },
        theme: { color: "#22d3ee" },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch {
      navigate("/login");
    }
  };

  const rows = [];
  for (let i = 0; i < seats.length; i += 4) rows.push(seats.slice(i, i + 4));

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black text-white py-10 px-4">
      <div className="max-w-4xl mx-auto">

    
        {bus && (
          <div className="mb-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
              <p className="text-xs text-gray-500">Route</p>
              <p className="text-cyan-300 font-semibold">
                {bus.origin} → {bus.destination}
              </p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
              <p className="text-xs text-gray-500">Departure</p>
              <p className="text-white font-semibold">{bus.start_time}</p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
              <p className="text-xs text-gray-500">Fare</p>
              <p className="text-purple-300 font-semibold">₹{bus.price}</p>
            </div>
          </div>
        )}

        {bus && (
          <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl p-6 mb-8">
            <h2 className="text-2xl font-semibold text-cyan-300">
              {bus.bus_name}
            </h2>
            <p className="text-gray-400 mt-1">
              {bus.origin} → {bus.destination}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              {bus.start_time} – {bus.reach_time}
            </p>
          </div>
        )}

        {loading && (
          <div className="text-center py-12 text-cyan-300">
            <div className="w-10 h-10 mx-auto border-4 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-3">Loading seat availability…</p>
          </div>
        )}

    
        {!loading && (
          <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl p-6">
            <h3 className="text-xl font-semibold text-cyan-300 mb-4">
              Choose Your Seat
            </h3>

            <div className="flex justify-center mb-6">
              <div className="px-4 py-2 rounded-xl bg-white/10 border border-white/10 text-gray-200">
                Driver
              </div>
            </div>

            <div className="space-y-4">
              {rows.map((row, rowIndex) => (
                <div key={rowIndex} className="flex justify-center gap-10">
                  {[...row.slice(0, 2), null, ...row.slice(2, 4)].map((seat, idx) =>
                    seat ? (
                      <button
                        key={seat.id}
                        disabled={seat.is_booked}
                        onClick={() => handlePayAndBook(seat.id)}
                        className={`w-12 h-12 rounded-xl text-sm font-semibold border transition-all focus:outline-none focus:ring-2 focus:ring-cyan-400/60
                          ${
                            seat.is_booked
                              ? "bg-white/5 border-white/10 text-gray-500 cursor-not-allowed"
                              : "bg-black/40 border-cyan-400/40 text-cyan-300 hover:bg-cyan-500/10"
                          }`}
                      >
                        {seat.seat_number}
                      </button>
                    ) : (
                      <div key={idx} className="w-10" />
                    )
                  )}
                </div>
              ))}
            </div>

      
            <div className="flex justify-center gap-6 mt-8 text-xs text-gray-400">
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 rounded bg-black/40 border border-cyan-400/40" />
                Available
              </div>
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 rounded bg-white/10 border border-white/10" />
                Booked
              </div>
            </div>

            <p className="text-center text-gray-500 text-sm mt-6">
              Select an available seat to proceed with payment
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default BusSeats;
