import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";

const BusSeats = ({ token }) => {
  const [bus, setBus] = useState(null);
  const [seats, setSeats] = useState([]);
  const { busId } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchBus = async () => {
      try {
        const res = await axios.get(
          `http://localhost:8000/api/buses/${busId}/`
        );
        setBus(res.data);
        setSeats(res.data.seats || []);
      } catch (err) {
        console.log(err);
      }
    };
    fetchBus();
  }, [busId]);

  const handleBook = async (seatId) => {
    if (!token) {
      alert("Please login to book");
      navigate("/login");
      return;
    }

    try {
      await axios.post(
        "http://localhost:8000/api/booking/",
        { seat: seatId },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setSeats((prev) =>
        prev.map((s) =>
          s.id === seatId ? { ...s, is_booked: true } : s
        )
      );

      alert("Seat booked successfully");
    } catch (err) {
      alert(err.response?.data?.error || "Booking failed");
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-4">
      {bus && (
        <div className="border rounded p-4 mb-4">
          <h2 className="font-semibold">{bus.bus_name}</h2>
          <p className="text-sm text-gray-600">
            {bus.origin} → {bus.destination}
          </p>
        </div>
      )}

      <div className="border rounded p-4">
        <h3 className="text-sm font-medium mb-3">Select Seat</h3>

        <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
          {seats.map((seat) => (
            <button
              key={seat.id}
              disabled={seat.is_booked}
              onClick={() => handleBook(seat.id)}
              className={`border rounded py-2 text-sm ${
                seat.is_booked
                  ? "text-gray-400 cursor-not-allowed"
                  : "hover:bg-gray-100"
              }`}
            >
              {seat.seat_number}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default BusSeats;
