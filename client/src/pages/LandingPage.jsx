import { Link } from "react-router-dom";
import { useEffect } from "react";
import foodHero from "../assets/food-hero.jpg";
import logoImage from "../assets/logo.png";
import { ExperienceLayer, IntelligenceRibbon } from "../components/BizLiftExperience.jsx";

function LandingPage({ toggleTheme, theme }) {
  const isDark = theme === "dark";

  useEffect(() => {
    const revealItems = document.querySelectorAll("[data-reveal]");
    if (!revealItems.length) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-revealed");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" },
    );

    revealItems.forEach((item) => observer.observe(item));
    return () => observer.disconnect();
  }, []);

  const pageBg = isDark ? "bg-black text-white" : "bg-[#f6f6f2] text-black";
  const heroOverlay = isDark ? "bg-black/60" : "bg-white/45";
  const heroGradient = isDark
    ? "bg-gradient-to-b from-black/50 via-black/55 to-black/85"
    : "bg-gradient-to-b from-white/35 via-white/45 to-[#f6f6f2]/95";

  const navShell = isDark
    ? "border-white/10 bg-white/10"
    : "border-black/10 bg-white/90";

  const navText = isDark ? "text-white/80" : "text-[#1A2119]/80";
  const navHover = isDark
    ? "hover:bg-white/10 hover:text-white"
    : "hover:bg-[#eef1e8] hover:text-[#1A2119]";
  const navActive = isDark
    ? "bg-white/10 text-white"
    : "bg-[#eef1e8] text-[#1A2119]";

  const pillBorder = isDark ? "border-[#9ad17b]/30" : "border-[#7fb263]/40";
  const pillBg = isDark ? "bg-[#9ad17b]/10" : "bg-[#9ad17b]/12";
  const pillText = isDark ? "text-[#d8f0cb]" : "text-[#1A2119]";

  const headingText = isDark ? "text-white" : "text-[#1A2119]";
  const bodyText = isDark ? "text-white/80" : "text-[#1A2119]/80";
  const subBodyText = isDark ? "text-white/65" : "text-[#1A2119]/65";

  const primaryBtn = isDark ? "bg-[#9ad17b] text-black" : "bg-black text-white";

  const secondaryBtn = isDark
    ? "border border-white/20 bg-white/5 text-white hover:bg-white/10"
    : "border border-black/15 bg-white/70 text-[#1A2119] hover:bg-white";

  const themeBtn = isDark
    ? "border border-white/20 bg-white text-black"
    : "border border-black/15 bg-black text-white";

  const sectionDark = isDark ? "bg-[#0b0b0b]" : "bg-[#fcfcf8]";
  const sectionAlt = isDark ? "bg-[#101010]" : "bg-[#f1f3ec]";

  const cardBg = isDark
    ? "bg-[#151515] border-[#262626]"
    : "bg-white border-[#dfe5d7]";

  const cardText = isDark ? "text-white" : "text-[#1A2119]";
  const cardMuted = isDark ? "text-white/60" : "text-[#1A2119]/60";

  const softCardMuted = isDark ? "text-white/55" : "text-[#1A2119]/55";

  const footerBg = isDark ? "bg-[#080808]" : "bg-[#f4f5ef]";
  const footerBorder = isDark ? "border-white/10" : "border-black/10";
  const footerText = isDark ? "text-white/55" : "text-[#1A2119]/55";
  const footerFine = isDark ? "text-white/40" : "text-[#1A2119]/40";

  return (
    <div className={`bizlift-advanced-page bizlift-public-page min-h-screen ${pageBg}`}>
      {/* NAVBAR */}
      <header className="relative z-20 px-6 pt-8 md:px-10 lg:px-14">
        <div
          className={`mx-auto flex max-w-7xl items-center justify-between rounded-[22px] border px-4 py-3 shadow-lg backdrop-blur-xl md:px-6 ${navShell}`}
        >
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-white/10 shadow">
              <img
                src={logoImage}
                alt="BizLift logo"
                className="h-full w-full object-cover animate-spin"
                style={{ animationDuration: "18s" }}
              />
            </div>
            <div>
              <p className={`text-[15px] font-semibold ${headingText}`}>
                BizLift
              </p>
              <p className={`text-xs ${softCardMuted}`}>
                AI operations platform
              </p>
            </div>
          </div>

          {/* Center Nav */}
          <nav
            className={`hidden items-center gap-2 rounded-full px-2 py-1 md:flex ${
              isDark ? "bg-black/20" : "bg-[#f8f8f5]"
            }`}
          >
            <a
              href="#home"
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${navText} ${navHover}`}
            >
              Home
            </a>
            <a
              href="#about"
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${navText} ${navHover}`}
            >
              About
            </a>
            <a
              href="#flow"
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${navText} ${navHover}`}
            >
              Features
            </a>
            <a
              href="#footer"
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${navText} ${navHover}`}
            >
              Contact
            </a>
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={toggleTheme}
              className={`rounded-full px-4 py-2 text-sm font-medium transition hover:scale-105 ${themeBtn}`}
            >
              {isDark ? "Light" : "Dark"}
            </button>
          </div>
        </div>
      </header>

      {/* HERO / 3D VISUAL DEPTH */}
      <section id="home" className="relative -mt-[84px] min-h-screen overflow-hidden pt-[84px]">
        <ExperienceLayer variant="hero" />
        <div className="absolute inset-0">
          <img src={foodHero} alt="Food background" className="h-full w-full object-cover" />
          <div className={`absolute inset-0 ${heroOverlay}`} />
          <div className={`absolute inset-0 ${heroGradient}`} />
        </div>

        <div className="relative z-10 mx-auto grid min-h-[calc(100vh-88px)] max-w-7xl items-center gap-12 px-6 py-20 lg:grid-cols-[1.05fr_.95fr] lg:px-14">
          <div className="text-center lg:text-left" data-reveal="hero">
            <IntelligenceRibbon label="BIZLIFT INTELLIGENCE" value="Real-time operations command center" />
            <p className={`mt-5 mb-5 inline-flex rounded-full border px-4 py-2 text-sm ${pillBorder} ${pillBg} ${pillText}`}>
              Smart operations for office food vendors
            </p>
            <h1 className={`text-5xl font-semibold leading-[1.02] tracking-tight md:text-7xl ${headingText}`}>
              Run the food business.<br />
              <span className="text-[#9ad17b]">Let BizLift handle the signals.</span>
            </h1>
            <p className={`mx-auto mt-6 max-w-2xl text-lg leading-8 md:text-xl lg:mx-0 ${bodyText}`}>
              Inventory, demand, waste, procurement, orders, and business intelligence brought into one operational command center.
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-4 lg:justify-start">
              <Link to="/portal" className={`rounded-full px-8 py-3 text-sm font-semibold transition hover:-translate-y-0.5 hover:scale-[1.02] ${primaryBtn}`}>
                Get Started
              </Link>
              <a href="#about" className={`rounded-full px-8 py-3 text-sm font-medium transition hover:-translate-y-0.5 ${secondaryBtn}`}>
                Explore BizLift
              </a>
            </div>
            <div className={`mt-10 flex flex-wrap justify-center gap-x-7 gap-y-3 text-xs ${subBodyText} lg:justify-start`}>
              <span>✓ Inventory visibility</span>
              <span>✓ Demand forecasting</span>
              <span>✓ Action intelligence</span>
            </div>
          </div>

          <div className="hero-3d-wrap" aria-label="BizLift operations intelligence preview">
            <div className="hero-3d-scene">
              <div className="hero-orbit hero-orbit-one" />
              <div className="hero-orbit hero-orbit-two" />
              <div className="hero-core">
                <div className="hero-core-glow" />
                <div className="hero-core-inner">
                  <span className="text-[10px] font-bold uppercase tracking-[0.28em] text-[#9ad17b]">BIZLIFT</span>
                  <strong className="mt-2 block text-4xl font-semibold text-white">AI</strong>
                  <span className="mt-1 block text-xs text-white/50">Operations Core</span>
                </div>
              </div>

              <div className="hero-float-card hero-card-top">
                <span className="text-[10px] uppercase tracking-[0.18em] text-white/45">Demand</span>
                <strong className="mt-1 block text-lg text-white">+18%</strong>
                <span className="text-[10px] text-[#9ad17b]">Lunch forecast</span>
              </div>
              <div className="hero-float-card hero-card-right">
                <span className="text-[10px] uppercase tracking-[0.18em] text-white/45">Inventory</span>
                <strong className="mt-1 block text-lg text-white">92%</strong>
                <span className="text-[10px] text-white/50">Health score</span>
              </div>
              <div className="hero-float-card hero-card-bottom">
                <span className="text-[10px] uppercase tracking-[0.18em] text-white/45">Action</span>
                <strong className="mt-1 block text-lg text-white">Ready</strong>
                <span className="text-[10px] text-[#9ad17b]">Reorder signal</span>
              </div>
            </div>
          </div>
        </div>

        <div className="absolute bottom-7 left-1/2 hidden -translate-x-1/2 items-center gap-3 text-[10px] uppercase tracking-[0.22em] text-white/40 md:flex">
          <span className="h-px w-10 bg-white/20" /> Scroll to explore <span className="h-px w-10 bg-white/20" />
        </div>
      </section>

      {/* HOME SNAPSHOT */}
      <section className={`${sectionDark} border-y border-white/5 px-6 py-10 md:px-10 lg:px-14`}>
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-4 md:grid-cols-4">
          {[
            ["01", "One workspace", "Inventory to billing"],
            ["02", "Live signals", "Risks before they grow"],
            ["03", "Smart actions", "Recommendations with context"],
            ["04", "Business view", "Performance you can explain"],
          ].map(([n, title, text]) => (
            <div key={n} className={`bizlift-feature-card rounded-2xl border p-5 ${cardBg} transition hover:-translate-y-1`}>
              <span className="text-[10px] font-bold tracking-[0.2em] text-[#9ad17b]">{n}</span>
              <h3 className={`mt-2 text-sm font-semibold ${cardText}`}>{title}</h3>
              <p className={`mt-1 text-xs leading-5 ${cardMuted}`}>{text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ABOUT / VISUAL FLOW SECTION */}
      <section
        id="about"
        className={`${sectionDark} px-6 py-24 md:px-10 lg:px-14`}
      >
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-16 lg:grid-cols-2 lg:items-center">
          <div className="order-2 lg:order-1" data-reveal="left">
            <p className="text-sm uppercase tracking-[0.25em] text-[#9ad17b]">
              About BizLift
            </p>

            <h3
              className={`mt-4 text-4xl font-semibold tracking-tight md:text-5xl ${headingText}`}
            >
              Built to simplify food business operations inside modern office
              spaces
            </h3>

            <p className={`mt-6 max-w-2xl text-base leading-8 ${subBodyText}`}>
              BizLift helps office canteens, food counters, and beverage vendors
              manage inventory, monitor expiry risks, understand demand shifts,
              and stay ahead of daily operational decisions through one
              intelligent platform.
            </p>

            <div className="mt-10 space-y-8">
              {[
                {
                  n: 1,
                  t: "Smarter Inventory Visibility",
                  d: "Track stock health, identify shortages, and keep a close eye on product movement across outlets.",
                },
                {
                  n: 2,
                  t: "Demand & Reorder Intelligence",
                  d: "Forecast meal demand, reduce stockouts, and receive more confident reorder guidance.",
                },
                {
                  n: 3,
                  t: "Better Decisions for Every Vendor",
                  d: "Each outlet gets the same premium dashboard framework with data tailored to its own workspace.",
                },
              ].map((item) => (
                <div className="flex gap-4" key={item.n}>
                  <div className="mt-1 flex h-10 w-10 items-center justify-center rounded-2xl bg-[#182118] font-semibold text-[#9ad17b]">
                    {item.n}
                  </div>
                  <div>
                    <h4 className={`text-xl font-semibold ${cardText}`}>
                      {item.t}
                    </h4>
                    <p className={`mt-2 leading-7 ${cardMuted}`}>{item.d}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right visual */}
          <div className="order-1 lg:order-2 flex items-center justify-center" data-reveal="right">
            <div className="relative h-[560px] w-full max-w-[460px]">
              <div className="absolute left-1/2 top-1/2 w-[300px] -translate-x-1/2 -translate-y-1/2 rotate-[-8deg] rounded-[28px] border border-[#2b2b2b] bg-[#1a1f2a]/90 p-5 shadow-2xl">
                <p className="text-3xl font-semibold text-white/90">
                  BizLift Hub
                </p>

                <div className="mt-6 rounded-[22px] bg-[#102559] p-5">
                  <p className="text-lg text-white/70">Inventory Health</p>
                  <p className="mt-3 text-5xl font-bold text-white">92%</p>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3">
                  <div className="rounded-[18px] bg-[#314769]/80 p-4">
                    <p className="text-sm text-white/70">Low Stock</p>
                    <p className="mt-2 text-3xl font-bold text-[#ffb3b3]">12</p>
                  </div>

                  <div className="rounded-[18px] bg-[#314769]/80 p-4">
                    <p className="text-sm text-white/70">Expiry Risk</p>
                    <p className="mt-2 text-3xl font-bold text-[#ffd552]">9</p>
                  </div>
                </div>

                <div className="mt-5 rounded-[18px] bg-[#314769]/80 p-4">
                  <p className="text-sm text-white/70">Active Office</p>
                  <p className="mt-2 text-xl font-semibold text-white">
                    TechPark One
                  </p>
                </div>
              </div>

              <div className="absolute left-0 top-8 w-[170px] rounded-[18px] border border-white/10 bg-[#475b7f]/85 px-4 py-4 shadow-xl backdrop-blur-sm">
                <p className="text-sm text-white/70">Demand Forecast</p>
                <p className="mt-2 text-xl font-bold text-white">Lunch +18%</p>
              </div>

              <div className="absolute right-0 top-16 w-[190px] rounded-[18px] border border-[#8ec56d]/20 bg-[#234145]/90 px-4 py-4 shadow-xl backdrop-blur-sm">
                <p className="text-sm text-[#c7e6a6]">Automation</p>
                <p className="mt-2 text-xl font-bold text-[#d5f18b]">
                  Reorder Ready
                </p>
              </div>

              <div className="absolute bottom-20 left-2 w-[185px] rounded-[18px] border border-white/10 bg-[#475b7f]/85 px-4 py-4 shadow-xl backdrop-blur-sm">
                <p className="text-sm text-white/70">Waste Reduction</p>
                <p className="mt-2 text-xl font-bold text-white">
                  -23% projected
                </p>
              </div>

              <div className="absolute bottom-2 right-2 w-[170px] rounded-[18px] border border-white/10 bg-[#475b7f]/85 px-4 py-4 shadow-xl backdrop-blur-sm">
                <p className="text-sm text-white/70">Vendors</p>
                <p className="mt-2 text-xl font-bold text-white">6 connected</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FLOW SECTION */}
      <section
        id="flow"
        className={`${sectionAlt} px-6 py-24 md:px-10 lg:px-14`}
      >
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-14 lg:grid-cols-2 lg:items-center">
          <div data-reveal="left">
            <p className="text-sm uppercase tracking-[0.25em] text-[#9ad17b]">
              How It Works
            </p>
            <h3
              className={`mt-4 text-4xl font-semibold tracking-tight md:text-5xl ${headingText}`}
            >
              From workspace access to outlet intelligence
            </h3>

            <p className={`mt-6 max-w-2xl text-base leading-8 ${subBodyText}`}>
              BizLift is designed as a structured platform for office-based food
              businesses. Every outlet gets a premium operational dashboard,
              while the platform still keeps office, vendor, and login access
              organized in one unified flow.
            </p>
          </div>

          <div className="space-y-6" data-reveal="stack">
            {[
              {
                n: "01",
                t: "Choose your office workspace",
                d: "Start from the central portal and select the office environment where the vendor operates.",
              },
              {
                n: "02",
                t: "Access the right vendor space",
                d: "Every vendor has the same dashboard shell, but different metrics and graphs based on their own dataset.",
              },
              {
                n: "03",
                t: "Make faster business decisions",
                d: "Use forecasting, alerts, expiry tracking, and analytics to reduce waste and improve stock planning.",
              },
            ].map((item) => (
              <div
                key={item.n}
                className={`bizlift-feature-card rounded-[30px] border p-6 ${cardBg} transition duration-300 hover:-translate-y-1 hover:border-[#9ad17b]/30`}
              >
                <p className="text-sm text-[#9ad17b]">{item.n}</p>
                <h4 className={`mt-3 text-2xl font-semibold ${cardText}`}>
                  {item.t}
                </h4>
                <p className={`mt-3 leading-7 ${cardMuted}`}>{item.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer
        id="footer"
        className={`border-t px-6 py-14 md:px-10 lg:px-14 ${footerBg} ${footerBorder}`}
      >
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 md:grid-cols-4">
          <div className="md:col-span-2">
            <h3 className={`text-2xl font-semibold ${headingText}`}>BizLift</h3>
            <p className={`mt-3 max-w-md leading-7 ${footerText}`}>
              AI-powered operations platform for office food vendors, canteens,
              and smart business workspaces.
            </p>
          </div>

          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-[#9ad17b]">
              Navigation
            </p>
            <div className={`mt-4 space-y-3 ${footerText}`}>
              <a href="#about" className="block hover:text-inherit">
                About
              </a>
              <a href="#flow" className="block hover:text-inherit">
                How it Works
              </a>
              <a href="#footer" className="block hover:text-inherit">
                Contact
              </a>
            </div>
          </div>

          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-[#9ad17b]">
              Access
            </p>
            <div className={`mt-4 space-y-3 ${footerText}`}>
              <Link to="/portal" className="block hover:text-inherit">
                Open Portal
              </Link>
              <Link to="/login" className="block hover:text-inherit">
                Vendor Sign In
              </Link>
            </div>
          </div>
        </div>

        <div
          className={`mx-auto mt-10 max-w-7xl border-t pt-6 text-sm ${footerFine} ${footerBorder}`}
        >
          © 2026 BizLift. Built for office food vendors and smart business
          operations.
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;
