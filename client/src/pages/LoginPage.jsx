import { Link, useParams, useNavigate } from "react-router-dom";
import { useState } from "react";
import { apiFetch } from "../lib/api.js";
import { BizLift3D, IntelligenceRibbon } from "../components/BizLiftExperience.jsx";

function formatVendorName(vendorId = "") {
  return vendorId
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function LoginPage() {
  const { vendorId } = useParams();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const vendorName = vendorId ? formatVendorName(vendorId) : "your workspace";

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const response = await apiFetch("/api/auth/login", {
        includeWorkspace: false,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim(),
          password,
        }),
      });

      const rawText = await response.text();
      let data = {};

      try {
        data = rawText ? JSON.parse(rawText) : {};
      } catch (parseError) {
        throw new Error(
          `Server returned invalid JSON: ${rawText || "empty response"}`,
        );
      }

      if (!response.ok) {
        const detail = data.message || data.error || `Login request failed (${response.status})`;
        throw new Error(detail);
      }

      // Store auth state
      localStorage.setItem("bizlift_token", data.token);
      localStorage.setItem("bizlift_user", JSON.stringify(data.user));

      // Sync with existing workspace state logic
      const resolvedOffice = data.user?.officeId || "";
      const resolvedVendor = data.user?.vendorId || vendorId || "";

      sessionStorage.setItem("selected_office", resolvedOffice);
      sessionStorage.setItem("selected_vendor", resolvedVendor);

      if (!resolvedOffice) {
        throw new Error("Login succeeded, but no workspace was assigned to this account.");
      }

      // Replace the login route so the dashboard mounts immediately with the new auth state.
      navigate("/dashboard", { replace: true });
    } catch (err) {
      console.error("Login error:", err);
      setError(err.message || "Unable to sign in. Please check the backend server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bizlift-advanced-page bizlift-auth-page min-h-screen bg-black text-white flex flex-col">
      {/* Main */}
      <main className="relative flex-1 overflow-hidden px-6 py-12 md:px-10 lg:px-14">
        <div className="absolute -right-20 top-0 h-[520px] w-[520px] opacity-60"><BizLift3D compact /></div>
        <div className="mx-auto max-w-6xl">
          {/* Top intro */}
          <div className="relative z-10 text-center">
            <div className="mb-5 flex justify-center"><IntelligenceRibbon label="SECURE ACCESS" value="Workspace identity verified at sign-in" /></div>
            <p className="inline-flex rounded-full border border-[#9ad17b]/30 bg-[#9ad17b]/10 px-4 py-2 text-sm text-[#d8f0cb]">
              Vendor Login Access
            </p>

            <h1 className="mt-6 text-4xl font-semibold tracking-tight text-white md:text-6xl">
              Sign in to {vendorName}
            </h1>

            <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-white/65 md:text-lg">
              Access your workspace dashboard, inventory intelligence, demand
              insights, and vendor-specific analytics.
            </p>
          </div>

          {/* Login card */}
          <div className="bizlift-feature-card mx-auto mt-14 max-w-2xl rounded-[32px] border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-sm md:p-10">
            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <label className="mb-3 block text-sm font-medium text-white/70">
                  Business Email
                </label>
                <input
                  type="email"
                  placeholder="vendor@bizlift.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-[18px] border border-white/10 bg-black/20 px-4 py-4 text-white outline-none placeholder:text-white/30 focus:border-[#9ad17b]/40"
                  required
                />
              </div>

              <div>
                <label className="mb-3 block text-sm font-medium text-white/70">
                  Password
                </label>
                <input
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-[18px] border border-white/10 bg-black/20 px-4 py-4 text-white outline-none placeholder:text-white/30 focus:border-[#9ad17b]/40"
                  required
                />
              </div>

              <div className="text-sm text-white/50">
                Secure workspace access
                {vendorId ? (
                  <span className="ml-2 text-[#9ad17b]">
                    • {formatVendorName(vendorId)}
                  </span>
                ) : (
                  <span className="ml-2 text-white/35">
                    • Workspace is detected from your account
                  </span>
                )}
              </div>

              {error ? (
                <div className="rounded-[14px] border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200">
                  {error}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-[18px] bg-[#9ad17b] px-6 py-4 text-sm font-semibold text-black transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Signing In..." : "Sign In"}
              </button>
            </form>

            <div className="mt-8 border-t border-white/10 pt-6 text-center text-sm text-white/45">
              This is a demo login flow for BizLift vendor workspace access.
            </div>

            <div className="mt-6 text-center">
              <Link
                to="/portal"
                className="text-sm text-[#9ad17b] hover:text-[#b8e6a4] transition"
              >
                ← Back to workspace portal
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-[#080808] px-6 py-10 md:px-10 lg:px-14">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 md:grid-cols-3">
          <div>
            <h3 className="text-2xl font-semibold text-white">BizLift</h3>
            <p className="mt-3 max-w-md leading-7 text-white/55">
              AI-powered operations platform for office food vendors and smart
              workspace management.
            </p>
          </div>

          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-[#9ad17b]">
              Login Flow
            </p>
            <div className="mt-4 space-y-3 text-white/60">
              <p>Vendor Authentication</p>
              <p>Workspace Access</p>
              <p>Analytics Dashboard</p>
            </div>
          </div>

          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-[#9ad17b]">
              Quick Access
            </p>
            <div className="mt-4 space-y-3 text-white/60">
              <Link to="/portal" className="block hover:text-white transition">
                Back to Portal
              </Link>
              <p>BizLift Login</p>
            </div>
          </div>
        </div>

        <div className="mx-auto mt-10 max-w-7xl border-t border-white/10 pt-6 text-sm text-white/40">
          © 2026 BizLift. Built for office food vendors and smart business
          operations.
        </div>
      </footer>
    </div>
  );
}

export default LoginPage;
