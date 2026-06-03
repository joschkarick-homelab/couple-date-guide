import { NavLink, Outlet } from "react-router-dom";
import { useEffect, useState } from "react";
import { api, redirectToLogin } from "../api";
import type { Me } from "../types";

const NAV_ITEMS = [
  { to: "/", label: "Übersicht", icon: "💜" },
  { to: "/ideas", label: "Ideen", icon: "✨" },
  { to: "/dates", label: "Dates", icon: "📅" },
  { to: "/finder", label: "Finder", icon: "🔮" },
  { to: "/preferences", label: "Profil", icon: "⚙️" },
];

export function Layout() {
  const [me, setMe] = useState<Me | null>(null);

  useEffect(() => {
    api.me().then(setMe).catch(() => setMe(null));
  }, []);

  const initials = me?.email
    ? me.email.slice(0, 2).toUpperCase()
    : me?.name?.slice(0, 2).toUpperCase() || "?";
  const loggedOut = me === null;

  return (
    <div className="mx-auto flex min-h-full max-w-3xl flex-col px-4 pb-24 pt-4">
      <header className="mb-4 flex items-center justify-between">
        <h1 className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-2xl font-bold text-transparent">
          Unsere Dates
        </h1>
        {loggedOut ? (
          <button
            onClick={redirectToLogin}
            className="flex h-9 items-center gap-1.5 rounded-full bg-secondary px-3 text-xs font-bold text-bg hover:opacity-90"
            title="Erneut anmelden"
          >
            🔑 Login
          </button>
        ) : (
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-sm font-bold text-bg">
            {initials}
          </div>
        )}
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-surface/95 backdrop-blur-lg">
        <div className="mx-auto flex max-w-3xl items-stretch justify-around px-2 py-1.5">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                `flex flex-1 flex-col items-center gap-0.5 rounded-xl px-2 py-2 text-[11px] font-medium transition ${
                  isActive
                    ? "bg-primary/15 text-primary"
                    : "text-text-muted hover:text-text"
                }`
              }
            >
              <span className="text-lg leading-none">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
