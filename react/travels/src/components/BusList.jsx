import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const BusList = () => {
  const [buses, setBuses] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchBuses = async () => {
      try {
        const response = await axios.get("http://localhost:8000/api/buses/");
        setBuses(response.data);
      } catch (error) {
        console.log("Error fetching buses", error);
      }
    };
    fetchBuses();
  }, []);

  return (
    <div className="max-w-3xl mx-auto p-4">
      <h1 className="text-xl font-semibold mb-4 text-center">
        Available Buses
      </h1>

      {buses.length === 0 ? (
        <p className="text-center text-sm text-gray-500">
          No buses available
        </p>
      ) : (
        <div className="space-y-3">
          {buses.map((bus) => (
            <div key={bus.id} className="border rounded p-4">
              <p className="font-medium">{bus.bus_name}</p>
              <p className="text-sm text-gray-600">
                {bus.origin} → {bus.destination}
              </p>

              <div className="flex justify-between text-sm text-gray-700 mt-2">
                <span>Start: {bus.start_time}</span>
                <span>Reach: {bus.reach_time}</span>
              </div>

              <div className="text-right mt-3">
                <button
                  onClick={() => navigate(`/bus/${bus.id}`)}
                  className="px-3 py-1 text-sm border rounded hover:bg-gray-100"
                >
                  View Seats
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default BusList;
