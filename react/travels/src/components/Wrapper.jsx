import React from "react";
import { Link, useNavigate } from "react-router-dom";

const Wrapper = ({ token, handleLogout, children }) => {
  const navigate = useNavigate();

  return (
    <div>
      <nav className="border-b p-3 flex justify-between">
        <Link to="/">Bus Booking</Link>

        {token ? (
          <>
            <Link to="/my-bookings">My Bookings</Link>
            <button
              onClick={() => {
                handleLogout();
                navigate("/login");
              }}
            >
              Logout
            </button>
          </>
        ) : (
          <>
            <Link to="/login">Login</Link>
            <Link to="/register">Register</Link>
          </>
        )}
      </nav>

      {children}
    </div>
  );
};

export default Wrapper;
