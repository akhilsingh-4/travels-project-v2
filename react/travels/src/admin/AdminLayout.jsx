import { Outlet, Link, useLocation } from "react-router-dom";

export default function AdminLayout() {
  const { pathname } = useLocation();

  const isActive = (path) =>
    pathname === path || pathname.startsWith(path + "/");

  const linkClass = (path) =>
    `flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition ${
      isActive(path)
        ? "bg-gradient-to-r from-cyan-500 to-purple-600 text-black font-semibold shadow"
        : "text-gray-300 hover:bg-white/10 hover:text-white"
    }`;

  const getTitle = () => {
    if (pathname.startsWith("/admin/buses")) return "Manage Buses";
    if (pathname.startsWith("/admin/bookings")) return "Manage Bookings";
    if (pathname.startsWith("/admin")) return "Dashboard";
    return "Admin";
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-black via-slate-900 to-black text-white">
      
      <aside className="w-64 bg-white/5 backdrop-blur-xl border-r border-white/10 p-6 flex flex-col">
        <div className="mb-10">
          <h2 className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">
            Admin Panel
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            Manage your platform
          </p>
        </div>

        <nav className="space-y-3">
          <Link to="/admin" className={linkClass("/admin")}>
            📊 Dashboard
          </Link>

          <Link to="/admin/buses" className={linkClass("/admin/buses")}>
            🚌 Manage Buses
          </Link>

          <Link to="/admin/bookings" className={linkClass("/admin/bookings")}>
            📄 Manage Bookings
          </Link>
          <Link to="/admin/scan-ticket" className={linkClass("/admin/scan-ticket")}>
            📷 Scan Ticket
          </Link>
        </nav>

        <div className="mt-auto pt-10 text-xs text-gray-500">
          BusBooking Admin © 2026
        </div>
      </aside>

     
      <div className="flex-1 flex flex-col">
        <header className="h-16 bg-white/5 backdrop-blur-xl border-b border-white/10 px-8 flex items-center justify-between">
          <h1 className="text-lg font-semibold">{getTitle()}</h1>
          <div className="text-sm text-gray-400">Admin Access</div>
        </header>

        <main className="flex-1 p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
