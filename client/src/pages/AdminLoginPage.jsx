import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { apiFetch } from "../lib/api.js";

const PLATFORM_ROLES = new Set(["super_admin", "platform_admin"]);

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const response = await apiFetch("/api/auth/login", {
        includeWorkspace: false,
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.message || `Sign-in failed (${response.status})`);
      if (!PLATFORM_ROLES.has(body.user?.role)) {
        // Do not leave a regular workspace session behind after a rejected admin login.
        localStorage.removeItem("bizlift_token");
        localStorage.removeItem("bizlift_user");
        sessionStorage.removeItem("selected_office");
        sessionStorage.removeItem("selected_vendor");
        throw new Error("This account is not assigned a platform administrator role. Use your workspace sign-in instead.");
      }
      localStorage.setItem("bizlift_token", body.token);
      localStorage.setItem("bizlift_user", JSON.stringify(body.user));
      navigate("/admin", { replace: true });
    } catch (err) {
      setError(err.message || "Unable to sign in. Check that the backend is running.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="bizlift-advanced-page min-h-screen bg-[#080a09] px-5 py-12 text-white md:px-8">
      <div className="mx-auto max-w-xl">
        <Link to="/portal" className="inline-flex items-center gap-2 text-sm text-white/55 transition hover:text-[#9ad17b]"><ArrowLeft size={16} /> Back to workspace portal</Link>
        <section className="mt-10 rounded-[28px] border border-white/10 bg-white/[.035] p-7 shadow-2xl md:p-10">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[#9ad17b]/25 bg-[#9ad17b]/10 text-[#9ad17b]"><ShieldCheck size={28} /></div>
          <p className="mt-7 text-xs font-semibold uppercase tracking-[.22em] text-[#9ad17b]">BizLift Platform</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">Administrator sign in</h1>
          <p className="mt-3 leading-7 text-white/55">For authorized platform administrators managing organizations and outlets across BizLift.</p>
          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div><label htmlFor="admin-email" className="mb-2 block text-sm text-white/70">Administrator email</label><input id="admin-email" type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="admin@your-organization.com" className="w-full rounded-xl border border-white/15 bg-black/30 px-4 py-3.5 text-white outline-none placeholder:text-white/25 focus:border-[#9ad17b]/70" /></div>
            <div><label htmlFor="admin-password" className="mb-2 block text-sm text-white/70">Password</label><input id="admin-password" type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter your password" className="w-full rounded-xl border border-white/15 bg-black/30 px-4 py-3.5 text-white outline-none placeholder:text-white/25 focus:border-[#9ad17b]/70" /></div>
            {error && <div role="alert" className="rounded-xl border border-red-400/25 bg-red-400/10 p-3 text-sm leading-6 text-red-200">{error}</div>}
            <button type="submit" disabled={loading} className="w-full rounded-xl bg-[#9ad17b] px-5 py-3.5 font-semibold text-black transition hover:bg-[#b0e294] disabled:cursor-not-allowed disabled:opacity-60">{loading ? "Verifying access…" : "Sign in to administration"}</button>
          </form>
          <p className="mt-6 border-t border-white/10 pt-5 text-xs leading-5 text-white/40">Admin access is provisioned by an existing platform administrator or deployment operator. Public self-registration is intentionally disabled.</p>
        </section>
      </div>
    </main>
  );
}
