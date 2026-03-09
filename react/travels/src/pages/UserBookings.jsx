import React, { useEffect, useState } from "react";
import api from "../api/api";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { FiDownload } from "react-icons/fi";
import { BiUndo } from "react-icons/bi";
import { MdEdit } from "react-icons/md";
import { FaTicketAlt } from "react-icons/fa";

const UserBookings = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionId, setActionId] = useState(null);
  const [editingBookingId, setEditingBookingId] = useState(null);
  const [editDate, setEditDate] = useState("");
  const [savingDate, setSavingDate] = useState(false);
  const navigate = useNavigate();

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/my/bookings/");
      setBookings(res.data);
    } catch {
      toast.error("Failed to load bookings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const getErrorMessage = (err, fallback) =>
    err?.response?.data?.error ||
    err?.response?.data?.detail ||
    err?.response?.data?.message ||
    fallback;

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

  const processEditRequest = async (bookingId, payload) => {
    const res = await api.post(`/api/bookings/${bookingId}/edit/request/`, payload);
    const data = res.data || {};

    if (!data.order_id || !data.key) {
      toast.success(data.message || "Booking updated successfully");
      await fetchBookings();
      cancelEditMode();
      return;
    }

    if (data.extra_amount) {
      toast.info(`Extra payment required: INR ${data.extra_amount}`);
    }

    const loaded = await loadRazorpay();
    if (!loaded) {
      throw new Error("Failed to load payment gateway");
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
              booking_id: Number(bookingId),
              seat_id: payload.seat_id,
              bus_id: payload.bus_id,
              journey_date: payload.journey_date,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature,
            });
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

    toast.success("Booking updated successfully");
    await fetchBookings();
    cancelEditMode();
  };

  const refundTicket = async (bookingId) => {
    if (!window.confirm("Refund this ticket? This action cannot be undone."))
      return;

    try {
      setActionId(bookingId);
      await api.post(`/api/bookings/${bookingId}/refund/`);
      setBookings((prev) => prev.filter((b) => b.id !== bookingId));
      toast.success("Refund processed successfully");
    } catch (err) {
      const msg =
        err?.response?.data?.error || "Refund failed. Please try again.";
      toast.error(msg);
    } finally {
      setActionId(null);
    }
  };

  const handlePrint = async (booking) => {
    try {
      const res = await api.get(`/api/bookings/${booking.id}/ticket/`, {
        responseType: "blob",
      });

      const blob = new Blob([res.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `ticket_${booking.id}.pdf`;
      a.click();

      window.URL.revokeObjectURL(url);

      toast.success("Ticket downloaded successfully");
    } catch {
      toast.error("Failed to download ticket.");
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleString();
  };

  const openEditMode = (booking) => {
    if (booking.status === "EXPIRED") {
      toast.error("Expired bookings cannot be edited");
      return;
    }
    setEditingBookingId(booking.id);
    setEditDate(booking.journey_date || "");
  };

  const cancelEditMode = () => {
    setEditingBookingId(null);
    setEditDate("");
    setSavingDate(false);
  };

  const handleDateChange = async (booking) => {
    if (!editDate) {
      toast.error("Please select a journey date");
      return;
    }

    setSavingDate(true);
    try {
      await processEditRequest(booking.id, {
        journey_date: editDate,
      });
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to update journey date"));
    } finally {
      setSavingDate(false);
    }
  };

  const handleSeatRedirect = (booking) => {
    const busId = booking.bus_id;
    const date = booking.journey_date || "";
    if (!busId) {
      toast.error("Missing bus details for this booking");
      return;
    }
    navigate(
      `/bus/${busId}?date=${encodeURIComponent(
        date
      )}&edit_booking=${booking.id}`
    );
  };

  const handleBusRedirect = (booking) => {
    navigate(`/?edit_booking=${booking.id}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-slate-900 to-black text-white py-16 px-4">
      <div className="max-w-5xl mx-auto">

     
        <div className="text-center mb-12">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-cyan-400 to-purple-600 shadow-[0_0_24px_rgba(34,211,238,0.4)] flex items-center justify-center">
            <FaTicketAlt className="text-2xl text-white" />
          </div>

          <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-300 to-purple-400 bg-clip-text text-transparent">
            My Bookings
          </h1>

          <p className="text-gray-400 mt-1">
            View and manage your reservations
          </p>
        </div>

  
        {loading && (
          <div className="text-center py-20 text-cyan-300">
            <div className="w-12 h-12 mx-auto border-4 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-4 text-sm text-gray-400">
              Loading your bookings…
            </p>
          </div>
        )}

       
        {!loading && bookings.length === 0 && (
          <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl p-12 text-center max-w-md mx-auto">
            <div className="text-4xl mb-4">🚌</div>

            <h3 className="text-lg font-semibold text-cyan-300 mb-2">
              No bookings yet
            </h3>

            <p className="text-gray-400 mb-6">
              You haven’t booked any seats yet.
            </p>

            <Link
              to="/"
              className="inline-block px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-600 text-black font-semibold shadow hover:shadow-cyan-500/40 transition"
            >
              Explore buses
            </Link>
          </div>
        )}

   
        {!loading && bookings.length > 0 && (
          <div className="grid grid-cols-1 gap-6">
            {bookings.map((b) => (
              <div
                key={b.id}
                className={`group backdrop-blur-xl bg-white/5 border rounded-3xl p-6 transition hover:shadow-[0_20px_60px_rgba(0,0,0,0.6)] ${
                  editingBookingId === b.id
                    ? "border-cyan-400/40 shadow-[0_0_28px_rgba(34,211,238,0.2)]"
                    : b.status === "EXPIRED"
                    ? "border-red-400/30"
                    : "border-white/10"
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">

                  <div>

                 
                    <h3 className="text-lg font-semibold text-cyan-300">
                      Bus: {b.bus?.split(" ")[0]}
                    </h3>

            
                    <div className="mt-3 flex flex-wrap items-center gap-6 text-sm text-gray-400">

                      <p>
                        Seat:{" "}
                        <span className="text-white">
                          {b.seat_number || b.seat?.seat_number || b.seat}
                        </span>
                      </p>

                      <p>
                        ID: <span className="text-white">#{b.id}</span>
                      </p>

                      <p>
                        {b.booking_time
                          ? formatDate(b.booking_time)
                          : "Confirmed"}
                      </p>

                    </div>

                  </div>

            
                  <div className="flex items-center gap-3 md:justify-end">

                    {b.status === "EXPIRED" ? (
                      <span
                        title="Expired Booking"
                        className="px-3 py-1 rounded-full text-xs border border-red-400/30 bg-red-500/10 text-red-300"
                      >
                        Expired
                      </span>
                    ) : (
                      <span
                        title="Booking Confirmed"
                        className="px-3 py-1 rounded-full text-xs border border-green-400/30 bg-green-500/10 text-green-300"
                      >
                        Confirmed
                      </span>
                    )}

                
                    <button
                      title="Download Ticket"
                      disabled={b.status === "EXPIRED"}
                      onClick={() => handlePrint(b)}
                      className="flex items-center justify-center w-10 h-10 rounded-xl border border-cyan-400/30 text-cyan-300 hover:bg-cyan-500/10 transition disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <FiDownload size={18} />
                    </button>

                    <button
                      type="button"
                      disabled={b.status === "EXPIRED"}
                      onClick={() => openEditMode(b)}
                      title="Edit"
                      className="flex items-center gap-2 h-10 px-3 rounded-xl border border-amber-300/30 text-amber-300 hover:bg-amber-500/10 transition text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <MdEdit size={18} />
                      Edit
                    </button>

                
                    <button
                      title="Refund Ticket"
                      disabled={actionId === b.id || b.status === "EXPIRED"}
                      onClick={() => refundTicket(b.id)}
                      className="flex items-center justify-center w-10 h-10 rounded-xl border border-purple-400/30 text-purple-300 hover:bg-purple-500/10 transition disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <BiUndo size={20} />
                    </button>

                  </div>

                </div>

                {editingBookingId === b.id && b.status !== "EXPIRED" && (
                  <div className="mt-6 rounded-2xl border border-cyan-400/25 bg-cyan-500/5 p-4 space-y-4">
                    <p className="text-sm text-cyan-300 font-medium">
                      Edit Mode
                    </p>
                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        disabled={savingDate || actionId === b.id}
                        onClick={() => handleSeatRedirect(b)}
                        className="px-4 py-2 rounded-xl border border-cyan-400/30 text-cyan-300 hover:bg-cyan-500/10 transition disabled:opacity-50"
                      >
                        Change Seat
                      </button>
                      <button
                        type="button"
                        disabled={savingDate || actionId === b.id}
                        onClick={() => handleBusRedirect(b)}
                        className="px-4 py-2 rounded-xl border border-purple-400/30 text-purple-300 hover:bg-purple-500/10 transition disabled:opacity-50"
                      >
                        Change Bus
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3 items-end">
                      <div>
                        <label className="block text-sm text-gray-300 mb-2">
                          Change Date
                        </label>
                        <input
                          type="date"
                          value={editDate}
                          min={new Date().toISOString().split("T")[0]}
                          onChange={(e) => setEditDate(e.target.value)}
                          disabled={savingDate}
                          className="w-full rounded-xl border border-white/20 bg-black/40 px-4 py-2 text-white outline-none focus:border-cyan-400/60 disabled:opacity-60"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDateChange(b)}
                        disabled={savingDate}
                        className="h-10 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-600 text-black font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {savingDate ? "Updating..." : "Update Date"}
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={cancelEditMode}
                      disabled={savingDate}
                      className="text-sm text-gray-400 hover:text-cyan-300 transition disabled:opacity-60"
                    >
                      Cancel Edit
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

    
        {!loading && bookings.length > 0 && (
          <div className="mt-12 backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl p-5 text-center">
            <p className="text-gray-400">
              You have{" "}
              <span className="text-cyan-300 font-semibold">
                {bookings.length}
              </span>{" "}
              active booking{bookings.length !== 1 ? "s" : ""}
            </p>
          </div>
        )}

      </div>
    </div>
  );
};

export default UserBookings;
