import { useCallback, useEffect, useState } from "react";
import { Building2, Store, Users, RefreshCw, Plus, ShieldCheck, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

const API = import.meta.env.VITE_API_BASE_URL || "http://localhost:5002";
const token = () => localStorage.getItem("bizlift_token") || "";
const request = async (path, options = {}) => {
  const response = await fetch(`${API}/api/admin${path}`, { ...options, headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}`, ...(options.headers || {}) } });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.message || `Request failed (${response.status})`);
  return body.data;
};

export default function AdminPortal() {
  const [overview, setOverview] = useState(null);
  const [organizations, setOrganizations] = useState([]);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [onboarding, setOnboarding] = useState({ organizationName: "", slug: "", locationName: "", outletName: "", adminName: "", adminEmail: "" });
  const [onboardingResult, setOnboardingResult] = useState(null);
  const load = useCallback(async () => {
    setBusy(true); setError("");
    try { const [o, list] = await Promise.all([request("/overview"), request("/organizations")]); setOverview(o); setOrganizations(list || []); }
    catch (e) { setError(e.message); } finally { setBusy(false); }
  }, []);
  useEffect(() => { load(); }, [load]);
  const updateOnboarding = (key, value) => setOnboarding((current) => {
    const next = { ...current, [key]: value };
    if (key === "organizationName" && (!current.slug || current.slug === current.organizationName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""))) next.slug = value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    return next;
  });
  const submitOnboarding = async (event) => {
    event.preventDefault(); setError(""); setMessage(""); setOnboardingResult(null); setBusy(true);
    try {
      const result = await request("/onboarding", { method: "POST", body: JSON.stringify(onboarding) });
      setOnboardingResult(result); setMessage("Organization onboarding completed. Administrator activation is still pending.");
      setOnboarding({ organizationName: "", slug: "", locationName: "", outletName: "", adminName: "", adminEmail: "" }); await load();
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  };
  const createOrganization = async (event) => {
    event.preventDefault(); setError(""); setMessage(""); setBusy(true);
    try { await request("/organizations", { method: "POST", body: JSON.stringify({ name, slug }) }); setMessage("Organization created successfully."); setName(""); setSlug(""); await load(); }
    catch (e) { setError(e.message); } finally { setBusy(false); }
  };
  return <main className="min-h-screen bg-[#0b0d0c] text-white px-5 py-8 md:px-10">
    <div className="mx-auto max-w-7xl space-y-8">
      <header className="flex flex-wrap items-center justify-between gap-4"><div><Link to="/portal" className="mb-4 inline-flex items-center gap-2 text-sm text-white/60 hover:text-[#9ad17b]"><ArrowLeft size={16}/> Back to portal</Link><div className="flex items-center gap-3"><ShieldCheck className="text-[#9ad17b]" size={30}/><div><p className="text-xs uppercase tracking-[.2em] text-[#9ad17b]">BizLift platform</p><h1 className="text-3xl font-semibold">Super Admin</h1></div></div><p className="mt-2 text-white/55">Manage organizations and monitor registered outlets.</p></div><button onClick={load} disabled={busy} className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-4 py-3 hover:border-[#9ad17b]/60"><RefreshCw size={16} className={busy ? "animate-spin" : ""}/> Refresh</button></header>
      {error && <div role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-200">{error}{error.includes("Platform administrator") && <p className="mt-1 text-sm">Sign in with an account assigned the `super_admin` or `platform_admin` role.</p>}</div>}
      {message && <div className="rounded-xl border border-[#9ad17b]/30 bg-[#9ad17b]/10 p-4 text-[#c7f4ac]">{message}</div>}
      <section className="rounded-2xl border border-[#9ad17b]/20 bg-[#9ad17b]/[.045] p-6">
        <p className="text-xs font-semibold uppercase tracking-[.16em] text-[#9ad17b]">New customer setup</p><h2 className="mt-2 text-xl font-semibold">Onboard an organization</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-white/55">Create the organization, first location, first outlet, and a pending organization-administrator account in one transaction.</p>
        <form onSubmit={submitOnboarding} className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[['organizationName','Organization name','Bennett University'],['slug','Organization slug','bennett-university'],['locationName','First location','TechPark One'],['outletName','First outlet','SnapEats'],['adminName','Administrator name','Organization Admin'],['adminEmail','Administrator email','admin@example.com']].map(([key,label,placeholder])=><label key={key} className="block text-sm text-white/70">{label}<input required value={onboarding[key]} onChange={e=>updateOnboarding(key,e.target.value)} type={key==='adminEmail'?'email':'text'} minLength={key==='slug'?3:undefined} pattern={key==='slug'?'[a-z0-9][a-z0-9-]{1,58}[a-z0-9]':undefined} className="mt-2 w-full rounded-xl border border-white/15 bg-black/30 px-3 py-3 text-white outline-none focus:border-[#9ad17b]" placeholder={placeholder}/></label>)}
          <div className="flex items-end"><button disabled={busy} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#9ad17b] px-4 py-3 font-semibold text-black disabled:opacity-50"><Plus size={17}/> Onboard organization</button></div>
        </form>
        {onboardingResult && <p className="mt-4 rounded-xl border border-amber-300/20 bg-amber-300/5 p-3 text-sm text-amber-100">Administrator {onboardingResult.administratorEmail} is pending activation. Invitation delivery is not configured, so no email was sent and the account cannot sign in yet.</p>}
      </section>
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[{label:"Organizations",value:overview?.organizations,icon:Building2},{label:"Locations",value:overview?.offices,icon:Store},{label:"Outlets",value:overview?.outlets,icon:Store},{label:"User accounts",value:overview?.users,icon:Users}].map((item)=><div key={item.label} className="rounded-2xl border border-white/10 bg-white/[.035] p-5"><item.icon className="mb-5 text-[#9ad17b]" size={22}/><p className="text-sm text-white/55">{item.label}</p><p className="mt-1 text-3xl font-semibold">{item.value ?? "—"}</p></div>)}</section>
      <section className="grid gap-6 lg:grid-cols-[.8fr_1.2fr]"><form onSubmit={createOrganization} className="h-fit rounded-2xl border border-white/10 bg-white/[.035] p-6"><p className="text-xs font-semibold uppercase tracking-[.16em] text-[#9ad17b]">Provisioning</p><h2 className="mt-2 text-xl font-semibold">Create organization</h2><p className="mt-2 text-sm leading-6 text-white/55">Create an organization record without setting up its first location or outlet.</p><label className="mt-5 block text-sm text-white/70">Organization name</label><input required minLength={2} value={name} onChange={e=>{setName(e.target.value); if(!slug || slug === name.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")) setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,""));}} className="mt-2 w-full rounded-xl border border-white/15 bg-black/30 px-3 py-3 outline-none focus:border-[#9ad17b]" placeholder="Bennett University"/><label className="mt-4 block text-sm text-white/70">Unique slug</label><input required pattern="[a-z0-9][a-z0-9-]{1,58}[a-z0-9]" value={slug} onChange={e=>setSlug(e.target.value)} className="mt-2 w-full rounded-xl border border-white/15 bg-black/30 px-3 py-3 outline-none focus:border-[#9ad17b]" placeholder="bennett-university"/><button disabled={busy} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#9ad17b] px-4 py-3 font-semibold text-black disabled:opacity-50"><Plus size={17}/> Create organization</button></form>
      <div className="rounded-2xl border border-white/10 bg-white/[.035] p-6"><div className="flex items-center justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[.16em] text-[#9ad17b]">Registry</p><h2 className="mt-2 text-xl font-semibold">Organizations</h2></div><span className="text-sm text-white/45">{organizations.length} total</span></div><div className="mt-5 space-y-3">{organizations.length ? organizations.map(org=><article key={org.id} className="rounded-xl border border-white/10 bg-black/20 p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-semibold">{org.name}</h3><p className="mt-1 text-xs text-white/45">/{org.slug}</p></div><span className="rounded-full border border-[#9ad17b]/25 bg-[#9ad17b]/10 px-3 py-1 text-xs text-[#b8e9a0]">Registered</span></div><div className="mt-4 flex flex-wrap gap-4 text-sm text-white/60"><span>{org.officeCount} locations</span><span>{org.outletCount} outlets</span><span>{org.userCount} users</span></div></article>) : <div className="rounded-xl border border-dashed border-white/15 p-8 text-center text-sm text-white/45">No organizations found yet. Create the first organization to begin.</div>}</div></div></section>
      <p className="text-xs leading-5 text-white/35">Security note: this portal is restricted to platform-admin roles and requires PostgreSQL mode. Organization registration is implemented here; secure invitation delivery and account activation must be configured before inviting real users.</p>
    </div>
  </main>;
}
