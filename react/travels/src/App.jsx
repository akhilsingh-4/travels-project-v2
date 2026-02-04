import React, { useState } from "react";
import { Routes, Route } from "react-router-dom";
import LoginForm from "./components/LoginForm";
import RegisterForm from "./components/RegisterForm";
import BusList from "./components/BusList";
import BusSeats from "./components/BusSeats";
import UserBookings from "./components/UserBookings";
import Wrapper from "./components/Wrapper";
import UserProfile from "./components/UserProfile";

const App = () => {
  const [token, setToken] = useState(localStorage.getItem("access"));

  const handleLogin = (access, refresh) => {
    setToken(access);
    localStorage.setItem("access", access);
    localStorage.setItem("refresh", refresh);
  };

  const handleLogout = () => {
    setToken(null);
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
  };

  return (
    <Wrapper token={token} handleLogout={handleLogout}>
      <Routes>
        <Route path="/" element={<BusList />} />
        <Route path="/bus/:busId" element={<BusSeats />} />
        <Route path="/login" element={<LoginForm onLogin={handleLogin} />} />
        <Route path="/register" element={<RegisterForm />} />
        <Route path="/my-bookings" element={<UserBookings />} />
        <Route path="/profile" element={<UserProfile />} />
      </Routes>
    </Wrapper>
  );
};

export default App;
