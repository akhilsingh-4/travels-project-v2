import React, { useEffect, useState } from "react";
import api from "../api/api";
import { useNavigate, useParams, useSearchParams } from "react-router-dom"; 
const BusSeats = () => {
  const [bus, setBus] = useState(null);
  const [seats, setSeats] = useState([]);
  const [loading, setLoading] = useState(false);
  const { busId } = useParams();
  const [searchParams] = useSearchParams();          
  const journeyDate = searchParams.get("date");     
  const navigate = useNavigate();

  useEffect(() => {
    const fetchBus = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/api/buses/${busId}/`, {
          params: {
            date: journeyDate || undefined,         
          },
        });
        setBus(res.data);
        setSeats(res.data.seats || []);
      } finally {
        setLoading(false);
      }
    };
    fetchBus();
  }, [busId, journeyDate]);

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
    if (!journeyDate) {                           
      alert("Journey date missing. Please select date.");
      navigate("/");
      return;
    }



    const ok = await loadRazorpay();
    if (!ok) return alert("Failed to load payment gateway");

    const orderRes = await api.post("/api/payments/create-order/", {
      seat_id: seatId,
      journey_date: journeyDate,
    });

    const { order_id, amount, currency, key } = orderRes.data;

    const options = {
      key,
      amount,
      currency,
      name: "BusBooking",
      description: "Seat Booking",
      order_id,
      handler: async function (response) {
        try {
          await api.post("/api/payments/verify/", {
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_order_id: response.razorpay_order_id,
            razorpay_signature: response.razorpay_signature,
            seat_id: seatId,
            journey_date: journeyDate,
          });

          setSeats((prev) =>
            prev.map((s) =>
              s.id === seatId ? { ...s, is_booked: true } : s
            )
          );

          alert("Payment successful. Your seat is confirmed.");
          navigate("/my-bookings");
        } catch (err) {
          alert("Payment verification failed.");
        }
      },
      theme: { color: "#22d3ee" },
    };

    new window.Razorpay(options).open();
  } catch (err) {
    alert("Seat unavailable. Try another seat.");
  }
};

  const rows = [];
  for (let i = 0; i < seats.length; i += 4) rows.push(seats.slice(i, i + 4));

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-slate-900 to-black text-white py-12 px-4">
      <div className="mx-auto max-w-5xl space-y-8">


        {journeyDate && (                                 
          <div className="text-center text-sm text-gray-400">
            Journey Date:{" "}
            <span className="text-cyan-300 font-semibold">
              {new Date(journeyDate).toDateString()}
            </span>
          </div>
        )}

  
        {bus && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label: "Route", value: `${bus.origin} → ${bus.destination}`, color: "text-cyan-300" },
              { label: "Departure", value: bus.start_time, color: "text-white" },
              { label: "Fare", value: `₹${bus.price}`, color: "text-purple-300" },
            ].map((item, i) => (
              <div key={i} className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl">
                <p className="text-xs text-gray-500">{item.label}</p>
                <p className={`font-semibold ${item.color}`}>{item.value}</p>
              </div>
            ))}
          </div>
        )}

       
        {bus && (
          <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] p-6 backdrop-blur-xl">
            <h2 className="text-2xl font-bold text-cyan-300">{bus.bus_name}</h2>
            <p className="text-gray-400">
              {bus.origin} → {bus.destination}
            </p>
            <p className="text-sm text-gray-500">
              {bus.start_time} – {bus.reach_time}
            </p>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="py-20 text-center text-cyan-300">
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-cyan-400 border-t-transparent" />
            <p className="mt-4 text-gray-400">Loading seat availability…</p>
          </div>
        )}

        {/* Seats */}
        {!loading && (
          <div className="rounded-3xl border border-white/10 bg-gradient-to-b from-white/5 to-white/[0.02] p-8 backdrop-blur-xl shadow-[0_20px_80px_rgba(0,0,0,0.8)]">
            <h3 className="mb-6 text-xl font-semibold text-cyan-300 text-center">
              Choose Your Seat
            </h3>

            <div className="flex justify-center mb-6">
              <span className="rounded-xl bg-white/10 px-5 py-2 border border-white/10">
                Driver
              </span>
            </div>

            <div className="space-y-5">
              {rows.map((row, i) => (
                <div key={i} className="flex justify-center gap-10">
                  {[...row.slice(0, 2), null, ...row.slice(2)].map((seat, idx) =>
                    seat ? (
                      <button
                        key={seat.id}
                        disabled={seat.is_booked}
                        onClick={() => handlePayAndBook(seat.id)}
                        className={`h-12 w-12 rounded-xl text-sm font-semibold border transition
                          ${
                            seat.is_booked
                              ? "cursor-not-allowed border-white/10 bg-white/5 text-gray-500"
                              : "border-cyan-400/40 bg-black/40 text-cyan-300 hover:bg-cyan-500/10 hover:scale-105"
                          }`}
                      >
                        {seat.seat_number}
                      </button>
                    ) : (
                      <div key={idx} className="w-12" />
                    )
                  )}
                </div>
              ))}
            </div>

            <div className="mt-8 flex justify-center gap-6 text-xs text-gray-400">
              <div className="flex items-center gap-2">
                <span className="h-4 w-4 rounded border border-cyan-400/40 bg-black/40" />
                Available
              </div>
              <div className="flex items-center gap-2">
                <span className="h-4 w-4 rounded border border-white/10 bg-white/10" />
                Booked
              </div>
            </div>

            <p className="mt-6 text-center text-sm text-gray-500">
              Select an available seat to proceed with payment
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default BusSeats;
