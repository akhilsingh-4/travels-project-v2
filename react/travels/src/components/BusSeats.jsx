import React, { useEffect, useState } from "react";
import api from "../api/api";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";

const BusSeats = () => {
  const [bus, setBus] = useState(null);
  const [seats, setSeats] = useState([]);
  const [loading, setLoading] = useState(false);
  const [processingSeatId, setProcessingSeatId] = useState(null);
  const [mapFailed, setMapFailed] = useState(false);
  const { busId } = useParams();
  const [searchParams] = useSearchParams();
  const journeyDate = searchParams.get("date");
  const editBookingId = searchParams.get("edit_booking");
  const navigate = useNavigate();
  const routeMapUrl = `${api.defaults.baseURL}/api/buses/${busId}/route-map/`;

  useEffect(() => {
    setMapFailed(false);
  }, [busId]);

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
      } catch {
        toast.error("Failed to load bus details");
      } finally {
        setLoading(false);
      }
    };

    fetchBus();
  }, [busId, journeyDate]);

  const loadRazorpay = () =>
    new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });

  const getErrorMessage = (err, fallback) =>
    err?.response?.data?.error ||
    err?.response?.data?.detail ||
    err?.response?.data?.message ||
    fallback;

  const handleEditSeat = async (seatId) => {
    if (!editBookingId) return;

    const payload = { seat_id: seatId };
    setProcessingSeatId(seatId);
    try {
      const res = await api.post(
        `/api/bookings/${editBookingId}/edit/request/`,
        payload
      );
      const data = res.data || {};

      if (data.order_id && data.key) {
        if (data.extra_amount) {
          toast.info(`Extra payment required: INR ${data.extra_amount}`);
        }

        const ok = await loadRazorpay();
        if (!ok) {
          toast.error("Failed to load payment gateway");
          return;
        }

        await new Promise((resolve, reject) => {
          const options = {
            key: data.key,
            amount: data.amount,
            currency: data.currency || "INR",
            name: "BusBooking",
            description: "Booking Modification Charges",
            order_id: data.order_id,
            handler: async (response) => {
              try {
                await api.post("/api/bookings/edit/verify/", {
                  booking_id: Number(editBookingId),
                  seat_id: seatId,
                  journey_date: journeyDate || undefined,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_signature: response.razorpay_signature,
                });
                toast.success("Booking updated successfully");
                resolve();
              } catch (error) {
                reject(error);
              }
            },
            theme: { color: "#22d3ee" },
          };
          const razorpay = new window.Razorpay(options);
          razorpay.on("payment.failed", () => reject(new Error("Payment failed")));
          razorpay.open();
        });

        navigate("/my-bookings");
        return;
      }

      toast.success(data.message || "Booking updated successfully");
      navigate("/my-bookings");
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to update seat"));
    } finally {
      setProcessingSeatId(null);
    }
  };

  const handlePayAndBook = async (seatId) => {
    try {
      if (!journeyDate) {
        toast.error("Journey date missing. Please select date.");
        navigate("/");
        return;
      }

      const ok = await loadRazorpay();
      if (!ok) {
        toast.error("Failed to load payment gateway");
        return;
      }

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
        handler: async (response) => {
          try {
            await api.post("/api/payments/verify/", {
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature,
              seat_id: seatId,
              journey_date: journeyDate,
            });

            setSeats((prev) =>
              prev.map((seat) =>
                seat.id === seatId ? { ...seat, is_booked: true } : seat
              )
            );

            toast.success("Payment successful. Your seat is confirmed.");
            navigate("/my-bookings");
          } catch {
            toast.error("Payment verification failed.");
          }
        },
        theme: { color: "#22d3ee" },
      };

      new window.Razorpay(options).open();
    } catch {
      toast.error("Seat unavailable. Try another seat.");
    }
  };

  const rows = [];
  for (let i = 0; i < seats.length; i += 4) rows.push(seats.slice(i, i + 4));

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-slate-900 to-black px-4 py-12 text-white">
      <div className="mx-auto max-w-5xl space-y-8">
        {editBookingId && (
          <div className="rounded-2xl border border-amber-400/30 bg-amber-500/10 p-4 text-sm text-amber-200">
            Edit Mode: updating booking #{editBookingId}
          </div>
        )}

        {journeyDate && (
          <div className="text-center text-sm text-gray-400">
            Journey Date:{" "}
            <span className="font-semibold text-cyan-300">
              {new Date(journeyDate).toDateString()}
            </span>
          </div>
        )}

        {bus && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {[
              {
                label: "Route",
                value: `${bus.origin} to ${bus.destination}`,
                color: "text-cyan-300",
              },
              { label: "Departure", value: bus.start_time, color: "text-white" },
              { label: "Fare", value: `Rs.${bus.price}`, color: "text-amber-300" },
            ].map((item, index) => (
              <div
                key={index}
                className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl"
              >
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
              {bus.origin} {"->"} {bus.destination}
            </p>
            <p className="text-sm text-gray-500">
              {bus.start_time} - {bus.reach_time}
            </p>
          </div>
        )}

        {loading && (
          <div className="py-20 text-center text-cyan-300">
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-cyan-400 border-t-transparent" />
            <p className="mt-4 text-gray-400">Loading seat availability...</p>
          </div>
        )}

        {!loading && (
          <div className="rounded-3xl border border-white/10 bg-gradient-to-b from-white/5 to-white/[0.02] p-8 shadow-[0_20px_80px_rgba(0,0,0,0.8)] backdrop-blur-xl">
            <h3 className="mb-6 text-center text-xl font-semibold text-cyan-300">
              {editBookingId ? "Choose New Seat" : "Choose Your Seat"}
            </h3>

            <div className="mb-6 flex justify-center">
              <span className="rounded-xl border border-white/10 bg-white/10 px-5 py-2">
                Driver
              </span>
            </div>

            <div className="space-y-5">
              {rows.map((row, rowIndex) => (
                <div key={rowIndex} className="flex justify-center gap-10">
                  {[...row.slice(0, 2), null, ...row.slice(2)].map((seat, index) =>
                    seat ? (
                      <button
                        key={seat.id}
                        onClick={() =>
                          editBookingId
                            ? handleEditSeat(seat.id)
                            : handlePayAndBook(seat.id)
                        }
                        disabled={seat.is_booked || processingSeatId === seat.id}
                        className={`h-12 w-12 rounded-xl border text-sm font-semibold transition ${
                          seat.is_booked || processingSeatId === seat.id
                            ? "cursor-not-allowed border-white/10 bg-white/5 text-gray-500"
                            : "border-cyan-400/40 bg-black/40 text-cyan-300 hover:scale-105 hover:bg-cyan-500/10"
                        }`}
                      >
                        {processingSeatId === seat.id ? "..." : seat.seat_number}
                      </button>
                    ) : (
                      <div key={`spacer-${rowIndex}-${index}`} className="w-12" />
                    )
                  )}
                </div>
              ))}
            </div>

            <p className="mt-6 text-center text-sm text-gray-500">
              {editBookingId
                ? `Select an available seat to update booking #${editBookingId}`
                : "Select an available seat to proceed with payment"}
            </p>
          </div>
        )}

        {bus && (
          <div className="rounded-3xl border border-cyan-400/20 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.16),transparent_35%),linear-gradient(135deg,rgba(15,23,42,0.96),rgba(2,6,23,0.96))] p-6 shadow-[0_20px_80px_rgba(6,182,212,0.12)]">
            <p className="text-xs uppercase tracking-[0.28em] text-cyan-300/70">
              Route Preview
            </p>
            <h3 className="mt-2 text-2xl font-semibold text-white">
              {bus.origin} to {bus.destination}
            </h3>

            <div className="mt-6 overflow-hidden rounded-[28px] border border-white/10 bg-slate-950/70">
              {!mapFailed ? (
                <img
                  src={routeMapUrl}
                  alt={`${bus.origin} to ${bus.destination} map`}
                  onError={() => setMapFailed(true)}
                  className="h-[320px] w-full object-cover"
                />
              ) : (
                <div className="flex h-[320px] items-center justify-center px-6 text-center text-sm text-slate-400">
                  Route map is unavailable right now.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BusSeats;
