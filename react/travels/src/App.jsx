import React, { useState } from "react";
import { Routes, Route } from "react-router-dom";

import LoginForm from "./components/LoginForm";
import RegisterForm from "./components/RegisterForm";
import BusList from "./components/BusList";
import BusSeats from "./components/BusSeats";
import UserBookings from "./components/UserBookings";
import Wrapper from "./components/Wrapper";

const App = () => {
  const [accessToken, setAccessToken] = useState(
    localStorage.getItem("accessToken"),
  );
  const [refreshToken, setRefreshToken] = useState(
    localStorage.getItem("refreshToken"),
  );
  const [userId, setUserId] = useState(localStorage.getItem("userId"));

  // ✅ Called after successful login
  const handleLogin = (access, refresh, userId) => {
    localStorage.setItem("accessToken", access);
    localStorage.setItem("refreshToken", refresh);
    localStorage.setItem("userId", userId);

    setAccessToken(access);
    setRefreshToken(refresh);
    setUserId(userId);
  };

  // ✅ Logout (JWT = client-side only)
  const handleLogout = () => {
    localStorage.clear();
    setAccessToken(null);
    setRefreshToken(null);
    setUserId(null);
  };

  return (
    <Wrapper token={accessToken} handleLogout={handleLogout}>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<BusList />} />
        <Route path="/login" element={<LoginForm onLogin={handleLogin} />} />
        <Route path="/register" element={<RegisterForm />} />

        {/* Protected routes */}
        <Route path="/bus/:busId" element={<BusSeats token={accessToken} />} />
        <Route
          path="/my-bookings"
          element={<UserBookings token={accessToken} userId={userId} />}
        />
      </Routes>
    </Wrapper>
  );
};

export default App;
