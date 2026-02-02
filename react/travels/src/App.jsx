import React, { useState } from "react";
import { Routes, Route } from "react-router-dom";

import LoginForm from "./components/LoginForm";
import RegisterForm from "./components/RegisterForm";
import BusList from "./components/BusList";
import BusSeats from "./components/BusSeats";
import UserBookings from "./components/UserBookings";
import Wrapper from "./components/Wrapper";

const App = () => {
  const [token, setToken] = useState(null);
  const [userId, setUserId] = useState(null);

  const handleLogin = (token, userId) => {
    setToken(token);
    setUserId(userId);
  };

  const handleLogout = () => {
    setToken(null);
    setUserId(null);
  };

  return (
 
      <Wrapper token={token} handleLogout={handleLogout}>
        <Routes>
          <Route path="/" element={<BusList />} />
          <Route path="/bus/:busId" element={<BusSeats token={token} />} />
          <Route
            path="/login"
            element={<LoginForm onLogin={handleLogin} />}
          />
          <Route path="/register" element={<RegisterForm />} />
          <Route
            path="/my-bookings"
            element={
              <UserBookings token={token} userId={userId} />
            }
          />
        </Routes>
      </Wrapper>
  
  );
};

export default App;