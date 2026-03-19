import React, { useCallback, useEffect, useMemo, useState } from "react";
import api from "../api/api";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import { resolveMediaUrl } from "../utils/url";

const SkeletonCard = () => (
  <div className="animate-pulse flex flex-col overflow-hidden rounded-3xl border border-white/10 bg-white/5">
    <div className="h-48 w-full bg-white/10" />
    <div className="p-6 space-y-4">
      <div className="h-4 w-2/3 bg-white/10 rounded" />
      <div className="h-4 w-1/3 bg-white/10 rounded" />
      <div className="h-10 w-full bg-white/10 rounded-xl mt-4" />
    </div>
  </div>
);

const BusList = () => {
  const [buses, setBuses] = useState([]);
  const [recentlyViewed, setRecentlyViewed] = useState([]);
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [journeyDate, setJourneyDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [sortBy] = useState(null);
  const [editingBusId, setEditingBusId] = useState(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editBookingId = searchParams.get("edit_booking");

  const fetchBuses = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/buses/", {
        params: {
          origin: origin || undefined,
          destination: destination || undefined,
        },
      });
      const active = res.data.filter((b) => b.is_active !== false);
      setBuses(active);
      if (active.length === 0) {
        toast.info("No buses found for selected route");
      }
    } catch {
      toast.error("Failed to load buses");
    } finally {
      setLoading(false);
    }
  }, [origin, destination]);

  useEffect(() => {
    fetchBuses();
  }, [fetchBuses]);

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem("recent_buses") || "[]");
    setRecentlyViewed(stored);
  }, []);

  const sortedBuses = useMemo(() => {
    const arr = [...buses];
    if (sortBy === "price") return arr.sort((a, b) => Number(a.price) - Number(b.price));
    if (sortBy === "time") return arr.sort((a, b) => a.start_time.localeCompare(b.start_time));
    return arr;
  }, [buses, sortBy]);

  const trendingRoutes = useMemo(() => {
    const set = new Set();
    buses.forEach((b) => set.add(`${b.origin} → ${b.destination}`));
    return Array.from(set).slice(0, 3);
  }, [buses]);

  const handleViewSeats = (bus) => {
    if (!journeyDate) {
      toast.error("Please select journey date");
      return;
    }

    const prev = JSON.parse(localStorage.getItem("recent_buses") || "[]");

    const minimalBus = {
      id: bus.id,
      bus_name: bus.bus_name,
      origin: bus.origin,
      destination: bus.destination,
    };

    const updated = [
      minimalBus,
      ...prev.filter((b) => b.id !== bus.id),
    ].slice(0, 4);

    localStorage.setItem("recent_buses", JSON.stringify(updated));
    setRecentlyViewed(updated);

    navigate(`/bus/${bus.id}?date=${journeyDate}`);
  };

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

  const verifyEditPayment = async (payload, response) => {
    await api.post("/api/bookings/edit/verify/", {
      booking_id: Number(editBookingId),
      bus_id: payload.bus_id,
      razorpay_payment_id: response.razorpay_payment_id,
      razorpay_order_id: response.razorpay_order_id,
      razorpay_signature: response.razorpay_signature,
    });
    toast.success("Booking updated successfully");
    navigate("/my-bookings");
  };

  const startBusEditFlow = async (bus) => {
    if (!editBookingId) return;
    const payload = { bus_id: bus.id };

    setEditingBusId(bus.id);
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
                await verifyEditPayment(payload, response);
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
        return;
      }

      toast.success(data.message || "Booking updated successfully");
      navigate("/my-bookings");
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to change bus"));
    } finally {
      setEditingBusId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-slate-900 to-black text-white">
      <div className="mx-auto max-w-7xl px-4 py-12 space-y-20">
        {editBookingId && (
          <section className="rounded-2xl border border-amber-400/30 bg-amber-500/10 p-4 text-amber-200">
            <p className="font-semibold">Edit Mode Active</p>
            <p className="text-sm text-amber-100/80">
              Select a bus to update booking #{editBookingId}.
            </p>
          </section>
        )}

        <section className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <span className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3 py-1 text-xs text-cyan-300">
              🚍 Smart Bus Booking Platform
            </span>

            <h1 className="text-4xl md:text-5xl xl:text-6xl font-extrabold leading-tight">
              Book Bus Tickets{" "}
              <span className="bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">
                in Seconds
              </span>
            </h1>

            <p className="max-w-xl text-gray-400">
              Search routes, choose seats in real-time, pay securely and download tickets instantly.
            </p>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={() =>
                  document.getElementById("search-section")?.scrollIntoView({ behavior: "smooth" })
                }
                className="rounded-xl bg-gradient-to-r from-cyan-500 to-purple-600 px-6 py-3 font-semibold text-black"
              >
                Find Buses
              </button>

              <button
                onClick={() => navigate("/my-bookings")}
                className="rounded-xl border border-white/20 px-6 py-3 text-gray-200 hover:bg-white/5 transition"
              >
                My Bookings
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-xl">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-center">
                <p className="text-lg font-semibold text-cyan-300">{buses.length}+</p>
                <p className="text-xs text-gray-400">Available Buses</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-center">
                <p className="text-lg font-semibold text-purple-300">Multiple</p>
                <p className="text-xs text-gray-400">Routes Supported</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-center">
                <p className="text-lg font-semibold text-green-300">24/7</p>
                <p className="text-xs text-gray-400">Booking Access</p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl p-6">
            <p className="text-sm text-gray-400 mb-3"> Trending Routes</p>
            <div className="space-y-2">
              {trendingRoutes.map((route, idx) => (
                <div
                  key={`${route}-${idx}`}
                  className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm hover:bg-white/10 cursor-pointer"
                  onClick={() => {
                    const [o, d] = route.split(" → ");
                    setOrigin(o);
                    setDestination(d);
                    document.getElementById("search-section")?.scrollIntoView({ behavior: "smooth" });
                  }}
                >
                  {route}
                </div>
              ))}
            </div>
          </div>
        </section>

        {recentlyViewed.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-cyan-300">Recently Viewed</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
              {recentlyViewed.map((bus) => (
                <div
                  key={`recent-${bus.id}`}
                  className="rounded-2xl border border-white/10 bg-white/5 p-4 hover:bg-white/10 cursor-pointer transition"
                  onClick={() => handleViewSeats(bus)}
                >
                  <p className="font-medium">{bus.bus_name}</p>
                  <p className="text-xs text-gray-400">
                    {bus.origin} → {bus.destination}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        <section id="search-section" className="space-y-10">
          <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl p-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <input
                className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-white"
                placeholder="From (Origin)"
                value={origin}
                onChange={(e) => setOrigin(e.target.value)}
              />
              <input
                className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-white"
                placeholder="To (Destination)"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
              />
              <input
                type="date"
                min={new Date().toISOString().split("T")[0]}
                className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-white [color-scheme:dark]"
                value={journeyDate}
                onChange={(e) => setJourneyDate(e.target.value)}
              />
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 gap-8 md:grid-cols-2 xl:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <SkeletonCard key={`sk-${i}`} />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-8 md:grid-cols-2 xl:grid-cols-3">
              {sortedBuses.map((bus) => (
                <div
                  key={bus.id}
                  className="group flex flex-col overflow-hidden rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl transition hover:-translate-y-2"
                >
                  <div className="h-48 w-full overflow-hidden">
                    <img
                      src={
                        bus.image
                          ? resolveMediaUrl(bus.image)
                          : "/no-image.jpg"
                      }
                      alt={bus.bus_name}
                      className="h-full w-full object-cover transition duration-700 group-hover:scale-110"
                    />
                  </div>

                  <div className="flex flex-1 flex-col p-6 space-y-4">
                    <h3 className="text-lg font-semibold">{bus.bus_name}</h3>
                    <p className="text-xs text-gray-400">
                      {bus.origin} → {bus.destination}
                    </p>

                    <button
                      onClick={() =>
                        editBookingId ? startBusEditFlow(bus) : handleViewSeats(bus)
                      }
                      disabled={!!editBookingId && editingBusId === bus.id}
                      className="mt-auto w-full rounded-xl bg-gradient-to-r from-cyan-400 to-purple-600 py-3 font-semibold text-black disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {editBookingId
                        ? editingBusId === bus.id
                          ? "Processing..."
                          : "Select This Bus"
                        : "View Seats"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default BusList;
