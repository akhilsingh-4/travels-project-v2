import React, { useEffect, useState } from "react";
import axios from "axios";

const UserBookings = ({ token, userId }) => {
  const [bookings, setBookings] = useState([]);

  useEffect(() => {
    if (!token || !userId) return;

    axios
      .get(`http://localhost:8000/api/user/${userId}/bookings/`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      .then((res) => setBookings(res.data));
  }, [token, userId]);

  const cancelBooking = async (id) => {
    await axios.post(
      "http://localhost:8000/api/bookings/cancel/",
      { booking_id: id },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    setBookings(bookings.filter((b) => b.id !== id));
  };

  return (
    <div className="max-w-3xl mx-auto p-4">
      <h2 className="font-semibold mb-4">My Bookings</h2>

      {bookings.map((b) => (
        <div key={b.id} className="border p-3 mb-2 rounded">
          <p>Bus: {b.bus}</p>
          <p>Seat: {b.seat}</p>

          <button
            onClick={() => cancelBooking(b.id)}
            className="mt-2 text-sm text-red-600"
          >
            Cancel
          </button>
        </div>
      ))}
    </div>
  );
};

export default UserBookings;
