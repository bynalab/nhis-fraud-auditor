import { Link, Outlet, useLocation } from "react-router-dom";

export default function App() {
  const { pathname } = useLocation();
  return (
    <div
      style={{
        fontFamily: "Inter, system-ui, Avenir, Helvetica, Arial, sans-serif",
        maxWidth: 1100,
        margin: "0 auto",
        padding: 16,
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 24,
        }}
      >
        <h1 style={{ margin: 0, fontSize: 20 }}>
          NHIS Fraud Auditor Dashboard
        </h1>
        <nav style={{ display: "flex", gap: 12 }}>
          <Link
            style={{ textDecoration: pathname === "/" ? "underline" : "none" }}
            to="/"
          >
            Dashboard
          </Link>
          <Link
            style={{
              textDecoration: pathname.startsWith("/claims")
                ? "underline"
                : "none",
            }}
            to="/claims"
          >
            Claims
          </Link>
        </nav>
      </header>
      <Outlet />
      <footer style={{ marginTop: 32, color: "#666", fontSize: 12 }}>
        Built for NHIS claims auditing. Demo only.
      </footer>
    </div>
  );
}
