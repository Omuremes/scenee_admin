import { NavLink, Outlet } from "react-router-dom";

import { useAuth } from "../auth/auth";

const navItems = [
  { to: "/admin", label: "Dashboard", end: true },
  { to: "/admin/actors", label: "Actors" },
  { to: "/admin/movies", label: "Movies" },
  { to: "/admin/categories", label: "Categories" },
  { to: "/admin/events", label: "Events" },
];

export function AdminLayout() {
  const { user, logout } = useAuth();

  return (
    <div className="admin-shell">
      <aside className="sidebar">
        <div className="sidebar__brand">
          <p className="eyebrow">Scenee Backend</p>
          <h1>Admin Panel</h1>
        </div>
        <nav className="sidebar__nav">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `nav-link${isActive ? " nav-link--active" : ""}`}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar__footer">
          <div>
            <strong>{user?.username || user?.email || "Admin"}</strong>
            <p>{user?.role}</p>
          </div>
          <button type="button" className="button button--ghost" onClick={logout}>
            Log out
          </button>
        </div>
      </aside>
      <main className="main-panel">
        <Outlet />
      </main>
    </div>
  );
}
