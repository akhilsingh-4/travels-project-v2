import { Outlet, Link, useLocation } from "react-router-dom";

export default function AdminLayout() {
  const { pathname } = useLocation();

  const linkClass = (path) =>
    `block rounded-lg px-3 py-2 transition ${
      pathname === path
        ? "bg-indigo-600 text-white"
        : "text-gray-300 hover:bg-white/10 hover:text-white"
    }`;

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-black via-gray-900 to-black">
      {/* Sidebar */}
      <aside className="w-64 bg-white/5 backdrop-blur-xl border-r border-white/10 p-5">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-white">Admin Panel</h2>
          <p className="text-xs text-gray-400 mt-1">Manage your platform</p>
        </div>

        <nav className="space-y-2">
          <Link to="/admin/buses" className={linkClass("/admin/buses")}>
            🚌 Manage Buses
          </Link>
          {/* add more links later */}
        </nav>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col">
        {/* Top bar */}
        <header className="h-14 bg-white/5 backdrop-blur-xl border-b border-white/10 px-6 flex items-center">
          <h1 className="text-white font-medium">Admin Dashboard</h1>
        </header>

        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
