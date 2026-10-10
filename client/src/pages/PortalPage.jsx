import { Link } from "react-router-dom";
import { ShieldCheck, ArrowUpRight, Building2 } from "lucide-react";
import { useMemo, useState } from "react";
import { ExperienceLayer, IntelligenceRibbon } from "../components/BizLiftExperience.jsx";

const offices = [
  {
    id: "techpark-one",
    name: "TechPark One",
    location: "Noida",
    vendors: 3,
    description: "Smart office food workspace with multiple vendor outlets.",
  },
  {
    id: "global-tower",
    name: "Global Tower",
    location: "Gurugram",
    vendors: 2,
    description:
      "Centralized vendor operations for premium office dining spaces.",
  },
  {
    id: "innovate-hub",
    name: "Innovate Hub",
    location: "Bengaluru",
    vendors: 1,
    description:
      "Lean office canteen setup for fast and efficient meal service.",
  },
  {
    id: "city-center",
    name: "City Center",
    location: "Delhi",
    vendors: 2,
    description:
      "Urban food vendor environment focused on quick demand handling.",
  },
];

function PortalPage() {
  const [query, setQuery] = useState("");

  const filteredOffices = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return offices;

    return offices.filter((office) =>
      `${office.name} ${office.location} ${office.description}`
        .toLowerCase()
        .includes(q),
    );
  }, [query]);

  return (
    <div className="bizlift-advanced-page bizlift-selection-page min-h-screen bg-black text-white flex flex-col">
      {/* Main */}
      <main className="relative flex-1 overflow-hidden px-6 py-12 md:px-10 lg:px-14">
        <ExperienceLayer variant="portal" />
        <div className="mx-auto max-w-7xl">
          {/* Heading */}
          <div className="relative z-10 text-center">
            <div className="mb-5 flex justify-center"><IntelligenceRibbon label="WORKSPACE NETWORK" value={`${filteredOffices.length} active environments`} /></div>
            <p className="inline-flex rounded-full border border-[#9ad17b]/30 bg-[#9ad17b]/10 px-4 py-2 text-sm text-[#d8f0cb]">
              BizLift Workspace Portal
            </p>

            <h1 className="mt-6 text-4xl font-semibold tracking-tight text-white md:text-6xl">
              Select your workspace
            </h1>

            <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-white/65 md:text-lg">
              Choose the office environment where your food vendors operate.
              Each office contains dedicated restaurant and canteen workspaces.
            </p>
          </div>

          {/* Platform administration entry */}
          <section className="mx-auto mt-10 flex max-w-4xl flex-col gap-5 rounded-[24px] border border-[#9ad17b]/20 bg-[#9ad17b]/[.055] p-5 text-left sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[#9ad17b]/25 bg-[#9ad17b]/10 text-[#9ad17b]"><ShieldCheck size={23} /></div>
              <div><p className="font-semibold text-white">Platform administration</p><p className="mt-1 max-w-xl text-sm leading-6 text-white/55">For authorized administrators managing organizations, locations, and outlets across BizLift.</p></div>
            </div>
            <Link to="/admin/login" className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#9ad17b] px-5 py-3 text-sm font-semibold text-black transition hover:bg-[#b0e294]">Admin sign in <ArrowUpRight size={16} /></Link>
          </section>

          <section className="mx-auto mt-4 flex max-w-4xl flex-col gap-4 rounded-[24px] border border-white/10 bg-white/[.025] p-5 text-left sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-[#9ad17b]"><Building2 size={22} /></div>
              <div><p className="font-semibold text-white">Organization administration</p><p className="mt-1 max-w-xl text-sm leading-6 text-white/55">Manage your organization's own outlets, user access, and activity.</p></div>
            </div>
            <Link to="/organization-admin/login" className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-[#9ad17b]/35 px-5 py-3 text-sm font-semibold text-[#c7f4ac] transition hover:bg-[#9ad17b]/10">Organization admin sign in <ArrowUpRight size={16} /></Link>
          </section>

          {/* Search */}
          <div className="mx-auto mt-10 max-w-2xl">
            <div className="rounded-[22px] border border-white/10 bg-white/5 p-2 backdrop-blur-sm">
              <input
                type="text"
                placeholder="Search by office, campus, location, or workspace..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full rounded-[16px] bg-transparent px-4 py-3 text-white outline-none placeholder:text-white/35"
              />
            </div>
          </div>

          {/* Results count */}
          <div className="mt-8 text-center text-sm text-white/45">
            {filteredOffices.length} workspace
            {filteredOffices.length !== 1 ? "s" : ""} found
          </div>

          {/* Office cards */}
          <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-2">
            {filteredOffices.map((office) => (
              <Link
                key={office.id}
                to={`/office/${office.id}`}
                className="bizlift-feature-card group rounded-[30px] border border-white/10 bg-white/5 p-8 backdrop-blur-sm transition duration-300 hover:-translate-y-1 hover:border-[#9ad17b]/30 hover:bg-white/10"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm uppercase tracking-[0.22em] text-[#9ad17b]">
                      Food Workspace
                    </p>
                    <h2 className="mt-4 text-3xl font-semibold text-white">
                      {office.name}
                    </h2>
                    <p className="mt-2 text-base text-white/55">
                      {office.location}
                    </p>
                  </div>

                  <div className="rounded-full border border-white/10 bg-black/20 px-4 py-2 text-sm text-white/70">
                    {office.vendors} Vendors
                  </div>
                </div>

                <p className="mt-8 max-w-xl text-base leading-8 text-white/60">
                  {office.description}
                </p>

                <div className="mt-10 flex items-center justify-between">
                  <span className="text-sm text-white/40">
                    Open vendor workspace
                  </span>
                  <span className="text-sm font-medium text-[#9ad17b] transition group-hover:translate-x-1">
                    Continue →
                  </span>
                </div>
              </Link>
            ))}
          </div>

          {/* Empty state */}
          {filteredOffices.length === 0 && (
            <div className="bizlift-feature-card mt-14 rounded-[28px] border border-white/10 bg-white/5 p-10 text-center">
              <h3 className="text-2xl font-semibold text-white">
                No workspace found
              </h3>
              <p className="mt-3 text-white/55">
                Try searching with another office name or location.
              </p>
            </div>
          )}
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
              Workspace Flow
            </p>
            <div className="mt-4 space-y-3 text-white/60">
              <p>Location Selection</p>
              <p>Vendor Access</p>
              <p>Business Analytics</p>
            </div>
          </div>

          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-[#9ad17b]">
              Quick Access
            </p>
            <div className="mt-4 space-y-3 text-white/60">
              <Link to="/" className="block hover:text-white transition">
                Back to Landing Page
              </Link>
              <Link to="/admin/login" className="block transition hover:text-white">Platform Admin Sign In</Link>
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

export default PortalPage;
