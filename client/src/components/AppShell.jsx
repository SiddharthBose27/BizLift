import { useEffect, useMemo, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  BarChart3,
  Bell,
  ChevronDown,
  ClipboardList,
  LayoutDashboard,
  Menu,
  Package,
  PanelLeftClose,
  PanelLeftOpen,
  ReceiptText,
  Settings,
  ShoppingCart,
  Sparkles,
  Store,
  Truck,
  X,
  LogOut,
} from "lucide-react";
import { apiFetch, getStoredToken } from "../lib/api.js";

const groups = [
  {
    label: "Workspace",
    items: [
      { to: "/dashboard", label: "Overview", icon: LayoutDashboard },
      { to: "/pos", label: "POS", icon: ShoppingCart },
      { to: "/inventory", label: "Inventory", icon: Package },
      { to: "/reports", label: "Reports", icon: BarChart3 },
    ],
  },
  {
    label: "Operations",
    items: [
      { to: "/reports", label: "Operations Reports", icon: ReceiptText },
      { to: "/inventory", label: "Stock Control", icon: ClipboardList },
      { to: "/pos", label: "Orders & Billing", icon: Store },
    ],
  },
  {
    label: "Intelligence",
    items: [
      { to: "/dashboard", label: "Decision Center", icon: Sparkles },
      { to: "/reports", label: "Business Analytics", icon: BarChart3 },
    ],
  },
];

function navClass({ isActive }) {
  return [
    "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition",
    isActive
      ? "bg-[#ff6b35]/10 text-[#ff6b35] shadow-sm"
      : "text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]",
  ].join(" ");
}

export default function AppShell({ children, theme, toggleTheme }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const user = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("bizlift_user") || "null");
    } catch {
      return null;
    }
  }, [location.pathname]);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const workspace = sessionStorage.getItem("selected_vendor") || user?.vendorId || "workspace";
  const office = sessionStorage.getItem("selected_office") || user?.officeId || "";

  const logout = async () => {
    setLoggingOut(true);
    try {
      if (getStoredToken()) {
        await apiFetch("/api/auth/logout", { method: "POST", includeWorkspace: false });
      }
    } catch {
      // Local auth state is still cleared below if the API is unavailable.
    } finally {
      localStorage.removeItem("bizlift_token");
      localStorage.removeItem("bizlift_user");
      sessionStorage.removeItem("selected_office");
      sessionStorage.removeItem("selected_vendor");
      setLoggingOut(false);
      navigate("/", { replace: true });
    }
  };

  const Sidebar = ({ mobile = false }) => (
    <aside
      className={[
        "flex h-full flex-col border-r border-[var(--border)] bg-[var(--surface)]",
        mobile ? "w-[290px]" : collapsed ? "w-[76px]" : "w-[258px]",
      ].join(" ")}
    >
      <div className="flex h-20 items-center justify-between border-b border-[var(--border)] px-4">
        <button
          type="button"
          onClick={() => navigate("/dashboard")}
          className="flex min-w-0 items-center gap-3 text-left"
          aria-label="Go to BizLift overview"
        >
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[#ff6b35] text-lg font-black text-white shadow-lg shadow-[#ff6b35]/20">B</span>
          {(!collapsed || mobile) && (
            <span className="min-w-0">
              <span className="block truncate text-lg font-bold tracking-tight">BizLift</span>
              <span className="block truncate text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Food operations</span>
            </span>
          )}
        </button>
        {mobile && (
          <button className="rounded-lg p-2 text-[var(--muted)] hover:bg-[var(--surface-2)]" onClick={() => setMobileOpen(false)} aria-label="Close navigation">
            <X size={18} />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-5">
        {groups.map((group) => (
          <div key={group.label} className="mb-6">
            {(!collapsed || mobile) && (
              <div className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--muted)]">{group.label}</div>
            )}
            <div className="space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink key={`${group.label}-${item.label}`} to={item.to} className={navClass} title={collapsed && !mobile ? item.label : undefined}>
                    <Icon size={18} strokeWidth={1.8} />
                    {(!collapsed || mobile) && <span>{item.label}</span>}
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-[var(--border)] p-3">
        <NavLink to="/settings" className={navClass}>
          <Settings size={18} strokeWidth={1.8} />
          {(!collapsed || mobile) && <span>Settings</span>}
        </NavLink>
      </div>
    </aside>
  );

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <div className="flex min-h-screen">
        <div className="hidden lg:block">
          <Sidebar />
        </div>

        {mobileOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <button className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setMobileOpen(false)} aria-label="Close navigation overlay" />
            <div className="relative h-full">
              <Sidebar mobile />
            </div>
          </div>
        )}

        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--background)]/85 backdrop-blur-xl">
            <div className="flex h-16 items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
              <div className="flex min-w-0 items-center gap-3">
                <button className="rounded-xl p-2 hover:bg-[var(--surface-2)] lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Open navigation">
                  <Menu size={20} />
                </button>
                <button className="hidden rounded-xl p-2 hover:bg-[var(--surface-2)] lg:block" onClick={() => setCollapsed((value) => !value)} aria-label={collapsed ? "Expand navigation" : "Collapse navigation"}>
                  {collapsed ? <PanelLeftOpen size={19} /> : <PanelLeftClose size={19} />}
                </button>
                <div className="hidden min-w-0 sm:block">
                  <div className="truncate text-sm font-semibold">{workspace.replace(/-/g, " ")}</div>
                  <div className="truncate text-[11px] capitalize text-[var(--muted)]">{office.replace(/-/g, " ") || "Business workspace"}</div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button className="hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs font-medium text-[var(--muted)] hover:text-[var(--foreground)] sm:flex sm:items-center sm:gap-2" onClick={() => navigate("/reports")}>
                  <Truck size={15} /> Analytics
                </button>
                <button className="rounded-xl p-2.5 text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]" aria-label="Notifications">
                  <Bell size={18} />
                </button>
                <button className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs font-semibold hover:bg-[var(--surface-2)]" onClick={toggleTheme} title="Toggle theme">
                  {theme === "dark" ? "Light" : "Dark"}
                </button>
                <button className="group flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 hover:bg-[var(--surface-2)]" onClick={logout} disabled={loggingOut}>
                  <span className="grid h-7 w-7 place-items-center rounded-lg bg-[#ff6b35]/10 text-xs font-bold text-[#ff6b35]">{String(user?.name || workspace).charAt(0).toUpperCase()}</span>
                  <span className="hidden max-w-28 truncate text-xs font-semibold md:block">{user?.name || workspace}</span>
                  {loggingOut ? <LogOut size={14} className="animate-pulse" /> : <ChevronDown size={14} className="text-[var(--muted)]" />}
                </button>
              </div>
            </div>
          </header>

          <main className="min-w-0">{children}</main>
        </div>
      </div>
    </div>
  );
}
