import React, { useState } from "react";
import { Routes, Route } from "react-router-dom";
import LoginForm from "./pages/LoginForm";
import RegisterForm from "./pages/RegisterForm";
import BusSeats from "./components/BusSeats";
import BusList from "./components/BusList";
import UserBookings from "./pages/UserBookings";
import Wrapper from "./components/Wrapper";
import UserProfile from "./pages/UserProfile";
import ForgotPassword from "./pages/ForgotPassword";
import MyPayments from "./pages/MyPayments";
import PaymentStatus from "./pages/PaymentStatus";
import ResetPassword from "./pages/ResetPassword";

import AdminLayout from "./admin/AdminLayout";
import ManageBuses from "./admin/pages/ManageBuses";
import AdminDashboard from "./admin/pages/AdminDashboard";
import AdminBookings from "./admin/pages/AdminBookings";
import AdminScanTicket from "./admin/pages/AdminScanTicket";
import AdminRoute from "./routes/AdminRoute";
import { toast } from "react-toastify";
import NotFound from "./NotFound";

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
    localStorage.removeItem("is_admin");
    toast.success("Logged out successfully");
  };

  return (
    <Routes>
      <Route path="/login" element={<LoginForm onLogin={handleLogin} />} />
      <Route path="/register" element={<RegisterForm />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password/:uid/:token" element={<ResetPassword />} />

      <Route element={<Wrapper token={token} handleLogout={handleLogout} />}>
        <Route path="/" element={<BusList />} />
        <Route path="/bus/:busId" element={<BusSeats />} />
        <Route path="/my-bookings" element={<UserBookings />} />
        <Route path="/profile" element={<UserProfile />} />
        <Route path="/my-payments" element={<MyPayments />} />
        <Route path="/payment-status/:orderId" element={<PaymentStatus />} />
      </Route>

      <Route
        path="/admin"
        element={
          <AdminRoute>
            <AdminLayout />
          </AdminRoute>
        }
      >
        <Route index element={<AdminDashboard />} />
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="buses" element={<ManageBuses />} />
        <Route path="bookings" element={<AdminBookings />} />
        <Route path="scan-ticket" element={<AdminScanTicket />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default App;