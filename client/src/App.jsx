import { Routes, Route, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import Lenis from "lenis";
import LandingPage from "./pages/LandingPage";
import PortalPage from "./pages/PortalPage";
import VendorPage from "./pages/VendorPage";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import InventoryPage from "./pages/InventoryPage";
import POSPage from "./pages/POSPage";
import ReportsPage from "./pages/ReportsPage";
import { ExperienceLayer, IntelligenceRibbon } from "./components/BizLiftExperience.jsx";
import AppErrorBoundary from "./components/AppErrorBoundary.jsx";
import NotFoundPage from "./pages/NotFoundPage.jsx";
import AdminPortal from "./pages/AdminPortal.jsx";
import AdminLoginPage from "./pages/AdminLoginPage.jsx";
import OrganizationAdminPortal from "./pages/OrganizationAdminPortal.jsx";
import OrganizationAdminLoginPage from "./pages/OrganizationAdminLoginPage.jsx";

function Protected({ children, theme, toggleTheme }) {
  const token = localStorage.getItem("bizlift_token");
  return token ? children : <LoginPage />;
}

function App() {
  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) return undefined;
    const lenis = new Lenis({ duration: 1.05, smoothWheel: true, syncTouch: false });
    let frame;
    const raf = (time) => { lenis.raf(time); frame = requestAnimationFrame(raf); };
    frame = requestAnimationFrame(raf);
    return () => { cancelAnimationFrame(frame); lenis.destroy(); };
  }, []);

  const location = useLocation();
  const [theme, setTheme] = useState(() => localStorage.getItem("bizlift_theme") || "dark");

  const toggleTheme = () => {
    setTheme((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      localStorage.setItem("bizlift_theme", next);
      return next;
    });
  };

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [location.pathname]);

  useEffect(() => {
    const titles = {
      "/": "BizLift · Intelligent Vendor Operations",
      "/portal": "Workspace Network · BizLift",
      "/login": "Secure Access · BizLift",
      "/dashboard": "Command Center · BizLift",
      "/pos": "POS & Billing · BizLift",
      "/inventory": "Inventory · BizLift",
      "/reports": "Analytics · BizLift",
      "/admin": "Super Admin · BizLift",
      "/admin/login": "Administrator Sign In · BizLift",
      "/organization-admin": "Organization Admin · BizLift",
      "/organization-admin/login": "Organization Admin Sign In · BizLift",
    };
    document.title = titles[location.pathname] || "BizLift · Vendor Operations";
  }, [location.pathname]);

  return (
    <AppErrorBoundary>
      <div data-theme={theme} className="bizlift-page-noise">
      <Routes>
        <Route path="/" element={<LandingPage toggleTheme={toggleTheme} theme={theme} />} />
        <Route path="/portal" element={<PortalPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route path="/organization-admin/login" element={<OrganizationAdminLoginPage />} />
        <Route path="/organization-admin" element={<Protected theme={theme} toggleTheme={toggleTheme}><OrganizationAdminPortal /></Protected>} />
        <Route path="/office/:officeId" element={<VendorPage />} />
        <Route path="/login/:vendorId" element={<LoginPage />} />

        {/* Existing dashboard/pages own their established sidebar + top navigation.
            Do not wrap them in a second application shell. */}
        <Route path="/admin" element={<Protected theme={theme} toggleTheme={toggleTheme}><AdminPortal /></Protected>} />
        <Route path="/dashboard" element={<Protected theme={theme} toggleTheme={toggleTheme}><DashboardPage theme={theme} toggleTheme={toggleTheme} /></Protected>} />
        <Route path="/pos" element={<Protected theme={theme} toggleTheme={toggleTheme}><POSPage theme={theme} toggleTheme={toggleTheme} /></Protected>} />
        <Route path="/reports" element={<Protected theme={theme} toggleTheme={toggleTheme}><ReportsPage theme={theme} toggleTheme={toggleTheme} /></Protected>} />
        <Route path="/inventory" element={<Protected theme={theme} toggleTheme={toggleTheme}><InventoryPage theme={theme} toggleTheme={toggleTheme} /></Protected>} />
        <Route path="/settings" element={<Protected theme={theme} toggleTheme={toggleTheme}><div className="bizlift-advanced-page relative min-h-screen overflow-hidden"><ExperienceLayer variant="settings" /><div className="relative z-10 mx-auto max-w-7xl p-6 lg:p-8"><div className="mb-5"><IntelligenceRibbon label="SYSTEM CONTROL" value="Workspace configuration" /></div><div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8"><p className="text-xs font-bold uppercase tracking-[0.18em] text-[#9ad17b]">System</p><h1 className="mt-2 text-3xl font-bold tracking-tight">Settings</h1><p className="mt-2 text-sm text-[var(--muted)]">Workspace settings will be expanded in the UX polish phase.</p></div></div></div></Protected>} />
      <Route path="*" element={<NotFoundPage />} />
      </Routes>
      </div>
    </AppErrorBoundary>
  );
}

export default App;
