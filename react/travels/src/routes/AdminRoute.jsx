import { Navigate } from "react-router-dom";

export default function AdminRoute({ children }) {
  const isAdmin = localStorage.getItem("is_admin") === "true";
  return isAdmin ? children : <Navigate to="/" replace />;
}
