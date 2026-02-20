import { Link } from "react-router-dom";

const NotFound = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-slate-900 to-black text-white flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center backdrop-blur-2xl bg-white/5 border border-white/10 rounded-3xl p-10 shadow-[0_0_40px_rgba(34,211,238,0.2)]">
        <div className="text-6xl mb-4">🚫</div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-300 to-purple-400 bg-clip-text text-transparent">
          Page Not Found
        </h1>
        <p className="text-gray-400 mt-2">
          The page you’re looking for doesn’t exist or was moved.
        </p>

        <Link
          to="/"
          className="inline-block mt-6 px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-600 text-black font-semibold shadow hover:shadow-cyan-500/40 transition"
        >
          Go to Home
        </Link>
      </div>
    </div>
  );
};

export default NotFound;