import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";

export default function AdminLayout() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const isActive = (path) =>
    pathname === path || pathname.startsWith(path + "/");

  const linkClass = (path) =>
    `flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm transition-all ${
      isActive(path)
        ? "bg-gradient-to-r from-cyan-500 to-purple-600 text-black font-semibold shadow-lg"
        : "text-gray-300 hover:bg-white/10 hover:text-white"
    }`;

  const getTitle = () => {
    if (pathname.startsWith("/admin/buses")) return "Manage Buses";
    if (pathname.startsWith("/admin/bookings")) return "Manage Bookings";
    if (pathname.startsWith("/admin/scan-ticket")) return "Scan Ticket";
    if (pathname.startsWith("/admin")) return "Dashboard";
    return "Admin";
  };

  const handleLogout = () => {
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
    navigate("/login");
  };

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
  }, [open]);

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-black via-slate-900 to-black text-white">
      <button
        onClick={() => setOpen(true)}
        className="md:hidden fixed top-4 left-4 z-50 rounded-xl bg-white/10 px-3 py-2 text-sm backdrop-blur-xl shadow"
      >
        ☰
      </button>

      {open && (
        <div
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm md:hidden"
        />
      )}

      <aside
        className={`fixed md:static inset-y-0 left-0 z-40 w-72 transform bg-white/5 backdrop-blur-2xl border-r border-white/10 px-6 py-8 flex flex-col transition-transform duration-300 ${
          open ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        <div className="mb-10 space-y-1">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">
            Admin Panel
          </h2>
          <p className="text-xs text-gray-400">Bus Booking Platform</p>
        </div>

        <nav className="space-y-2">
          <Link to="/admin" className={linkClass("/admin")} onClick={() => setOpen(false)}>
            📊 Dashboard
          </Link>
          <Link to="/admin/buses" className={linkClass("/admin/buses")} onClick={() => setOpen(false)}>
            🚌 Manage Buses
          </Link>
          <Link to="/admin/bookings" className={linkClass("/admin/bookings")} onClick={() => setOpen(false)}>
            📄 Manage Bookings
          </Link>
          <Link to="/admin/scan-ticket" className={linkClass("/admin/scan-ticket")} onClick={() => setOpen(false)}>
            📷 Scan Ticket
          </Link>
        </nav>

        <div className="mt-auto pt-6 border-t border-white/10">
          <button
            onClick={handleLogout}
            className="w-full rounded-xl border border-red-400/30 px-3 py-2 text-sm text-red-300 hover:bg-red-500/10 transition"
          >
            🚪 Logout
          </button>

          <p className="mt-4 text-xs text-gray-500 text-center">
            BusBooking Admin © 2026
          </p>
        </div>
      </aside>

      <div className="flex-1 flex flex-col">
        <header className="h-16 md:h-18 bg-white/5 backdrop-blur-xl border-b border-white/10 px-6 md:px-10 flex items-center justify-between">
          <h1 className="text-lg md:text-xl font-semibold">{getTitle()}</h1>
          <div className="text-xs md:text-sm text-gray-400">Admin Access</div>
        </header>

        <main className="flex-1 p-4 md:p-10">
          <Outlet />
        </main>
      </div>
    </div>
  );
}