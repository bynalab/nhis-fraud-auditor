import { Link, Outlet, useLocation } from "react-router-dom";
import { useTheme } from "./contexts/ThemeContext";

export default function App() {
  const { isDarkTheme, toggleTheme } = useTheme();

  const { pathname } = useLocation();
  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 font-sans min-h-screen bg-gray-50 text-gray-900 dark:bg-gray-900 dark:text-gray-100">
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-gray-900/80 backdrop-blur border-b border-gray-200 dark:border-gray-800 mb-6">
        <div className="flex items-center justify-between py-3">
          <h1 className="m-0 text-2xl font-semibold tracking-tight">
            NHIS Fraud Auditor Dashboard
          </h1>
          <nav className="flex gap-3">
            <Link
              className={`px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer ${
                pathname === "/" ? "text-blue-600 font-medium" : ""
              }`}
              to="/"
            >
              Dashboard
            </Link>
            <Link
              className={`px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer ${
                pathname.startsWith("/claims")
                  ? "text-blue-600 font-medium"
                  : ""
              }`}
              to="/claims"
            >
              Claims
            </Link>
            <button
              onClick={() => toggleTheme()}
              className="px-2 py-1 rounded border border-gray-300 dark:border-gray-700 cursor-pointer"
              aria-label={
                isDarkTheme ? "Switch to light mode" : "Switch to dark mode"
              }
              title={
                isDarkTheme ? "Switch to light mode" : "Switch to dark mode"
              }
            >
              <span aria-hidden>{isDarkTheme ? "☀️" : "🌙"}</span>
            </button>
          </nav>
        </div>
      </header>
      <Outlet />
      <footer className="mt-8 text-gray-600 dark:text-gray-400 text-xs">
        Built for NHIS claims auditing. Demo only.
      </footer>
    </div>
  );
}
