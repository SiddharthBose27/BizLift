import { Link, useParams } from "react-router-dom";
import { useMemo, useState } from "react";
import { ExperienceLayer, IntelligenceRibbon } from "../components/BizLiftExperience.jsx";

const vendorsByOffice = {
  "techpark-one": [
    {
      id: "snapeats",
      name: "SnapEats",
      type: "Fast Meals & Snacks",
      description: "Quick office meals, wraps, and snack-based ordering.",
    },
    {
      id: "quench",
      name: "Quench",
      type: "Beverages & Coolers",
      description: "Drinks, juices, coolers, and daily refreshment inventory.",
    },
    {
      id: "southdelights",
      name: "South Delights",
      type: "South Indian Meals",
      description:
        "Breakfast and lunch operations focused on hot meal service.",
    },
  ],
  "global-tower": [
    {
      id: "brewbox",
      name: "BrewBox",
      type: "Coffee & Quick Bites",
      description: "Coffee, bakery items, and fast counter service.",
    },
    {
      id: "greenbite",
      name: "GreenBite",
      type: "Healthy Meals",
      description:
        "Healthy bowls, salads, and controlled daily stock planning.",
    },
  ],
  "innovate-hub": [
    {
      id: "cafenova",
      name: "CafeNova",
      type: "Cafe Workspace",
      description:
        "Compact office café model with centralized inventory handling.",
    },
  ],
  "bennett-campus": [
    { id: "campus-cafe", name: "Campus Café", type: "Snacks & Quick Meals", description: "Fast campus meals with recipe-level ingredient consumption." },
    { id: "student-bites", name: "Student Bites", type: "Street Food & Snacks", description: "High-volume student counter with automated stock deductions." },
    { id: "fresh-corner", name: "Fresh Corner", type: "Healthy Food & Beverages", description: "Fresh meals, drinks, expiry tracking, and waste control." },
  ],
  "city-center": [
    {
      id: "quickmeal",
      name: "QuickMeal",
      type: "Express Food Counter",
      description: "High-volume office food service with fast turnover.",
    },
    {
      id: "urban-spoon",
      name: "Urban Spoon",
      type: "Premium Counter Meals",
      description:
        "Structured menu planning and demand-based vendor operations.",
    },
  ],
};

function formatOfficeName(officeId = "") {
  return officeId
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function VendorPage() {
  const { officeId } = useParams();
  const [query, setQuery] = useState("");

  const vendors = vendorsByOffice[officeId] || [];

  const filteredVendors = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return vendors;

    return vendors.filter((vendor) =>
      `${vendor.name} ${vendor.type} ${vendor.description}`
        .toLowerCase()
        .includes(q),
    );
  }, [vendors, query]);

  return (
    <div className="bizlift-advanced-page bizlift-selection-page min-h-screen bg-black text-white flex flex-col">
      {/* Main */}
      <main className="relative flex-1 overflow-hidden px-6 py-12 md:px-10 lg:px-14">
        <ExperienceLayer variant="vendor" />
        <div className="mx-auto max-w-7xl">
          {/* Heading */}
          <div className="relative z-10 text-center">
            <div className="mb-5 flex justify-center"><IntelligenceRibbon label="VENDOR NETWORK" value={`${vendors.length} outlets available`} /></div>
            <p className="inline-flex rounded-full border border-[#9ad17b]/30 bg-[#9ad17b]/10 px-4 py-2 text-sm text-[#d8f0cb]">
              Vendor Workspace Access
            </p>

            <h1 className="mt-6 text-4xl font-semibold tracking-tight text-white md:text-6xl">
              {formatOfficeName(officeId)}
            </h1>

            <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-white/65 md:text-lg">
              Select the vendor workspace you want to access inside this office
              environment.
            </p>
            <div className="mt-5 flex justify-center">
              <Link to="/organization-admin/login" className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm text-white/55 transition hover:border-[#9ad17b]/40 hover:text-[#c7f4ac]">Organization administrator sign in <span aria-hidden="true">↗</span></Link>
            </div>
          </div>

          {/* Search */}
          <div className="mx-auto mt-10 max-w-2xl">
            <div className="rounded-[22px] border border-white/10 bg-white/5 p-2 backdrop-blur-sm">
              <input
                type="text"
                placeholder="Search vendor by name, type, or outlet..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full rounded-[16px] bg-transparent px-4 py-3 text-white outline-none placeholder:text-white/35"
              />
            </div>
          </div>

          {/* Back link */}
          <div className="mt-8 text-center">
            <Link
              to="/portal"
              className="text-sm text-[#9ad17b] hover:text-[#b8e6a4] transition"
            >
              ← Back to office workspaces
            </Link>
          </div>

          <div className="mt-5 flex justify-center">
            <Link to="/admin/login" className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[.035] px-4 py-2 text-sm text-white/55 transition hover:border-[#9ad17b]/35 hover:text-[#9ad17b]">
              Platform administration <span aria-hidden="true">↗</span>
            </Link>
          </div>

          {/* Results count */}
          <div className="mt-6 text-center text-sm text-white/45">
            {filteredVendors.length} vendor
            {filteredVendors.length !== 1 ? "s" : ""} found
          </div>

          {/* Vendor cards */}
          <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-2">
            {filteredVendors.map((vendor) => (
              <Link
                key={vendor.id}
                to={`/login/${vendor.id}`}
                onClick={() => {
                  sessionStorage.setItem("selected_vendor", vendor.id);
                  sessionStorage.setItem("selected_office", officeId);
                }}
                className="bizlift-feature-card group rounded-[30px] border border-white/10 bg-white/5 p-8 backdrop-blur-sm transition duration-300 hover:-translate-y-1 hover:border-[#9ad17b]/30 hover:bg-white/10"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm uppercase tracking-[0.22em] text-[#9ad17b]">
                      Vendor Workspace
                    </p>
                    <h2 className="mt-4 text-3xl font-semibold text-white">
                      {vendor.name}
                    </h2>
                    <p className="mt-2 text-base text-white/55">
                      {vendor.type}
                    </p>
                  </div>

                  <div className="rounded-full border border-white/10 bg-black/20 px-4 py-2 text-sm text-white/70">
                    Open
                  </div>
                </div>

                <p className="mt-8 max-w-xl text-base leading-8 text-white/60">
                  {vendor.description}
                </p>

                <div className="mt-10 flex items-center justify-between">
                  <span className="text-sm text-white/40">
                    Continue to login
                  </span>
                  <span className="text-sm font-medium text-[#9ad17b] transition group-hover:translate-x-1">
                    Continue →
                  </span>
                </div>
              </Link>
            ))}
          </div>

          {/* Empty state */}
          {filteredVendors.length === 0 && (
            <div className="bizlift-feature-card mt-14 rounded-[28px] border border-white/10 bg-white/5 p-10 text-center">
              <h3 className="text-2xl font-semibold text-white">
                No vendor found
              </h3>
              <p className="mt-3 text-white/55">
                Try searching with another vendor name or category.
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
              Vendor Flow
            </p>
            <div className="mt-4 space-y-3 text-white/60">
              <p>Vendor Selection</p>
              <p>Login Access</p>
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
              <p>BizLift Vendor Access</p>
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

export default VendorPage;
