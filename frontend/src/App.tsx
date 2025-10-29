import { Link, Outlet, useLocation } from "react-router-dom";

export default function App() {
  const { pathname } = useLocation();
  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 font-sans">
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur border-b border-gray-200 mb-6">
        <div className="flex items-center justify-between py-3">
          <h1 className="m-0 text-2xl font-semibold tracking-tight">
            NHIS Fraud Auditor Dashboard
          </h1>
          <nav className="flex gap-3">
            <Link
              className={`px-2 py-1 rounded hover:bg-gray-100 cursor-pointer ${
                pathname === "/" ? "text-blue-600 font-medium" : ""
              }`}
              to="/"
            >
              Dashboard
            </Link>
            <Link
              className={`px-2 py-1 rounded hover:bg-gray-100 cursor-pointer ${
                pathname.startsWith("/claims")
                  ? "text-blue-600 font-medium"
                  : ""
              }`}
              to="/claims"
            >
              Claims
            </Link>
          </nav>
        </div>
      </header>
      <Outlet />
      <footer className="mt-8 text-gray-600 text-xs">
        Built for NHIS claims auditing. Demo only.
      </footer>
    </div>
  );
}
