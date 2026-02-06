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
      if (!ok) {
        alert("Failed to load Razorpay");
        return;
      }

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

            alert("Payment successful & seat booked!");
          } catch {
            alert("Payment verification failed");
          }
        },
        theme: { color: "#4f46e5" },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch {
      navigate("/login");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-3">
      <div className="max-w-4xl mx-auto">
        {bus && (
          <div className="bg-white rounded-xl shadow-sm border p-5 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-800">
                  {bus.bus_name}
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  {bus.origin} → {bus.destination}
                </p>
              </div>
              <p className="text-sm font-semibold text-indigo-600">
                ₹{bus.price}
              </p>
            </div>
          </div>
        )}

        {loading && (
          <p className="text-center text-sm text-gray-500">
            Loading seats...
          </p>
        )}

        {!loading && (
          <div className="bg-white rounded-xl shadow-sm border p-5">
            <h3 className="text-sm font-semibold mb-4 text-gray-700">
              Select Your Seat
            </h3>

            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3">
              {seats.map((seat) => (
                <button
                  key={seat.id}
                  disabled={seat.is_booked}
                  onClick={() => handlePayAndBook(seat.id)}
                  className={`py-2 rounded-lg text-sm font-medium border transition
                    ${
                      seat.is_booked
                        ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                        : "bg-white hover:bg-indigo-50 hover:border-indigo-400"
                    }`}
                >
                  {seat.seat_number}
                </button>
              ))}
            </div>

            <div className="flex gap-4 mt-6 text-xs text-gray-600">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded bg-white border"></span>
                <span>Available</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded bg-gray-200 border"></span>
                <span>Booked</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BusSeats;
