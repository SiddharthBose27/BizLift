import { useEffect, useMemo, useState } from "react";
import logoImage from "../assets/logo.png";
import { Link } from "react-router-dom";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { ExperienceLayer, IntelligenceRibbon } from "../components/BizLiftExperience.jsx";
import { apiFetch, getStoredToken } from "../lib/api";
import ReportsPage from "./ReportsPage";

// ================================
// Dashboard API Configuration
// ================================

const API_BASE = "/api";

const DASHBOARD_ENDPOINTS = {
  inventory: `${API_BASE}/inventory`,
  sales: `${API_BASE}/sales`,
  transactions: `${API_BASE}/inventory/transactions`,
  recipes: `${API_BASE}/recipes`,

  aiHealthScore: `${API_BASE}/inventory/ai-health-score`,
  topSignal: null,
  actionCenter: `${API_BASE}/inventory/action-center`,
  reviewAction: `${API_BASE}/inventory/actions/review`,
  snoozeAction: `${API_BASE}/inventory/actions/snooze`,
  dismissAction: `${API_BASE}/inventory/actions/dismiss`,

  demandAnalytics: `${API_BASE}/inventory/demand/analytics`,
  supplierAnalytics: `${API_BASE}/inventory/suppliers/analytics`,
  reorderSuggestions: `${API_BASE}/inventory/reorder/suggestions`,
  salesAnalytics: `${API_BASE}/sales/analytics`,
  wasteAnalytics: `${API_BASE}/inventory/waste-analytics`,
  demandForecast: `${API_BASE}/inventory/demand-forecast`,
  eoqAnalytics: `${API_BASE}/inventory/eoq`,
  procurementPlan: `${API_BASE}/inventory/procurement-plan`,
  workspaceHealth: `${API_BASE}/inventory/workspace-health`,
  intelligenceSummary: `${API_BASE}/inventory/intelligence/summary`,
  enhancedSalesAnalytics: `${API_BASE}/sales/analytics/enhanced`,
  expiryAnalytics: `${API_BASE}/inventory/expiry/analytics`,
  stockRisk: `${API_BASE}/inventory/stock-risk`,
  resetActionStates: `${API_BASE}/inventory/actions/reset`,
  dashboardSummary: `${API_BASE}/dashboard/summary`,
  decisionIntelligence: `${API_BASE}/intelligence/decision`,
  recommendationOutcomes: `${API_BASE}/intelligence/outcomes`,
  procurementIntelligence: `${API_BASE}/intelligence/procurement-intelligence`,
  procurementOrders: `${API_BASE}/intelligence/procurement-orders`,
  copilotBrief: `${API_BASE}/copilot/brief`,
  copilotActions: `${API_BASE}/copilot/actions`,
  copilotDecision: `${API_BASE}/copilot/actions`,
  demandMenuIntelligence: `${API_BASE}/intelligence/demand-menu-intelligence`,
  controlTower: `${API_BASE}/intelligence/control-tower`,
  controlTowerAction: `${API_BASE}/intelligence/control-tower/actions/state`,
  digitalTwin: `${API_BASE}/intelligence/digital-twin`,
  moneyLeaks: `${API_BASE}/intelligence/money-leaks`,
  actionOptimizer: `${API_BASE}/intelligence/action-optimizer`,
  actionApprove: `${API_BASE}/intelligence/action-optimizer/approve`,
  wasteRescue: `${API_BASE}/intelligence/waste-rescue`,
  impactLedger: `${API_BASE}/intelligence/impact-ledger`,
  decisionCenter: `${API_BASE}/intelligence/decision-center`,
  workspaces: `${API_BASE}/workspaces`,
  operationsReport: `${API_BASE}/reports/operations`,
  observabilityHealth: `${API_BASE}/observability/health`,
  observabilityMetrics: `${API_BASE}/observability/metrics`,
  observabilityAudit: `${API_BASE}/observability/audit`,
  observabilitySecurity: `${API_BASE}/observability/security`,
};

// ================================
// Safe Fetch Helper
// ================================

async function fetchJSON(url, options = {}) {
  const token = localStorage.getItem("bizlift_token");
  const headers = {
    ...options.headers,
    "Content-Type": "application/json",
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(url, { ...options, headers });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "API request failed");
  }

  return data;
}

const sidebarItems = [
  { key: "Overview", icon: "◉" },
  { key: "Decision Intelligence", icon: "✦" },
  { key: "Action Center", icon: "✦" },
  { key: "Expiry Monitor", icon: "◌" },
  { key: "Low Stock Alerts", icon: "△" },
  { key: "Demand Forecasting", icon: "↗" },
  { key: "Waste Analytics", icon: "◔" },
  { key: "Reorder Suggestions", icon: "⇄" },
  { key: "EOQ Calculator", icon: "∑" },
  { key: "Suppliers", icon: "⌘" },
  { key: "Reports", icon: "▤" },
  { key: "Settings", icon: "⚙" },
  { key: "Boardroom Mode", icon: "▣" },
];

const vendorDataMap = {
  snapeats: {
    vendor: "SnapEats",
    office: "TechPark One",
    inventoryValue: "₹2.48L",
    lowStock: 12,
    expiryRisk: 9,
    forecast: "+18%",
    quickStats: [
      "Peak demand between 1 PM–3 PM",
      "Wraps and beverages are top-selling",
      "Milk and bread need close monitoring",
    ],
  },
  quench: {
    vendor: "Quench",
    office: "TechPark One",
    inventoryValue: "₹1.62L",
    lowStock: 7,
    expiryRisk: 5,
    forecast: "+11%",
    quickStats: [
      "Cold coffee demand strongest on weekdays",
      "Juice inventory rotates faster than expected",
      "Chilled stock planning needs tighter reorder timing",
    ],
  },
  "south-delights": {
    vendor: "South Delights",
    office: "TechPark One",
    inventoryValue: "₹3.06L",
    lowStock: 15,
    expiryRisk: 6,
    forecast: "+21%",
    quickStats: [
      "Breakfast rush drives high idli batter usage",
      "Sambar ingredients need better daily planning",
      "Rice-based items show stable repeat demand",
    ],
  },
};

const pageMeta = {
  Overview: {
    subtitle: "AI-guided live command center for outlet operations",
  },
  "Action Center": {
    subtitle:
      "Operational queue for reviews, snoozes, dismissals, and execution",
  },
  Inventory: {
    subtitle: "Stock records, movement, recipes, and operational controls",
  },
  "Expiry Monitor": {
    subtitle: "Perishable risk tracking and early expiry intervention",
  },
  "Low Stock Alerts": {
    subtitle: "Threshold pressure monitoring and replenishment triggers",
  },
  "Demand Forecasting": {
    subtitle: "Sales movement, demand visibility, and projected usage",
  },
  "Waste Analytics": {
    subtitle: "Waste pattern visibility, root causes, and reduction signals",
  },
  "Reorder Suggestions": {
    subtitle: "Recommended replenishment plan based on operational pressure",
  },
  "EOQ Calculator": {
    subtitle: "Optimal ordering quantity using demand and carrying assumptions",
  },
  Suppliers: {
    subtitle: "Supplier coverage, concentration, and operational load",
  },
  Settings: {
    subtitle: "Workspace actions, controls, and data utilities",
  },
};

const chartColors = [
  "#9ad17b",
  "#3b82f6",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#14b8a6",
  "#f97316",
  "#ec4899",
];

function getCurrentDay() {
  return new Date().getDate();
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "Good Morning";
  if (hour >= 12 && hour < 17) return "Good Afternoon";
  if (hour >= 17 && hour < 21) return "Good Evening";
  return "Good Night";
}

function getCurrentMonth() {
  return new Date().toLocaleString("en-US", { month: "long" });
}

function getCurrentYear() {
  return new Date().getFullYear();
}

function MetricCard({
  title,
  value,
  note,
  noteClass = "text-[#9ad17b]",
  isDark,
}) {
  return (
    <div
      className={`rounded-[24px] border p-6 shadow-lg backdrop-blur-sm transition min-h-[170px] hover:-translate-y-1 ${
        isDark
          ? "border-white/10 bg-white/[0.045] shadow-[0_0_22px_rgba(255,255,255,0.025)]"
          : "border-black/10 bg-white/80"
      }`}
    >
      <p
        className={
          isDark ? "text-sm text-white/45" : "text-sm text-[#1A2119]/45"
        }
      >
        {title}
      </p>

      <div className="mt-4 min-h-[58px] flex items-end">
        <h3
          className={
            isDark
              ? "text-[clamp(1.5rem,2.4vw,2.625rem)] font-semibold text-white leading-tight break-words tabular-nums"
              : "text-[clamp(1.5rem,2.4vw,2.625rem)] font-semibold text-[#1A2119] leading-tight break-words tabular-nums"
          }
        >
          {value}
        </h3>
      </div>

      <p className={`mt-4 text-lg leading-snug ${noteClass}`}>{note}</p>
    </div>
  );
}

function PlaceholderPanel({ title, subtitle, height = "h-[260px]", isDark }) {
  return (
    <section
      className={`bizlift-dashboard-card rounded-[20px] border p-5 shadow-md backdrop-blur-sm ${
        isDark
          ? "border-white/10 bg-white/[0.04]"
          : "border-black/10 bg-white/80"
      }`}
    >
      <p
        className={
          isDark ? "text-sm text-white/50" : "text-sm text-[#1A2119]/50"
        }
      >
        {subtitle}
      </p>
      <h3
        className={
          isDark
            ? "mt-2 text-xl font-semibold text-white"
            : "mt-2 text-xl font-semibold text-[#1A2119]"
        }
      >
        {title}
      </h3>
      <div
        className={`mt-6 flex ${height} items-center justify-center rounded-[20px] border border-dashed text-center text-sm ${
          isDark
            ? "border-white/10 bg-black/20 text-white/30"
            : "border-black/10 bg-[#f6f6f2] text-[#1A2119]/30"
        }`}
      >
        Content for {title} will be added in the next step
      </div>
    </section>
  );
}

function AnalyticsCard({ title, subtitle, children, isDark }) {
  return (
    <section
      className={`bizlift-dashboard-card min-w-0 rounded-[20px] border p-5 shadow-md backdrop-blur-sm h-full ${
        isDark
          ? "border-white/10 bg-white/[0.04] shadow-[0_0_24px_rgba(255,255,255,0.018)]"
          : "border-black/10 bg-white/80"
      }`}
    >
      <div className="mb-5">
        <p
          className={
            isDark ? "text-sm text-white/45" : "text-sm text-[#1A2119]/45"
          }
        >
          {subtitle}
        </p>
        <h3
          className={
            isDark
              ? "mt-2 text-[24px] font-semibold text-white tracking-tight"
              : "mt-2 text-[24px] font-semibold text-[#1A2119] tracking-tight"
          }
        >
          {title}
        </h3>
      </div>

      {children}
    </section>
  );
}

function FilterSelect({ value, onChange, options, isDark }) {
  return (
    <select
      value={value}
      onChange={onChange}
      className={`rounded-[16px] px-4 py-3 text-sm outline-none border min-w-[120px] ${
        isDark
          ? "border-white/10 bg-black/20 text-white"
          : "border-black/10 bg-[#f6f6f2] text-[#1A2119]"
      }`}
    >
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  );
}

function StatusPill({ label, tone = "green" }) {
  const toneMap = {
    green: "bg-green-100 text-green-700",
    yellow: "bg-yellow-100 text-yellow-700",
    red: "bg-red-100 text-red-700",
    blue: "bg-blue-100 text-blue-700",
    gray: "bg-gray-100 text-gray-700",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1.5 text-xs font-semibold ${toneMap[tone] || toneMap.gray}`}
    >
      {label}
    </span>
  );
}

function getActionToneClasses(color, isDark) {
  if (color === "red") {
    return isDark
      ? "border-red-500/20 bg-red-900/10"
      : "border-red-200 bg-red-50";
  }

  if (color === "amber") {
    return isDark
      ? "border-yellow-500/20 bg-yellow-900/10"
      : "border-yellow-200 bg-yellow-50";
  }

  if (color === "blue") {
    return isDark
      ? "border-blue-500/20 bg-blue-900/10"
      : "border-blue-200 bg-blue-50";
  }

  return isDark
    ? "border-green-500/20 bg-green-900/10"
    : "border-green-200 bg-green-50";
}

function EmptyStateBlock({ text, isDark }) {
  return (
    <div
      className={`rounded-[20px] border border-dashed p-8 text-center text-sm min-h-[140px] flex items-center justify-center ${
        isDark
          ? "border-white/10 bg-black/20 text-white/40"
          : "border-black/10 bg-[#f6f6f2] text-[#1A2119]/40"
      }`}
    >
      {text}
    </div>
  );
}

function DashboardPage({ theme = "dark", toggleTheme }) {
  const isDark = theme === "dark";

  const [activePage, setActivePage] = useState("Overview");
  const [actionUpdatingKey, setActionUpdatingKey] = useState("");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isSidebarHovered, setIsSidebarHovered] = useState(false);

  const showExpandedSidebar = !isSidebarCollapsed || isSidebarHovered;
  const [vendorKey, setVendorKey] = useState(() => sessionStorage.getItem("selected_vendor") || "");
  const [officeKey, setOfficeKey] = useState(() => sessionStorage.getItem("selected_office") || "");
  const [availableWorkspaces, setAvailableWorkspaces] = useState([]);
  const [workspaceLoading, setWorkspaceLoading] = useState(false);

  const [inventoryItems, setInventoryItems] = useState([]);
  const [salesItems, setSalesItems] = useState([]);
  const [transactionItems, setTransactionItems] = useState([]);
  const [recipeItems, setRecipeItems] = useState([]);
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [inventoryError, setInventoryError] = useState("");

  const [selectedAlertCategory, setSelectedAlertCategory] = useState("All");
  const [selectedAlertSupplier, setSelectedAlertSupplier] = useState("All");

  const [selectedActionPriority, setSelectedActionPriority] = useState("All");
  const [selectedActionState, setSelectedActionState] = useState("All");
  const [actionSearchTerm, setActionSearchTerm] = useState("");

  const [selectedExpiryCategory, setSelectedExpiryCategory] = useState("All");
  const [selectedExpirySupplier, setSelectedExpirySupplier] = useState("All");

  const [selectedForecastMenuItem, setSelectedForecastMenuItem] =
    useState("All");

  const [quickSaleRecipeId, setQuickSaleRecipeId] = useState("");
  const [quickSaleQuantity, setQuickSaleQuantity] = useState(1);
  const [quickSaleLoading, setQuickSaleLoading] = useState(false);
  const [quickSaleMessage, setQuickSaleMessage] = useState("");
  const [procurementLoading, setProcurementLoading] = useState(false);
  const [procurementMessage, setProcurementMessage] = useState("");

  const [demand, setDemand] = useState(1000);
  const [orderingCost, setOrderingCost] = useState(500);
  const [holdingCost, setHoldingCost] = useState(10);
  const [stockoutScenario, setStockoutScenario] = useState(20);
  const [twinDemandPct, setTwinDemandPct] = useState(20);
  const [digitalTwin, setDigitalTwin] = useState(null);
  const [digitalTwinLoading, setDigitalTwinLoading] = useState(false);
  const [moneyLeaks, setMoneyLeaks] = useState(null);
  const [actionOptimizer, setActionOptimizer] = useState(null);
  const [actionOptimizerLoading, setActionOptimizerLoading] = useState(false);
  const [actionApprovalId, setActionApprovalId] = useState("");
  const [wasteRescue, setWasteRescue] = useState(null);
  const [decisionCenter, setDecisionCenter] = useState(null);
  const [impactLedger, setImpactLedger] = useState(null);
  const [copilotBrief, setCopilotBrief] = useState(null);
  const [copilotLoading, setCopilotLoading] = useState(false);
  const [copilotActionId, setCopilotActionId] = useState("");

  const withWorkspace = (url) => {
    const separator = url.includes("?") ? "&" : "?";
    return `${url}${separator}officeId=${encodeURIComponent(
      officeKey,
    )}&vendorId=${encodeURIComponent(vendorKey)}`;
  };

  // ================================
  // Dashboard Intelligence State
  // ================================

  const [dashboardAI, setDashboardAI] = useState({
    healthScore: null,
    topSignal: null,
    demand: null,
    suppliers: null,
    reorder: null,
    recommendations: null,
    actionCenter: null,
    sales: null,
    waste: null,
    demandForecast: null,
    eoq: null,
    procurement: null,
    workspaceHealth: null,
    intelligenceSummary: null,
    enhancedSales: null,
    expiry: null,
    stockRisk: null,
    moduleHealth: { success: true, failures: [] },
    demandMenu: null,
  });

  const ensureAuthenticated = () => {
    const token = getStoredToken();
    const user = JSON.parse(localStorage.getItem("bizlift_user") || "{}");

    if (!token) {
      throw new Error("Missing auth token. Please log in first.");
    }
    return token;
  };

  const runCopilotBrief = async () => {
    setCopilotLoading(true);
    try {
      const response = await apiFetch(withWorkspace(DASHBOARD_ENDPOINTS.copilotBrief), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent: "daily_operations" }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload.success === false) throw new Error(payload.message || "AI Copilot failed.");
      setCopilotBrief(payload.data);
    } catch (error) {
      setAiError(error.message || "AI Copilot failed.");
    } finally { setCopilotLoading(false); }
  };

  const decideCopilotAction = async (action, decision) => {
    setCopilotActionId(action.id);
    try {
      const response = await apiFetch(`${DASHBOARD_ENDPOINTS.copilotDecision}/${encodeURIComponent(action.id)}/decision?officeId=${encodeURIComponent(officeKey)}&vendorId=${encodeURIComponent(vendorKey)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload.success === false) throw new Error(payload.message || "Could not update Copilot action.");
      setCopilotBrief((prev) => prev ? { ...prev, run: { ...prev.run, actions: (prev.run.actions || []).map((item) => item.id === action.id ? { ...item, status: decision } : item) } } : prev);
    } catch (error) {
      setAiError(error.message || "Could not update Copilot action.");
    } finally { setCopilotActionId(""); }
  };

  const loadAvailableWorkspaces = async () => {
    try {
      setWorkspaceLoading(true);
      const response = await apiFetch(DASHBOARD_ENDPOINTS.workspaces, { includeWorkspace: false });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload.success === false) throw new Error(payload.message || "Failed to load workspaces.");
      setAvailableWorkspaces(Array.isArray(payload.data) ? payload.data : []);
    } catch (error) {
      console.error("Workspace directory load failed:", error);
    } finally { setWorkspaceLoading(false); }
  };

  const switchWorkspace = (workspace) => {
    if (!workspace?.officeId || !workspace?.vendorId) return;
    sessionStorage.setItem("selected_office", workspace.officeId);
    sessionStorage.setItem("selected_vendor", workspace.vendorId);
    setOfficeKey(workspace.officeId);
    setVendorKey(workspace.vendorId);
    setActivePage("Overview");
  };

  const refreshAllDashboardData = async () => {
    try {
      ensureAuthenticated();

      await Promise.all([fetchDashboardData(), fetchDashboardAI()]);
    } catch (error) {
      console.error("Dashboard refresh failed:", error);
      setInventoryError?.(error.message || "Failed to load dashboard.");
    }
  };

  const [settingsActionLoading, setSettingsActionLoading] = useState("");
  const [observability, setObservability] = useState({ health: null, metrics: null, audit: [], security: [], loading: false, error: "" });

  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");

  useEffect(() => {
    // ... (rest of the code remains the same)
    const storedVendor = sessionStorage.getItem("selected_vendor");
    const storedOffice = sessionStorage.getItem("selected_office");

    if (storedVendor) setVendorKey(storedVendor);
    if (storedOffice) setOfficeKey(storedOffice);
  }, []);

  useEffect(() => { if (getStoredToken()) loadAvailableWorkspaces(); }, []);
  useEffect(() => { if (activePage === "Settings" && getStoredToken()) fetchObservability(); }, [activePage, officeKey, vendorKey]);

  const fetchObservability = async () => {
    try {
      setObservability((current) => ({ ...current, loading: true, error: "" }));
      const [healthResponse, metricsResponse, auditResponse, securityResponse] = await Promise.all([
        apiFetch(DASHBOARD_ENDPOINTS.observabilityHealth, { includeWorkspace: false }),
        apiFetch(DASHBOARD_ENDPOINTS.observabilityMetrics),
        apiFetch(DASHBOARD_ENDPOINTS.observabilityAudit),
        apiFetch(DASHBOARD_ENDPOINTS.observabilitySecurity),
      ]);
      const [healthResult, metricsResult, auditResult, securityResult] = await Promise.all([
        healthResponse.json().catch(() => ({})),
        metricsResponse.json().catch(() => ({})),
        auditResponse.json().catch(() => ({})),
        securityResponse.json().catch(() => ({})),
      ]);
      if (!metricsResponse.ok || !auditResponse.ok || !securityResponse.ok) {
        throw new Error(metricsResult.message || auditResult.message || securityResult.message || "Observability access denied.");
      }
      setObservability({ health: healthResult.data || null, metrics: metricsResult.data || null, audit: auditResult.data || [], security: securityResult.data || [], loading: false, error: "" });
    } catch (error) {
      setObservability((current) => ({ ...current, loading: false, error: error.message || "Failed to load observability." }));
    }
  };

  const fetchDashboardData = async () => {
    try {
      setInventoryLoading(true);
      setInventoryError("");

      const [
        inventoryResponse,
        salesResponse,
        transactionResponse,
        recipeResponse,
      ] = await Promise.all([
        apiFetch(DASHBOARD_ENDPOINTS.inventory),
        apiFetch(DASHBOARD_ENDPOINTS.sales),
        apiFetch(DASHBOARD_ENDPOINTS.transactions),
        apiFetch(DASHBOARD_ENDPOINTS.recipes),
      ]);

      const inventoryResult = await inventoryResponse.json();
      const salesResult = await salesResponse.json();
      const transactionResult = await transactionResponse.json();
      const recipeResult = await recipeResponse.json();

      if (!inventoryResponse.ok) {
        throw new Error(inventoryResult.message || "Failed to fetch inventory");
      }
      if (!salesResponse.ok) {
        throw new Error(salesResult.message || "Failed to fetch sales");
      }
      if (!transactionResponse.ok) {
        throw new Error(
          transactionResult.message || "Failed to fetch transactions",
        );
      }
      if (!recipeResponse.ok) {
        throw new Error(recipeResult.message || "Failed to fetch recipes");
      }

      setInventoryItems(inventoryResult.data || []);
      setSalesItems(salesResult.data || []);
      setTransactionItems(transactionResult.data || []);
      setRecipeItems(recipeResult.data || []);
    } catch (err) {
      setInventoryError(
        err.message || "Something went wrong while fetching dashboard data.",
      );
    } finally {
      setInventoryLoading(false);
    }
  };

  const updateControlTowerAction = async (actionKey, state) => {
    try {
      await fetchJSON(withWorkspace(DASHBOARD_ENDPOINTS.controlTowerAction), {
        method: "POST",
        body: JSON.stringify({ actionKey, state }),
      });
      await fetchDashboardAI();
    } catch (err) {
      console.error("Failed to update Control Tower action:", err);
    }
  };

  const updateActionState = async (url, actionKey) => {
    try {
      setActionUpdatingKey(actionKey);

      const result = await fetchJSON(withWorkspace(url), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ actionKey }),
      });
      if (result?.success === false) {
        throw new Error(result.message || "Action update failed.");
      }

      await refreshAllDashboardData();
    } catch (err) {
      console.error("Failed to update action state:", err);
    } finally {
      setActionUpdatingKey("");
    }
  };

  // ================================
  // Fetch AI Intelligence
  // ================================

  const fetchDashboardAI = async () => {
    try {
      setAiLoading(true);
      setAiError("");
      const requests = [
        ["dashboard", DASHBOARD_ENDPOINTS.dashboardSummary],
        ["waste", DASHBOARD_ENDPOINTS.wasteAnalytics],
        ["reorder", DASHBOARD_ENDPOINTS.reorderSuggestions],
        ["procurement", DASHBOARD_ENDPOINTS.procurementPlan],
        ["demandForecast", DASHBOARD_ENDPOINTS.demandForecast],
        ["eoq", DASHBOARD_ENDPOINTS.eoqAnalytics],
        ["suppliers", DASHBOARD_ENDPOINTS.supplierAnalytics],
        ["expiry", DASHBOARD_ENDPOINTS.expiryAnalytics],
        ["decision", DASHBOARD_ENDPOINTS.decisionIntelligence],
        ["outcomes", DASHBOARD_ENDPOINTS.recommendationOutcomes],
        ["procurementIntelligence", DASHBOARD_ENDPOINTS.procurementIntelligence],
        ["demandMenu", DASHBOARD_ENDPOINTS.demandMenuIntelligence],
        ["controlTower", DASHBOARD_ENDPOINTS.controlTower],
        ["moneyLeaks", DASHBOARD_ENDPOINTS.moneyLeaks],
        ["actionOptimizer", DASHBOARD_ENDPOINTS.actionOptimizer],
        ["wasteRescue", DASHBOARD_ENDPOINTS.wasteRescue],
        ["impactLedger", DASHBOARD_ENDPOINTS.impactLedger],
        ["decisionCenter", DASHBOARD_ENDPOINTS.decisionCenter],
      ];
      const results = await Promise.all(requests.map(async ([key, url]) => {
        try {
          const response = await apiFetch(url);
          const json = await response.json().catch(() => ({}));
          return [key, response.ok ? json : { success: false, message: json.message || `Failed to load ${key}` }];
        } catch (error) {
          return [key, { success: false, message: error.message }];
        }
      }));
      const payload = Object.fromEntries(results);
      const dashboard = payload.dashboard?.dashboard || {};
      const alerts = payload.dashboard?.alerts || [];
      const reorderSuggestions = payload.reorder?.data || payload.dashboard?.reorderSuggestions || [];
      const procurement = payload.procurement?.data || [];
      const suppliers = payload.suppliers?.data || [];
      const expiry = payload.expiry?.data || [];
      const demandForecast = payload.demandForecast?.data || [];
      const waste = payload.waste?.data || {};
      const eoq = payload.eoq?.data || [];
      const decision = payload.decision?.data || {};
      const procurementIntelligence = payload.procurementIntelligence?.data || {};
      const demandMenu = payload.demandMenu?.data || {};
      const controlTower = payload.controlTower?.data || {};
      const moneyLeaks = payload.moneyLeaks?.data || {};
      const actionOptimizer = payload.actionOptimizer?.data || {};
      const wasteRescue = payload.wasteRescue?.data || {};
      const impactLedger = payload.impactLedger?.data || {};
      const decisionCenter = payload.decisionCenter?.data || {};
      setImpactLedger(impactLedger);
      setDecisionCenter(decisionCenter);
      setRecommendationOutcomes(payload.outcomes?.data || []);
      const failures = results.filter(([, value]) => value?.success === false);
      const moduleFailures = failures.map(([key, value]) => ({
        key,
        message: value?.message || `Failed to load ${key}`,
      }));
      if (failures.length === results.length) throw new Error("All intelligence services failed.");
      setDashboardAI({
        healthScore: dashboard.healthScore ?? 0,
        topSignal: dashboard.topAiSignal || null,
        demand: { success: payload.dashboard?.dashboard?.demandSummary ? true : false, data: dashboard.demandSummary || {}, topItems: (dashboard.demandSummary?.topSellingRecipes || []).map(item => ({ name:item.menuItemName || item.name, units:item.totalSold, velocity:item.velocity || "high" })) },
        demandForecast: { success: payload.demandForecast?.success !== false, data: demandForecast },
        suppliers: { success: payload.suppliers?.success !== false, data: suppliers },
        reorder: { success: payload.reorder?.success !== false, data: reorderSuggestions },
        procurement: { success: payload.procurement?.success !== false, data: procurement, summary: payload.procurement?.summary || {} },
        procurementIntelligence: { success: payload.procurementIntelligence?.success !== false, data: procurementIntelligence },
        actionCenter: { success: true, data: alerts },
        sales: { success: true, data: payload.dashboard?.salesHighlights || [] },
        waste: { success: payload.waste?.success !== false, data: waste },
        inventorySummary: { success: true, data: dashboard.inventorySummary || {} },
        operationalSummary: { success: true, data: dashboard.operationalSummary || {} },
        expiry: { success: payload.expiry?.success !== false, data: expiry },
        eoq: { success: payload.eoq?.success !== false, data: eoq },
        stockRisk: { success: true, data: [] },
        decision: { success: payload.decision?.success !== false, data: decision },
        demandMenu: { success: payload.demandMenu?.success !== false, data: demandMenu },
        controlTower: { success: payload.controlTower?.success !== false, data: controlTower },
        moneyLeaks: { success: payload.moneyLeaks?.success !== false, data: moneyLeaks },
        actionOptimizer: { success: payload.actionOptimizer?.success !== false, data: actionOptimizer },
        wasteRescue: { success: payload.wasteRescue?.success !== false, data: wasteRescue },
        impactLedger: { success: payload.impactLedger?.success !== false, data: impactLedger },
        decisionCenter: { success: payload.decisionCenter?.success !== false, data: decisionCenter },
        moduleHealth: {
          success: moduleFailures.length === 0,
          failures: moduleFailures,
        },
      });
      if (moduleFailures.length) {
        const labels = moduleFailures.map((item) => item.key).join(", ");
        setAiError(`${moduleFailures.length} module(s) need attention: ${labels}. Available intelligence is still shown.`);
      }
    } catch (err) {
      console.error("Dashboard intelligence fetch failed:", err);
      setAiError(err.message || "Failed to fetch intelligence data.");
    } finally {
      setAiLoading(false);
    }
  };

  const receiveSmartPurchaseOrder = async (purchaseOrder) => {
    try {
      setProcurementLoading(true); setProcurementMessage("");
      const response = await apiFetch(withWorkspace(`${DASHBOARD_ENDPOINTS.procurementOrders}/${purchaseOrder.id}/receive`), {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ receivedQuantity: purchaseOrder.quantityOrdered }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data.success === false) throw new Error(data.message || "Failed to receive purchase order.");
      setProcurementMessage(`${purchaseOrder.itemName} received and inventory updated.`);
      await fetchDashboardAI();
    } catch (err) { setProcurementMessage(err.message || "Receiving failed."); }
    finally { setProcurementLoading(false); }
  };

  const createSmartPurchaseOrders = async (rows = null) => {
    try {
      setProcurementLoading(true);
      setProcurementMessage("");
      const recommendations = rows || dashboardAI.procurementIntelligence?.data?.recommendations || [];
      const selected = recommendations.filter(r => r.purchaseDecision === "Buy now" || r.purchaseDecision === "Buy soon").slice(0, 20);
      if (!selected.length) throw new Error("No purchase-ready recommendations are available.");
      const response = await apiFetch(withWorkspace(DASHBOARD_ENDPOINTS.procurementOrders), {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: selected }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data.success === false) throw new Error(data.message || "Failed to create purchase orders.");
      setProcurementMessage(`${data.count || data.data?.length || 0} smart purchase order(s) created.`);
      await fetchDashboardAI();
    } catch (err) {
      setProcurementMessage(err.message || "Procurement action failed.");
    } finally { setProcurementLoading(false); }
  };

  const runSettingsAction = async (actionName, actionFn) => {
    try {
      setSettingsActionLoading(actionName);
      await actionFn();
      await refreshAllDashboardData();
    } catch (err) {
      console.error(`Settings action failed: ${actionName}`, err);
    } finally {
      setSettingsActionLoading("");
    }
  };

  const handleExportWorkspacePack = () => {
    const report = {
      generatedAt: new Date().toISOString(),
      vendor: vendorData.vendor,
      office: vendorData.office,
      overviewMetrics,
      inventoryItems,
      salesItems,
      recipeItems,
      transactionItems,
      dashboardAI,
      procurementPlan: dashboardAI.procurement,
      supplierCommand: supplierAnalyticsRows,
      supplierProcurementLoad,
      supplierConcentrationData,
      forecastVsActualDemandData,
      topForecastRiskItems,
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], {
      type: "application/json",
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "bizlift-workspace-pack.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    const token = getStoredToken();
    const user = JSON.parse(localStorage.getItem("bizlift_user") || "{}");

    if (!token || !user.vendorId || !user.officeId) {
      return;
    }

    refreshAllDashboardData();
  }, [officeKey, vendorKey]);

  // Near-real-time dashboard synchronization: consume workspace-scoped server events
  // and re-fetch persisted source data so charts never rely on a client-side guess.
  useEffect(() => {
    const token = getStoredToken();
    if (!token) return undefined;

    let stopped = false;
    let controller;
    let refreshTimer;
    const refreshAfterTransaction = () => {
      if (refreshTimer) clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => {
        if (stopped) return;
        refreshAllDashboardData().catch((error) => console.error("Live dashboard refresh failed:", error));
      }, 180);
    };

    const connect = async () => {
      try {
        controller = new AbortController();
        const response = await apiFetch("/realtime/stream?replay=0", { signal: controller.signal });
        if (!response.ok || !response.body) throw new Error(`Realtime stream unavailable (${response.status})`);
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        while (!stopped) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const frames = buffer.split("\n\n");
          buffer = frames.pop() || "";
          for (const frame of frames) {
            const dataLine = frame.split("\n").find((line) => line.startsWith("data:"));
            if (!dataLine) continue;
            try {
              const event = JSON.parse(dataLine.slice(5).trim());
              const name = String(event?.eventName || "");
              if (["sale.created", "order.created", "order.cancelled", "inventory.created", "inventory.changed", "inventory.imported", "inventory.updated"].includes(name)) {
                refreshAfterTransaction();
              }
            } catch { /* ignore malformed heartbeat or event frame */ }
          }
        }
      } catch (error) {
        if (!stopped && error?.name !== "AbortError") console.warn("Realtime stream disconnected; periodic refresh remains active.", error.message);
      }
    };

    connect();
    // Fallback also covers multi-process deployments where in-memory SSE publishers
    // are not shared between backend workers.
    const interval = setInterval(() => {
      if (stopped) return;
      fetchDashboardData().catch((error) => console.error("Dashboard sync fallback failed:", error));
    }, 15000);
    return () => {
      stopped = true;
      controller?.abort();
      clearInterval(interval);
      if (refreshTimer) clearTimeout(refreshTimer);
    };
  }, [officeKey, vendorKey]);

  useEffect(() => {
    const token = getStoredToken();
    if (!token) return undefined;
    const interval = setInterval(() => {
      fetchDashboardAI().catch((error) => console.error("Dashboard AI fetch failed:", error));
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const greeting = useMemo(() => getGreeting(), []);
  const currentDay = useMemo(() => getCurrentDay(), []);
  const currentMonth = useMemo(() => getCurrentMonth(), []);
  const currentYear = useMemo(() => getCurrentYear(), []);

  const eoqValue = useMemo(() => {
    if (!demand || !orderingCost || !holdingCost || holdingCost <= 0) return 0;
    return Math.sqrt((2 * demand * orderingCost) / holdingCost);
  }, [demand, orderingCost, holdingCost]);

  const vendorData = useMemo(() => {
    return (
      vendorDataMap[vendorKey] || {
        vendor: "Vendor Workspace",
        office: officeKey || "Office",
        inventoryValue: "₹0",
        lowStock: 0,
        expiryRisk: 0,
        forecast: "0%",
        quickStats: [],
      }
    );
  }, [vendorKey, officeKey]);

  const categories = useMemo(() => {
    return [
      "All",
      ...new Set(inventoryItems.map((item) => item.category).filter(Boolean)),
    ];
  }, [inventoryItems]);

  const suppliers = useMemo(() => {
    return [
      "All",
      ...new Set(inventoryItems.map((item) => item.supplier).filter(Boolean)),
    ];
  }, [inventoryItems]);

  const alertItems = useMemo(() => {
    return inventoryItems.filter(
      (item) => Number(item.currentStock) <= Number(item.minThreshold),
    );
  }, [inventoryItems]);

  const filteredAlertItems = useMemo(() => {
    return alertItems.filter((item) => {
      const categoryMatch =
        selectedAlertCategory === "All" ||
        item.category === selectedAlertCategory;

      const supplierMatch =
        selectedAlertSupplier === "All" ||
        item.supplier === selectedAlertSupplier;

      return categoryMatch && supplierMatch;
    });
  }, [alertItems, selectedAlertCategory, selectedAlertSupplier]);

  const topRiskChartData = useMemo(() => {
    return [...filteredAlertItems]
      .sort(
        (a, b) =>
          Number(a.currentStock) / Math.max(Number(a.minThreshold), 1) -
          Number(b.currentStock) / Math.max(Number(b.minThreshold), 1),
      )
      .slice(0, 8)
      .map((item) => ({
        name: item.itemName,
        currentStock: Number(item.currentStock),
        minThreshold: Number(item.minThreshold),
      }));
  }, [filteredAlertItems]);

  const categoryChartData = useMemo(() => {
    const map = {};
    filteredAlertItems.forEach((item) => {
      map[item.category] = (map[item.category] || 0) + 1;
    });
    return Object.entries(map).map(([name, count]) => ({ name, count }));
  }, [filteredAlertItems]);

  const supplierChartData = useMemo(() => {
    const map = {};
    filteredAlertItems.forEach((item) => {
      map[item.supplier] = (map[item.supplier] || 0) + 1;
    });
    return Object.entries(map).map(([name, count]) => ({ name, count }));
  }, [filteredAlertItems]);

  const expiryItems = useMemo(() => {
    const today = new Date();

    return inventoryItems
      .filter((item) => item.expiryDate)
      .map((item) => {
        const expiry = new Date(item.expiryDate);
        const diffTime = expiry - today;
        const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        return {
          ...item,
          daysLeft,
        };
      })
      .filter((item) => item.daysLeft <= 7);
  }, [inventoryItems]);

  const filteredExpiryItems = useMemo(() => {
    return expiryItems.filter((item) => {
      const categoryMatch =
        selectedExpiryCategory === "All" ||
        item.category === selectedExpiryCategory;

      const supplierMatch =
        selectedExpirySupplier === "All" ||
        item.supplier === selectedExpirySupplier;

      return categoryMatch && supplierMatch;
    });
  }, [expiryItems, selectedExpiryCategory, selectedExpirySupplier]);

  const expirySoonItems = useMemo(() => {
    return filteredExpiryItems.filter(
      (item) => item.daysLeft >= 0 && item.daysLeft <= 3,
    );
  }, [filteredExpiryItems]);

  const expiredItems = useMemo(() => {
    return filteredExpiryItems.filter((item) => item.daysLeft < 0);
  }, [filteredExpiryItems]);

  const expiryCategoryChartData = useMemo(() => {
    const map = {};
    filteredExpiryItems.forEach((item) => {
      map[item.category] = (map[item.category] || 0) + 1;
    });
    return Object.entries(map).map(([name, count]) => ({ name, count }));
  }, [filteredExpiryItems]);

  const expirySupplierChartData = useMemo(() => {
    const map = {};
    filteredExpiryItems.forEach((item) => {
      map[item.supplier] = (map[item.supplier] || 0) + 1;
    });
    return Object.entries(map).map(([name, count]) => ({ name, count }));
  }, [filteredExpiryItems]);

  const expiryRiskChartData = useMemo(() => {
    return [...filteredExpiryItems]
      .sort((a, b) => a.daysLeft - b.daysLeft)
      .slice(0, 8)
      .map((item) => ({
        name: item.itemName,
        daysLeft: item.daysLeft,
      }));
  }, [filteredExpiryItems]);

  const forecastMenuOptions = useMemo(() => {
    const backendItems =
      dashboardAI.sales?.data?.topMenuItems?.map((item) => item.menuItemName) ||
      [];

    const rawItems = salesItems
      .map((sale) => sale.menuItemName)
      .filter(Boolean);

    return ["All", ...new Set([...backendItems, ...rawItems])];
  }, [dashboardAI.sales, salesItems]);

  const filteredSalesItems = useMemo(() => {
    return salesItems.filter((sale) => {
      return (
        selectedForecastMenuItem === "All" ||
        sale.menuItemName === selectedForecastMenuItem
      );
    });
  }, [salesItems, selectedForecastMenuItem]);

  const totalUnitsSold = useMemo(() => {
    if (
      selectedForecastMenuItem === "All" &&
      dashboardAI.sales?.data?.totalUnitsSold !== undefined
    ) {
      return dashboardAI.sales.data.totalUnitsSold;
    }

    return filteredSalesItems.reduce(
      (sum, sale) => sum + Number(sale.quantitySold || 0),
      0,
    );
  }, [dashboardAI.sales, filteredSalesItems, selectedForecastMenuItem]);

  const totalRevenue = useMemo(() => {
    if (
      selectedForecastMenuItem === "All" &&
      dashboardAI.sales?.data?.totalRevenue !== undefined
    ) {
      return dashboardAI.sales.data.totalRevenue;
    }

    return filteredSalesItems.reduce(
      (sum, sale) => sum + Number(sale.totalAmount || 0),
      0,
    );
  }, [dashboardAI.sales, filteredSalesItems, selectedForecastMenuItem]);

  const salesByMenuItemChartData = useMemo(() => {
    const map = {};
    filteredSalesItems.forEach((sale) => {
      map[sale.menuItemName] =
        (map[sale.menuItemName] || 0) + Number(sale.quantitySold || 0);
    });

    return Object.entries(map)
      .map(([name, units]) => ({ name, units }))
      .sort((a, b) => b.units - a.units)
      .slice(0, 8);
  }, [filteredSalesItems]);

  const dailySalesTrendChartData = useMemo(() => {
    const map = {};
    filteredSalesItems.forEach((sale) => {
      const date = new Date(sale.createdAt).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
      });
      map[date] = (map[date] || 0) + Number(sale.quantitySold || 0);
    });

    return Object.entries(map).map(([date, units]) => ({
      date,
      units,
    }));
  }, [filteredSalesItems]);

  const backendTopMenuItems = useMemo(() => {
    return (
      dashboardAI.sales?.data?.topMenuItems?.map((item) => ({
        name: item.menuItemName,
        units: item.unitsSold,
        revenue: item.revenue,
        saleCount: item.saleCount,
      })) || []
    );
  }, [dashboardAI.sales]);

  const backendRevenueTrend = useMemo(() => {
    return dashboardAI.sales?.data?.revenueTrend || [];
  }, [dashboardAI.sales]);

  const backendUnitTrend = useMemo(() => {
    return dashboardAI.sales?.data?.unitTrend || [];
  }, [dashboardAI.sales]);

  const backendDemandForecastRows = useMemo(() => {
    return dashboardAI.demandForecast?.data || [];
  }, [dashboardAI.demandForecast]);

  const topForecastRiskItems = useMemo(() => {
    return backendDemandForecastRows
      .filter(
        (item) =>
          item.forecastRisk === "Critical" || item.forecastRisk === "High",
      )
      .slice(0, 8);
  }, [backendDemandForecastRows]);

  const topSellingItems = useMemo(() => {
    const normalize = (item) => {
      const name = item?.name ?? item?.menuItemName ?? item?.itemName ?? item?.menu_item_name;
      const rawUnits = item?.units ?? item?.unitsSold ?? item?.totalSold ?? item?.quantitySold ?? item?.quantity_sold;
      const units = Number(rawUnits);
      if (!name || !Number.isFinite(units) || units <= 0) return null;
      return { name: String(name), units, revenue: Number(item?.revenue ?? item?.totalRevenue ?? 0) || 0 };
    };

    const preferred = selectedForecastMenuItem === "All" ? backendTopMenuItems : [];
    const backend = preferred.map(normalize).filter(Boolean);
    const local = salesByMenuItemChartData.map(normalize).filter(Boolean);
    const source = backend.length ? backend : local;
    return source.sort((a, b) => b.units - a.units).slice(0, 8);
  }, [selectedForecastMenuItem, backendTopMenuItems, salesByMenuItemChartData]);

  const formattedRevenue = useMemo(() => new Intl.NumberFormat("en-IN", {
    style: "currency", currency: "INR", maximumFractionDigits: 2,
  }).format(Number(totalRevenue) || 0), [totalRevenue]);

  const quickSaleOptions = useMemo(() => {
    return recipeItems.map((recipe) => ({
      id: recipe.id,
      name: recipe.menuItemName,
    }));
  }, [recipeItems]);

  const recentSalesPreview = useMemo(() => {
    return (
      dashboardAI.sales?.data?.recentSales?.slice(0, 5) ||
      salesItems.slice(0, 5)
    );
  }, [dashboardAI.sales, salesItems]);

  const wasteTransactions = useMemo(() => {
    return transactionItems.filter((tx) => {
      const reason = String(tx.reason || "").toLowerCase();
      return (
        reason.includes("waste") ||
        reason.includes("expired") ||
        reason.includes("spoil")
      );
    });
  }, [transactionItems]);

  const totalWasteQuantity = useMemo(() => {
    return (
      dashboardAI.waste?.data?.totalWasteQuantity ??
      wasteTransactions.reduce(
        (sum, item) => sum + Number(item.quantity || 0),
        0,
      )
    );
  }, [dashboardAI.waste, wasteTransactions]);

  const totalWasteCost = useMemo(() => {
    return (
      dashboardAI.waste?.data?.totalWasteCost ??
      wasteTransactions.reduce((sum, tx) => {
        const inv = inventoryItems.find((item) => item.id === tx.itemId);
        const costPrice = Number(inv?.costPrice || 0);
        return sum + Number(tx.quantity || 0) * costPrice;
      }, 0)
    );
  }, [dashboardAI.waste, wasteTransactions, inventoryItems]);

  const wasteByIngredientChart = useMemo(() => {
    if (dashboardAI.waste?.data?.topWasteItems) {
      return dashboardAI.waste.data.topWasteItems.map((item) => ({
        name: item.itemName,
        value: item.quantity,
      }));
    }

    const map = {};
    wasteTransactions.forEach((item) => {
      map[item.itemName] =
        (map[item.itemName] || 0) + Number(item.quantity || 0);
    });

    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .slice(0, 6);
  }, [dashboardAI.waste, wasteTransactions]);

  const wasteTrendChart = useMemo(() => {
    if (dashboardAI.waste?.data?.wasteTrend) {
      return dashboardAI.waste.data.wasteTrend.map((item) => ({
        date: item.date,
        waste: item.quantity,
      }));
    }

    const map = {};
    wasteTransactions.forEach((item) => {
      const date = new Date(item.timestamp).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
      });
      map[date] = (map[date] || 0) + Number(item.quantity || 0);
    });

    return Object.entries(map).map(([date, waste]) => ({
      date,
      waste,
    }));
  }, [dashboardAI.waste, wasteTransactions]);

  const wasteByCategoryChart = useMemo(() => {
    if (dashboardAI.waste?.data?.wasteByCategory) {
      return dashboardAI.waste.data.wasteByCategory.map((item) => ({
        name: item.category,
        value: item.quantity,
      }));
    }

    const map = {};
    wasteTransactions.forEach((tx) => {
      const inv = inventoryItems.find((item) => item.id === tx.itemId);
      const category = inv?.category || "Unknown";
      map[category] = (map[category] || 0) + Number(tx.quantity || 0);
    });

    return Object.entries(map).map(([name, value]) => ({
      name,
      value,
    }));
  }, [dashboardAI.waste, wasteTransactions, inventoryItems]);

  const projectedDemandChartData = useMemo(() => {
    const baseData = [...dailySalesTrendChartData];

    if (baseData.length === 0) return [];

    const recent = baseData.slice(-5);
    const avg =
      recent.reduce((sum, item) => sum + Number(item.units || 0), 0) /
      Math.max(recent.length, 1);

    const extended = [...baseData];

    for (let i = 1; i <= 3; i++) {
      extended.push({
        date: `F+${i}`,
        units: null,
        forecast: Math.round(avg * (1 + i * 0.08)),
      });
    }

    return extended.map((item) => ({
      date: item.date,
      units: item.units ?? null,
      forecast:
        item.forecast ??
        (typeof item.units === "number" ? Math.round(item.units * 1.05) : null),
    }));
  }, [dailySalesTrendChartData]);

  const aiInsights = useMemo(() => {
    const insights = [];

    if (alertItems.length > 0) {
      insights.push({
        title: "Low stock pressure rising",
        detail: `${alertItems.length} items are below threshold and may affect service continuity.`,
        tone: "yellow",
      });
    }

    if (expiryItems.length > 0) {
      insights.push({
        title: "Expiry risk detected",
        detail: `${expiryItems.length} items require rotation or action within the next 7 days.`,
        tone: "red",
      });
    }

    if (topSellingItems.length > 0) {
      insights.push({
        title: "Top demand driver identified",
        detail: `${topSellingItems[0].name} is currently leading demand with ${topSellingItems[0].units} units sold.`,
        tone: "green",
      });
    }

    return insights;
  }, [alertItems, expiryItems, topSellingItems]);

  const reorderItems = useMemo(() => {
    if (dashboardAI.reorder?.data?.length) {
      return dashboardAI.reorder.data.map((item) => ({
        ...item,
        id: item.inventoryItemId,
        name: item.inventoryItemName,
        itemName: item.inventoryItemName,
        suggestedReorderQty: item.recommendedOrderQty,
        estimatedCost:
          (item.recommendedOrderQty || 0) * (item.costPrice || 100), // Fallback cost
      }));
    }

    return [];
  }, [dashboardAI.procurement, dashboardAI.reorder]);

  const reorderCostChartData = useMemo(() => {
    return reorderItems.slice(0, 8).map((item) => ({
      name: item.itemName,
      cost: Math.round(item.estimatedCost),
    }));
  }, [reorderItems]);

  const reorderQtyChartData = useMemo(() => {
    return reorderItems.slice(0, 8).map((item) => ({
      name: item.itemName,
      qty: item.suggestedReorderQty,
    }));
  }, [reorderItems]);

  const reorderSupplierChartData = useMemo(() => {
    const map = {};

    reorderItems.forEach((item) => {
      map[item.supplier] = (map[item.supplier] || 0) + 1;
    });

    return Object.entries(map).map(([name, count]) => ({
      name,
      count,
    }));
  }, [reorderItems]);

  const healthScore = useMemo(() => {
    const lowStockPenalty = Math.min(alertItems.length * 4, 25);
    const expiryPenalty = Math.min(expiryItems.length * 3, 20);
    const wastePenalty = Math.min(wasteTransactions.length * 2, 20);

    const score = Math.max(
      100 - lowStockPenalty - expiryPenalty - wastePenalty,
      35,
    );
    return Math.round(score);
  }, [alertItems, expiryItems, wasteTransactions]);

  const healthStatus = useMemo(() => {
    if (healthScore >= 85) return "Strong";
    if (healthScore >= 70) return "Stable";
    if (healthScore >= 55) return "Needs Attention";
    return "Critical";
  }, [healthScore]);

  const allActionItems = useMemo(() => {
    return dashboardAI.actionCenter?.data || [];
  }, [dashboardAI.actionCenter]);

  const featuredActions = useMemo(() => {
    return allActionItems
      .filter((action) => action.state !== "dismissed")
      .slice(0, 2)
      .map((action) => ({
        actionKey: action.actionKey,
        state: action.state,
        title: action.title,
        detail: `${action.detail}${action.impact ? ` • ${action.impact}` : ""}`,
        type:
          action.priority === "Critical"
            ? "danger"
            : action.priority === "High"
              ? "warning"
              : action.type === "supplier"
                ? "info"
                : "success",
        priority: action.priority,
      }));
  }, [allActionItems]);

  const actionPriorityOptions = ["All", "Critical", "High", "Medium", "Low"];
  const actionStateOptions = ["All", "active", "reviewed", "snoozed"];

  const filteredActionItems = useMemo(() => {
    return allActionItems.filter((action) => {
      const matchesPriority =
        selectedActionPriority === "All" ||
        action.priority === selectedActionPriority;

      const matchesState =
        selectedActionState === "All" ||
        (action.state || "active") === selectedActionState;

      const search = actionSearchTerm.trim().toLowerCase();

      const matchesSearch =
        !search ||
        action.title?.toLowerCase().includes(search) ||
        action.detail?.toLowerCase().includes(search) ||
        action.impact?.toLowerCase().includes(search) ||
        action.meta?.supplier?.toLowerCase?.().includes(search);

      return matchesPriority && matchesState && matchesSearch;
    });
  }, [
    allActionItems,
    selectedActionPriority,
    selectedActionState,
    actionSearchTerm,
  ]);

  const priorityActions = useMemo(() => {
    const actions = [];

    if (alertItems.length > 0) {
      actions.push({
        title: "Resolve low stock items",
        detail: `${alertItems.length} items need replenishment action.`,
        type: "warning",
        priority: "High",
        priorityScore: 0,
      });
    }

    if (expiryItems.length > 0) {
      actions.push({
        title: "Act on expiry risk",
        detail: `${expiryItems.length} items are nearing expiry in the next 7 days.`,
        type: "danger",
        priority: "High",
        priorityScore: 0,
      });
    }

    if (wasteTransactions.length > 0) {
      actions.push({
        title: "Reduce waste drivers",
        detail: `${wasteTransactions.length} waste-related events were detected.`,
        type: "info",
        priority: "Medium",
        priorityScore: 0,
      });
    }

    if (topSellingItems.length > 0) {
      actions.push({
        title: "Support top demand items",
        detail: `${topSellingItems[0].name} is your strongest demand driver right now.`,
        type: "success",
        priority: "Medium",
        priorityScore: 0,
      });
    }

    return actions.slice(0, 4);
  }, [
    dashboardAI.actionCenter,
    alertItems,
    expiryItems,
    wasteTransactions,
    topSellingItems,
  ]);

  const forecastVsActualDemandData = useMemo(() => {
    if (selectedForecastMenuItem === "All" && backendUnitTrend.length > 0) {
      return backendUnitTrend.map((item, index, arr) => {
        const window = arr.slice(Math.max(0, index - 2), index + 1);
        const avg =
          window.reduce((sum, row) => sum + Number(row.units || 0), 0) /
          Math.max(window.length, 1);

        return {
          date: item.date,
          actual: item.units,
          forecast: Math.round(avg * 1.08),
        };
      });
    }

    return projectedDemandChartData.map((item) => ({
      date: item.date,
      actual: item.units,
      forecast: item.forecast,
    }));
  }, [selectedForecastMenuItem, backendUnitTrend, projectedDemandChartData]);

  const recommendationCards = useMemo(() => {
    const cards = [];

    if (reorderItems.length > 0) {
      const topReorder = reorderItems[0];
      cards.push({
        title: "Suggested reorder now",
        detail: `${topReorder.itemName} should be reordered from ${topReorder.supplier}. Recommended qty: ${
          topReorder.suggestedReorderQty || topReorder.recommendedOrderQty
        } ${topReorder.unit}. ${
          topReorder.coverageDaysAfterReorder
            ? `Coverage after reorder: ${topReorder.coverageDaysAfterReorder} days.`
            : ""
        }`,
        color: "green",
      });
    }

    if (dashboardAI.demandForecast?.data?.length) {
      const riskyForecastItem = dashboardAI.demandForecast.data.find(
        (item) =>
          item.forecastRisk === "Critical" || item.forecastRisk === "High",
      );

      if (riskyForecastItem) {
        cards.push({
          title: "Forecasted stock pressure",
          detail: `${riskyForecastItem.itemName} may hit ${riskyForecastItem.forecastRisk.toLowerCase()} risk within 7–14 days based on projected usage.`,
          color: "blue",
        });
      }
    }

    if (expirySoonItems.length > 0) {
      const topExpiry = expirySoonItems[0];
      cards.push({
        title: "Use or promote urgently",
        detail: `${topExpiry.itemName} is expiring in ${topExpiry.daysLeft} day(s). Push it into fast-moving menu items.`,
        color: "amber",
      });
    }

    if (wasteByIngredientChart.length > 0) {
      cards.push({
        title: "Waste control recommendation",
        detail: `${wasteByIngredientChart[0].name} appears in waste analysis. Reduce over-prep or tighten portion usage.`,
        color: "red",
      });
    }

    return cards.slice(0, 4);
  }, [
    reorderItems,
    dashboardAI.demandForecast,
    expirySoonItems,
    wasteByIngredientChart,
  ]);

  const handleQuickSale = async () => {
    if (
      !quickSaleRecipeId ||
      !quickSaleQuantity ||
      Number(quickSaleQuantity) <= 0
    ) {
      setQuickSaleMessage("Select a menu item and valid quantity.");
      return;
    }

    try {
      setQuickSaleLoading(true);
      setQuickSaleMessage("");

      const response = await apiFetch(DASHBOARD_ENDPOINTS.sales, {
        method: "POST",
        body: JSON.stringify({
          recipeId: quickSaleRecipeId,
          quantitySold: Number(quickSaleQuantity),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Failed to record sale");
      }

      setQuickSaleMessage("✅ Sale recorded successfully.");
      setQuickSaleRecipeId("");
      setQuickSaleQuantity(1);

      await refreshAllDashboardData();
    } catch (error) {
      setQuickSaleMessage(error.message || "Failed to record sale.");
    } finally {
      setQuickSaleLoading(false);
    }
  };

  const renderLowStockContent = () => {
    const totalAlerts = filteredAlertItems.length;
    const lowCount = filteredAlertItems.filter(
      (item) => Number(item.currentStock) > 0,
    ).length;
    const outCount = filteredAlertItems.filter(
      (item) => Number(item.currentStock) === 0,
    ).length;

    return (
      <div className="space-y-6">
        <div
          className={`rounded-[28px] border p-5 shadow-lg backdrop-blur-sm ${
            isDark
              ? "border-white/10 bg-white/[0.04]"
              : "border-black/10 bg-white/80"
          }`}
        >
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p
                className={
                  isDark ? "text-sm text-white/50" : "text-sm text-[#1A2119]/50"
                }
              >
                Filter Alert Insights
              </p>
              <h3
                className={
                  isDark
                    ? "mt-2 text-xl font-semibold text-white"
                    : "mt-2 text-xl font-semibold text-[#1A2119]"
                }
              >
                Category & Supplier Views
              </h3>
            </div>

            <div className="flex flex-wrap gap-3">
              <FilterSelect
                value={selectedAlertCategory}
                onChange={(e) => setSelectedAlertCategory(e.target.value)}
                options={categories}
                isDark={isDark}
              />
              <FilterSelect
                value={selectedAlertSupplier}
                onChange={(e) => setSelectedAlertSupplier(e.target.value)}
                options={suppliers}
                isDark={isDark}
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <MetricCard
            title="Total Alerts"
            value={totalAlerts}
            note="Filtered view"
            noteClass="text-[#9ad17b]"
            isDark={isDark}
          />
          <MetricCard
            title="Low Stock"
            value={lowCount}
            note="Below threshold"
            noteClass="text-yellow-400"
            isDark={isDark}
          />
          <MetricCard
            title="Out of Stock"
            value={outCount}
            note="Immediate action"
            noteClass="text-red-400"
            isDark={isDark}
          />
        </div>

        {inventoryLoading ? (
          <div
            className={`rounded-[28px] border p-8 text-center ${
              isDark
                ? "border-white/10 bg-white/[0.04] text-white/60"
                : "border-black/10 bg-white/80 text-[#1A2119]/60"
            }`}
          >
            Loading analytics...
          </div>
        ) : inventoryError ? (
          <div
            className={`rounded-[28px] border p-8 text-center ${
              isDark
                ? "border-red-500/20 bg-red-900/10 text-red-300"
                : "border-red-200 bg-red-50 text-red-600"
            }`}
          >
            {inventoryError}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
              <div className="xl:col-span-7">
                <AnalyticsCard
                  title="Top Risk Items"
                  subtitle="Current Stock vs Threshold"
                  isDark={isDark}
                >
                  <div
                    className="h-[400px] px-1 py-2"
                  >
                    <ResponsiveContainer width="100%" height={340} minWidth={0} minHeight={280}>
                      <BarChart
                        data={
                          Array.isArray(topRiskChartData)
                            ? topRiskChartData
                            : []
                        }
                        layout="vertical"
                        margin={{ left: 20 }}
                      >
                        <defs>
                          <linearGradient
                            id="stockGradient"
                            x1="0"
                            y1="0"
                            x2="1"
                            y2="0"
                          >
                            <stop offset="0%" stopColor="#d8f2c9" />
                            <stop offset="100%" stopColor="#9ad17b" />
                          </linearGradient>
                          <linearGradient
                            id="thresholdGradient"
                            x1="0"
                            y1="0"
                            x2="1"
                            y2="0"
                          >
                            <stop offset="0%" stopColor="#ffd0d0" />
                            <stop offset="100%" stopColor="#ef4444" />
                          </linearGradient>
                        </defs>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke={isDark ? "rgba(255,255,255,0.12)" : "#d9ddd4"}
                        />
                        <XAxis
                          type="number"
                          stroke={isDark ? "#ffffff99" : "#1A211999"}
                        />
                        <YAxis
                          type="category"
                          dataKey="name"
                          width={120}
                          stroke={isDark ? "#ffffff99" : "#1A211999"}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: isDark ? "#111111" : "#ffffff",
                            border: isDark
                              ? "1px solid rgba(255,255,255,0.1)"
                              : "1px solid #e5e7eb",
                            borderRadius: "16px",
                            color: isDark ? "#fff" : "#111",
                          }}
                        />
                        <Legend />
                        <Bar
                          dataKey="currentStock"
                          fill="url(#stockGradient)"
                          radius={[0, 10, 10, 0]}
                        />
                        <Bar
                          dataKey="minThreshold"
                          fill="url(#thresholdGradient)"
                          radius={[0, 10, 10, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </AnalyticsCard>
              </div>

              <div className="xl:col-span-5">
                <AnalyticsCard
                  title="Category Alert Split"
                  subtitle="Filtered categories"
                  isDark={isDark}
                >
                  <div
                    className={`h-[400px] px-1 py-2 ${
                      isDark
                        ? "border-white/10 bg-black/20 shadow-[0_0_25px_rgba(154,209,123,0.06)]"
                        : "border-black/10 bg-[#f6f6f2]"
                    }`}
                  >
                    <ResponsiveContainer width="100%" height={340} minWidth={0} minHeight={280}>
                      <PieChart>
                        <Pie
                          data={
                            Array.isArray(categoryChartData)
                              ? categoryChartData
                              : []
                          }
                          dataKey="count"
                          nameKey="name"
                          outerRadius={110}
                          innerRadius={55}
                          label
                        >
                          {categoryChartData.map((_, index) => (
                            <Cell
                              key={index}
                              fill={chartColors[index % chartColors.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: isDark ? "#111111" : "#ffffff",
                            border: isDark
                              ? "1px solid rgba(255,255,255,0.1)"
                              : "1px solid #e5e7eb",
                            borderRadius: "16px",
                            color: isDark ? "#fff" : "#111",
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </AnalyticsCard>
              </div>
            </div>

            <AnalyticsCard
              title="Supplier Risk Comparison"
              subtitle="Alerts grouped by supplier"
              isDark={isDark}
            >
              <div
                className={`h-[360px] px-1 py-2 ${
                  isDark
                    ? "border-white/10 bg-black/20 shadow-[0_0_25px_rgba(239,68,68,0.08)]"
                    : "border-black/10 bg-[#f6f6f2]"
                }`}
              >
                <ResponsiveContainer width="100%" height={340} minWidth={0} minHeight={280}>
                  <AreaChart
                    data={
                      Array.isArray(dashboardAI.suppliers?.distribution)
                        ? dashboardAI.suppliers.distribution
                        : supplierChartData || []
                    }
                  >
                    <defs>
                      <linearGradient
                        id="supplierArea"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="#ef4444"
                          stopOpacity={0.8}
                        />
                        <stop
                          offset="95%"
                          stopColor="#ef4444"
                          stopOpacity={0.05}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke={isDark ? "rgba(255,255,255,0.12)" : "#d9ddd4"}
                    />
                    <XAxis
                      dataKey="name"
                      stroke={isDark ? "#ffffff99" : "#1A211999"}
                    />
                    <YAxis stroke={isDark ? "#ffffff99" : "#1A211999"} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: isDark ? "#111111" : "#ffffff",
                        border: isDark
                          ? "1px solid rgba(255,255,255,0.1)"
                          : "1px solid #e5e7eb",
                        borderRadius: "16px",
                        color: isDark ? "#fff" : "#111",
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="count"
                      stroke="#ef4444"
                      fillOpacity={1}
                      fill="url(#supplierArea)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </AnalyticsCard>

            <AnalyticsCard
              title="Alert Items Table"
              subtitle="Detailed filtered stock risks"
              isDark={isDark}
            >
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm text-left">
                  <thead
                    className={`border-b ${
                      isDark
                        ? "border-white/10 text-white/65"
                        : "border-black/10 text-[#1A2119]/65"
                    }`}
                  >
                    <tr>
                      <th className="px-4 py-3 font-medium">Item</th>
                      <th className="px-4 py-3 font-medium">Category</th>
                      <th className="px-4 py-3 font-medium">Supplier</th>
                      <th className="px-4 py-3 font-medium">Current Stock</th>
                      <th className="px-4 py-3 font-medium">Threshold</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAlertItems.length > 0 ? (
                      filteredAlertItems.map((item) => (
                        <tr
                          key={item.id}
                          className={`border-b ${
                            isDark
                              ? "border-white/10 text-white/85"
                              : "border-black/10 text-[#1A2119]/85"
                          }`}
                        >
                          <td className="px-4 py-4 font-medium">
                            {item.itemName}
                          </td>
                          <td className="px-4 py-4">{item.category}</td>
                          <td className="px-4 py-4">{item.supplier}</td>
                          <td className="px-4 py-4">
                            {item.currentStock} {item.unit}
                          </td>
                          <td className="px-4 py-4">
                            {item.minThreshold} {item.unit}
                          </td>
                          <td className="px-4 py-4">
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                Number(item.currentStock) === 0
                                  ? "bg-red-100 text-red-700"
                                  : "bg-yellow-100 text-yellow-700"
                              }`}
                            >
                              {Number(item.currentStock) === 0
                                ? "Out of Stock"
                                : "Low Stock"}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan="6"
                          className={`px-4 py-8 text-center ${
                            isDark ? "text-white/40" : "text-[#1A2119]/40"
                          }`}
                        >
                          No alert items found for the selected filters.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </AnalyticsCard>
          </>
        )}
      </div>
    );
  };

  const renderExpiryMonitorContent = () => {
    return (
      <div className="space-y-6">
        <div
          className={`rounded-[28px] border p-5 shadow-lg backdrop-blur-sm ${
            isDark
              ? "border-white/10 bg-white/[0.04]"
              : "border-black/10 bg-white/80"
          }`}
        >
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p
                className={
                  isDark ? "text-sm text-white/50" : "text-sm text-[#1A2119]/50"
                }
              >
                Filter Expiry Insights
              </p>
              <h3
                className={
                  isDark
                    ? "mt-2 text-xl font-semibold text-white"
                    : "mt-2 text-xl font-semibold text-[#1A2119]"
                }
              >
                Category & Supplier Views
              </h3>
            </div>

            <div className="flex flex-wrap gap-3">
              <FilterSelect
                value={selectedExpiryCategory}
                onChange={(e) => setSelectedExpiryCategory(e.target.value)}
                options={categories}
                isDark={isDark}
              />
              <FilterSelect
                value={selectedExpirySupplier}
                onChange={(e) => setSelectedExpirySupplier(e.target.value)}
                options={suppliers}
                isDark={isDark}
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <MetricCard
            title="Total Expiry Risks"
            value={filteredExpiryItems.length}
            note="Next 7 days"
            noteClass="text-[#9ad17b]"
            isDark={isDark}
          />
          <MetricCard
            title="Expiring Very Soon"
            value={expirySoonItems.length}
            note="0 to 3 days"
            noteClass="text-yellow-400"
            isDark={isDark}
          />
          <MetricCard
            title="Already Expired"
            value={expiredItems.length}
            note="Immediate action"
            noteClass="text-red-400"
            isDark={isDark}
          />
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
          <div className="xl:col-span-7">
            <AnalyticsCard
              title="Top Expiry Risk Items"
              subtitle="Days left before expiry"
              isDark={isDark}
            >
              <div
                className={`h-[400px] px-1 py-2 ${
                  isDark
                    ? "border-white/10 bg-black/20 shadow-[0_0_30px_rgba(239,68,68,0.08)]"
                    : "border-black/10 bg-[#f6f6f2]"
                }`}
              >
                <ResponsiveContainer width="100%" height={340} minWidth={0} minHeight={280}>
                  <AreaChart
                    data={
                      Array.isArray(expiryRiskChartData)
                        ? expiryRiskChartData
                        : []
                    }
                  >
                    <defs>
                      <linearGradient
                        id="expiryArea"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="#ef4444"
                          stopOpacity={0.8}
                        />
                        <stop
                          offset="95%"
                          stopColor="#ef4444"
                          stopOpacity={0.05}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke={isDark ? "rgba(255,255,255,0.12)" : "#d9ddd4"}
                    />
                    <XAxis
                      dataKey="name"
                      stroke={isDark ? "#ffffff99" : "#1A211999"}
                    />
                    <YAxis stroke={isDark ? "#ffffff99" : "#1A211999"} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: isDark ? "#111111" : "#ffffff",
                        border: isDark
                          ? "1px solid rgba(255,255,255,0.1)"
                          : "1px solid #e5e7eb",
                        borderRadius: "16px",
                        color: isDark ? "#fff" : "#111",
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="daysLeft"
                      stroke="#ef4444"
                      fillOpacity={1}
                      fill="url(#expiryArea)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </AnalyticsCard>
          </div>

          <div className="xl:col-span-5">
            <AnalyticsCard
              title="Expiry by Category"
              subtitle="Filtered categories"
              isDark={isDark}
            >
              <div
                className={`h-[400px] px-1 py-2 ${
                  isDark
                    ? "border-white/10 bg-black/20 shadow-[0_0_25px_rgba(239,68,68,0.06)]"
                    : "border-black/10 bg-[#f6f6f2]"
                }`}
              >
                <ResponsiveContainer width="100%" height={340} minWidth={0} minHeight={280}>
                  <PieChart>
                    <Pie
                      data={
                        Array.isArray(expiryCategoryChartData)
                          ? expiryCategoryChartData
                          : []
                      }
                      dataKey="count"
                      nameKey="name"
                      outerRadius={110}
                      innerRadius={50}
                      label
                    >
                      {expiryCategoryChartData.map((_, index) => (
                        <Cell
                          key={index}
                          fill={chartColors[index % chartColors.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: isDark ? "#111111" : "#ffffff",
                        border: isDark
                          ? "1px solid rgba(255,255,255,0.1)"
                          : "1px solid #e5e7eb",
                        borderRadius: "16px",
                        color: isDark ? "#fff" : "#111",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </AnalyticsCard>
          </div>
        </div>

        <AnalyticsCard
          title="Supplier Expiry Exposure"
          subtitle="Risks grouped by supplier"
          isDark={isDark}
        >
          <div
            className={`h-[360px] px-1 py-2 ${
              isDark
                ? "border-white/10 bg-black/20 shadow-[0_0_25px_rgba(245,158,11,0.08)]"
                : "border-black/10 bg-[#f6f6f2]"
            }`}
          >
            <ResponsiveContainer width="100%" height={340} minWidth={0} minHeight={280}>
              <BarChart
                data={
                  Array.isArray(expirySupplierChartData)
                    ? expirySupplierChartData
                    : []
                }
              >
                <defs>
                  <linearGradient
                    id="expirySupplierGradient"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="0%" stopColor="#ffe2b8" />
                    <stop offset="100%" stopColor="#f59e0b" />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={isDark ? "rgba(255,255,255,0.12)" : "#d9ddd4"}
                />
                <XAxis
                  dataKey="name"
                  stroke={isDark ? "#ffffff99" : "#1A211999"}
                />
                <YAxis stroke={isDark ? "#ffffff99" : "#1A211999"} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: isDark ? "#111111" : "#ffffff",
                    border: isDark
                      ? "1px solid rgba(255,255,255,0.1)"
                      : "1px solid #e5e7eb",
                    borderRadius: "16px",
                    color: isDark ? "#fff" : "#111",
                  }}
                />
                <Bar
                  dataKey="count"
                  fill="url(#expirySupplierGradient)"
                  radius={[10, 10, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </AnalyticsCard>

        <AnalyticsCard
          title="Expiry Risk Table"
          subtitle="Detailed filtered expiry items"
          isDark={isDark}
        >
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm text-left">
              <thead
                className={`border-b ${
                  isDark
                    ? "border-white/10 text-white/65"
                    : "border-black/10 text-[#1A2119]/65"
                }`}
              >
                <tr>
                  <th className="px-4 py-3 font-medium">Item</th>
                  <th className="px-4 py-3 font-medium">Category</th>
                  <th className="px-4 py-3 font-medium">Supplier</th>
                  <th className="px-4 py-3 font-medium">Expiry Date</th>
                  <th className="px-4 py-3 font-medium">Days Left</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredExpiryItems.length > 0 ? (
                  filteredExpiryItems.map((item) => (
                    <tr
                      key={item.id}
                      className={`border-b ${
                        isDark
                          ? "border-white/10 text-white/85"
                          : "border-black/10 text-[#1A2119]/85"
                      }`}
                    >
                      <td className="px-4 py-4 font-medium">{item.itemName}</td>
                      <td className="px-4 py-4">{item.category}</td>
                      <td className="px-4 py-4">{item.supplier}</td>
                      <td className="px-4 py-4">{item.expiryDate}</td>
                      <td className="px-4 py-4">{item.daysLeft}</td>
                      <td className="px-4 py-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            item.daysLeft < 0
                              ? "bg-red-100 text-red-700"
                              : item.daysLeft <= 3
                                ? "bg-yellow-100 text-yellow-700"
                                : "bg-orange-100 text-orange-700"
                          }`}
                        >
                          {item.daysLeft < 0
                            ? "Expired"
                            : item.daysLeft <= 3
                              ? "Expiring Soon"
                              : "Watch"}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan="6"
                      className={`px-4 py-8 text-center ${
                        isDark ? "text-white/40" : "text-[#1A2119]/40"
                      }`}
                    >
                      No expiry items found for the selected filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </AnalyticsCard>

        <AnalyticsCard
          title="Security & Observability"
          subtitle="Tenant-scoped health, runtime telemetry, audit activity, and security events"
          isDark={isDark}
        >
          {observability.loading ? (
            <div className="rounded-[20px] border border-white/10 bg-black/10 p-5 text-sm opacity-70">Loading operational telemetry…</div>
          ) : observability.error ? (
            <div className="rounded-[20px] border border-yellow-500/20 bg-yellow-500/10 p-5 text-sm text-yellow-300">{observability.error}</div>
          ) : (
            <div className="space-y-5">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                {[
                  ["API Health", observability.health?.status || "—"],
                  ["Requests", observability.metrics?.requests ?? 0],
                  ["Avg Latency", `${observability.metrics?.requests?.averageDurationMs ?? 0} ms`],
                  ["Audit Events", observability.metrics?.audit?.totalEvents ?? 0],
                ].map(([label, value]) => (
                  <div key={label} className={`rounded-[20px] border p-4 ${isDark ? "border-white/10 bg-black/20" : "border-black/10 bg-[#f6f6f2]"}`}>
                    <p className="text-xs uppercase tracking-[0.16em] opacity-50">{label}</p>
                    <p className="mt-2 text-2xl font-bold">{value}</p>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                <div className={`rounded-[20px] border p-5 ${isDark ? "border-white/10 bg-black/20" : "border-black/10 bg-[#f6f6f2]"}`}>
                  <div className="flex items-center justify-between"><div><p className="font-semibold">Security events</p><p className="mt-1 text-xs opacity-50">Authentication and security activity for this workspace</p></div><span className="rounded-full bg-[#9ad17b]/15 px-3 py-1 text-xs text-[#9ad17b]">{observability.security.length}</span></div>
                  <div className="mt-4 space-y-2">
                    {observability.security.slice(0, 6).map((event) => (
                      <div key={event.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/5 px-3 py-2 text-sm">
                        <span className="truncate">{event.action}</span><span className="shrink-0 text-xs opacity-45">{event.status}</span>
                      </div>
                    ))}
                    {!observability.security.length && <p className="text-sm opacity-50">No security events recorded yet.</p>}
                  </div>
                </div>
                <div className={`rounded-[20px] border p-5 ${isDark ? "border-white/10 bg-black/20" : "border-black/10 bg-[#f6f6f2]"}`}>
                  <div className="flex items-center justify-between"><div><p className="font-semibold">Audit trail</p><p className="mt-1 text-xs opacity-50">Recent actions retained with request correlation IDs</p></div><span className="text-xs opacity-50">{observability.audit.length} loaded</span></div>
                  <div className="mt-4 space-y-2">
                    {observability.audit.slice(0, 6).map((event) => (
                      <div key={event.id} className="rounded-xl border border-white/5 px-3 py-2">
                        <div className="flex items-center justify-between gap-3 text-sm"><span className="truncate">{event.action}</span><span className="shrink-0 text-xs opacity-45">{event.status}</span></div>
                        <p className="mt-1 truncate text-[11px] opacity-40">{event.requestId || "no request id"}</p>
                      </div>
                    ))}
                    {!observability.audit.length && <p className="text-sm opacity-50">No audit events recorded yet.</p>}
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-[18px] border border-[#9ad17b]/20 bg-[#9ad17b]/5 p-4 text-sm">
                <span>Rate-limit buckets: <strong>{observability.metrics?.rateLimit?.buckets ?? 0}</strong> · 429 responses: <strong>{observability.metrics?.rateLimited ?? 0}</strong></span>
                <button onClick={fetchObservability} className="rounded-xl bg-[#9ad17b] px-4 py-2 font-semibold text-black">Refresh telemetry</button>
              </div>
            </div>
          )}
        </AnalyticsCard>
      </div>
    );
  };

  const renderDemandForecastingContent = () => {
    return (
      <div className="space-y-6">
        <div
          className={`rounded-[28px] border p-5 shadow-lg backdrop-blur-sm ${
            isDark
              ? "border-white/10 bg-white/[0.04]"
              : "border-black/10 bg-white/80"
          }`}
        >
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p
                className={
                  isDark ? "text-sm text-white/50" : "text-sm text-[#1A2119]/50"
                }
              >
                Filter Demand Insights
              </p>
              <h3
                className={
                  isDark
                    ? "mt-2 text-xl font-semibold text-white"
                    : "mt-2 text-xl font-semibold text-[#1A2119]"
                }
              >
                Menu Item View
              </h3>
            </div>

            <div className="flex flex-wrap gap-3">
              <FilterSelect
                value={selectedForecastMenuItem}
                onChange={(e) => setSelectedForecastMenuItem(e.target.value)}
                options={forecastMenuOptions}
                isDark={isDark}
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <MetricCard
            title="Total Units Sold"
            value={totalUnitsSold}
            note="Filtered sales"
            noteClass="text-[#9ad17b]"
            isDark={isDark}
          />
          <MetricCard
            title="Revenue"
            value={formattedRevenue}
            note="Sales value"
            noteClass="text-yellow-400"
            isDark={isDark}
          />
          <MetricCard
            title="Tracked Menu Items"
            value={salesByMenuItemChartData.length}
            note="Current filter"
            noteClass="text-blue-400"
            isDark={isDark}
          />
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
          <div className="xl:col-span-7">
            <AnalyticsCard
              title="Top Selling Menu Items"
              subtitle="Units sold by menu item"
              isDark={isDark}
            >
              <div
                className={`h-[400px] px-1 py-2 ${
                  isDark
                    ? "border-white/10 bg-black/20 shadow-[0_0_30px_rgba(154,209,123,0.08)]"
                    : "border-black/10 bg-[#f6f6f2]"
                }`}
              >
                {topSellingItems.length > 0 ? (
                  <ResponsiveContainer width="100%" height={340} minWidth={0} minHeight={280}>
                    <BarChart
                      data={topSellingItems}
                      layout="vertical"
                      margin={{ top: 8, right: 22, bottom: 8, left: 12 }}
                      barCategoryGap="24%"
                    >
                      <defs>
                        <linearGradient
                          id="forecastGradient"
                          x1="0"
                          y1="0"
                          x2="1"
                          y2="0"
                        >
                          <stop offset="0%" stopColor="#d8f2c9" />
                          <stop offset="100%" stopColor="#9ad17b" />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke={isDark ? "rgba(255,255,255,0.12)" : "#d9ddd4"}
                      />
                      <XAxis
                        type="number"
                        allowDecimals={false}
                        axisLine={false}
                        tickLine={false}
                        stroke={isDark ? "#ffffff99" : "#1A211999"}
                      />
                      <YAxis
                        type="category"
                        dataKey="name"
                        width={112}
                        tick={{ fill: isDark ? "#d4d4d4" : "#3f463c", fontSize: 12 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: isDark ? "#111111" : "#ffffff",
                          border: isDark
                            ? "1px solid rgba(255,255,255,0.1)"
                            : "1px solid #e5e7eb",
                          borderRadius: "16px",
                          color: isDark ? "#fff" : "#111",
                        }}
                      />
                      <Bar
                        dataKey="units"
                        name="Units sold"
                        fill="url(#forecastGradient)"
                        radius={[0, 10, 10, 0]}
                        maxBarSize={28}
                        isAnimationActive
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyStateBlock
                    text="No valid menu-item sales found for this filter."
                    isDark={isDark}
                  />
                )}
              </div>
            </AnalyticsCard>
          </div>

          <div className="xl:col-span-5">
            <AnalyticsCard
              title="Sales Trend"
              subtitle="Daily sales movement"
              isDark={isDark}
            >
              <div
                className={`h-[400px] px-1 py-2 ${
                  isDark
                    ? "border-white/10 bg-black/20 shadow-[0_0_25px_rgba(59,130,246,0.08)]"
                    : "border-black/10 bg-[#f6f6f2]"
                }`}
              >
                {Array.isArray(dailySalesTrendChartData) &&
                dailySalesTrendChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={340} minWidth={0} minHeight={280}>
                    <LineChart
                      data={
                        selectedForecastMenuItem === "All" &&
                        backendUnitTrend.length > 0
                          ? backendUnitTrend.map((item, index, arr) => {
                              const window = arr.slice(
                                Math.max(0, index - 2),
                                index + 1,
                              );
                              const avg =
                                window.reduce(
                                  (sum, row) => sum + Number(row.units || 0),
                                  0,
                                ) / Math.max(window.length, 1);

                              return {
                                date: item.date,
                                units: item.units,
                                forecast: Math.round(avg * 1.08),
                              };
                            })
                          : projectedDemandChartData
                      }
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke={isDark ? "rgba(255,255,255,0.12)" : "#d9ddd4"}
                      />
                      <XAxis
                        dataKey="date"
                        stroke={isDark ? "#ffffff99" : "#1A211999"}
                      />
                      <YAxis stroke={isDark ? "#ffffff99" : "#1A211999"} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: isDark ? "#111111" : "#ffffff",
                          border: isDark
                            ? "1px solid rgba(255,255,255,0.1)"
                            : "1px solid #e5e7eb",
                          borderRadius: "16px",
                          color: isDark ? "#fff" : "#111",
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="units"
                        stroke="#3b82f6"
                        strokeWidth={3}
                        dot={{ fill: "#3b82f6", r: 4 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="forecast"
                        stroke="#9ad17b"
                        strokeDasharray="6 6"
                        strokeWidth={2}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyStateBlock
                    text="No sales trend data available yet."
                    isDark={isDark}
                  />
                )}
              </div>
            </AnalyticsCard>
          </div>
        </div>

        <AnalyticsCard
          title="Top Demand Table"
          subtitle="Highest selling menu items"
          isDark={isDark}
        >
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm text-left">
              <thead
                className={`border-b ${
                  isDark
                    ? "border-white/10 text-white/65"
                    : "border-black/10 text-[#1A2119]/65"
                }`}
              >
                <tr>
                  <th className="px-4 py-3 font-medium">Menu Item</th>
                  <th className="px-4 py-3 font-medium">Units Sold</th>
                </tr>
              </thead>
              <tbody>
                {topSellingItems.length > 0 ? (
                  topSellingItems.map((item) => (
                    <tr
                      key={item.name}
                      className={`border-b ${
                        isDark
                          ? "border-white/10 text-white/85"
                          : "border-black/10 text-[#1A2119]/85"
                      }`}
                    >
                      <td className="px-4 py-4 font-medium">{item.name}</td>
                      <td className="px-4 py-4">{item.units}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan="2"
                      className={`px-4 py-8 text-center ${
                        isDark ? "text-white/40" : "text-[#1A2119]/40"
                      }`}
                    >
                      No sales data found for the selected filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </AnalyticsCard>

        <AnalyticsCard
          title="Forecasted Ingredient Risk"
          subtitle="Items likely to face stock pressure in the next 7–14 days"
          isDark={isDark}
        >
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm text-left">
              <thead
                className={`border-b ${
                  isDark
                    ? "border-white/10 text-white/65"
                    : "border-black/10 text-[#1A2119]/65"
                }`}
              >
                <tr>
                  <th className="px-4 py-3 font-medium">Item</th>
                  <th className="px-4 py-3 font-medium">Current Stock</th>
                  <th className="px-4 py-3 font-medium">Forecast 7D</th>
                  <th className="px-4 py-3 font-medium">Forecast 14D</th>
                  <th className="px-4 py-3 font-medium">Projected 14D</th>
                  <th className="px-4 py-3 font-medium">Risk</th>
                </tr>
              </thead>
              <tbody>
                {topForecastRiskItems.length > 0 ? (
                  topForecastRiskItems.map((item) => (
                    <tr
                      key={item.itemId}
                      className={`border-b ${
                        isDark
                          ? "border-white/10 text-white/85"
                          : "border-black/10 text-[#1A2119]/85"
                      }`}
                    >
                      <td className="px-4 py-4 font-medium">{item.itemName}</td>
                      <td className="px-4 py-4">
                        {item.currentStock} {item.unit}
                      </td>
                      <td className="px-4 py-4">
                        {item.forecast7Days} {item.unit}
                      </td>
                      <td className="px-4 py-4">
                        {item.forecast14Days} {item.unit}
                      </td>
                      <td className="px-4 py-4">
                        {item.projectedStock14Days} {item.unit}
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            item.forecastRisk === "Critical"
                              ? "bg-red-100 text-red-700"
                              : item.forecastRisk === "High"
                                ? "bg-yellow-100 text-yellow-700"
                                : "bg-blue-100 text-blue-700"
                          }`}
                        >
                          {item.forecastRisk}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan="6"
                      className={`px-4 py-8 text-center ${
                        isDark ? "text-white/40" : "text-[#1A2119]/40"
                      }`}
                    >
                      No forecast risk data available yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </AnalyticsCard>
      </div>
    );
  };

  const renderWasteAnalyticsContent = () => {
    const topWasteItem =
      wasteByIngredientChart.length > 0 ? wasteByIngredientChart[0].name : "—";

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <MetricCard
            title="Total Waste Quantity"
            value={totalWasteQuantity}
            note="Tracked from transactions"
            noteClass="text-[#9ad17b]"
            isDark={isDark}
          />
          <MetricCard
            title="Waste Cost"
            value={`₹${Math.round(totalWasteCost)}`}
            note="Estimated cost impact"
            noteClass="text-red-400"
            isDark={isDark}
          />
          <MetricCard
            title="Most Wasted Item"
            value={topWasteItem}
            note="Highest contributor"
            noteClass="text-yellow-400"
            isDark={isDark}
          />
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
          <div className="xl:col-span-5">
            <AnalyticsCard
              title="Waste by Ingredient"
              subtitle="Top waste contributors"
              isDark={isDark}
            >
              <div
                className={`h-[360px] px-1 py-2 ${
                  isDark
                    ? "border-white/10 bg-black/20 shadow-[0_0_25px_rgba(154,209,123,0.08)]"
                    : "border-black/10 bg-[#f6f6f2]"
                }`}
              >
                {Array.isArray(wasteByIngredientChart) &&
                wasteByIngredientChart.length > 0 ? (
                  <ResponsiveContainer width="100%" height={340} minWidth={0} minHeight={280}>
                    <PieChart>
                      <Pie
                        data={
                          Array.isArray(wasteByIngredientChart)
                            ? wasteByIngredientChart
                            : []
                        }
                        dataKey="value"
                        nameKey="name"
                        innerRadius={60}
                        outerRadius={110}
                        label
                      >
                        {wasteByIngredientChart.map((_, index) => (
                          <Cell
                            key={index}
                            fill={chartColors[index % chartColors.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: isDark ? "#111111" : "#ffffff",
                          border: isDark
                            ? "1px solid rgba(255,255,255,0.1)"
                            : "1px solid #e5e7eb",
                          borderRadius: "16px",
                          color: isDark ? "#fff" : "#111",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyStateBlock
                    text="No waste data available yet."
                    isDark={isDark}
                  />
                )}
              </div>
            </AnalyticsCard>
          </div>

          <div className="xl:col-span-7">
            <AnalyticsCard
              title="Waste Trend"
              subtitle="Daily waste movement"
              isDark={isDark}
            >
              <div
                className={`h-[360px] px-1 py-2 ${
                  isDark
                    ? "border-white/10 bg-black/20 shadow-[0_0_25px_rgba(239,68,68,0.08)]"
                    : "border-black/10 bg-[#f6f6f2]"
                }`}
              >
                {Array.isArray(wasteTrendChart) &&
                wasteTrendChart.length > 0 ? (
                  <ResponsiveContainer width="100%" height={340} minWidth={0} minHeight={280}>
                    <AreaChart
                      data={
                        Array.isArray(wasteTrendChart) ? wasteTrendChart : []
                      }
                    >
                      <defs>
                        <linearGradient
                          id="wasteTrendArea"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="5%"
                            stopColor="#ef4444"
                            stopOpacity={0.8}
                          />
                          <stop
                            offset="95%"
                            stopColor="#ef4444"
                            stopOpacity={0.05}
                          />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke={isDark ? "rgba(255,255,255,0.12)" : "#d9ddd4"}
                      />
                      <XAxis
                        dataKey="date"
                        stroke={isDark ? "#ffffff99" : "#1A211999"}
                      />
                      <YAxis stroke={isDark ? "#ffffff99" : "#1A211999"} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: isDark ? "#111111" : "#ffffff",
                          border: isDark
                            ? "1px solid rgba(255,255,255,0.1)"
                            : "1px solid #e5e7eb",
                          borderRadius: "16px",
                          color: isDark ? "#fff" : "#111",
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="waste"
                        stroke="#ef4444"
                        fillOpacity={1}
                        fill="url(#wasteTrendArea)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyStateBlock
                    text="No waste trend data available yet."
                    isDark={isDark}
                  />
                )}
              </div>
            </AnalyticsCard>
          </div>
        </div>

        <AnalyticsCard
          title="Waste by Category"
          subtitle="Category-level waste distribution"
          isDark={isDark}
        >
          <div
            className={`h-[360px] px-1 py-2 ${
              isDark
                ? "border-white/10 bg-black/20 shadow-[0_0_25px_rgba(245,158,11,0.08)]"
                : "border-black/10 bg-[#f6f6f2]"
            }`}
          >
            {Array.isArray(wasteByCategoryChart) &&
            wasteByCategoryChart.length > 0 ? (
              <ResponsiveContainer width="100%" height={340} minWidth={0} minHeight={280}>
                <PieChart>
                  <Pie
                    data={
                      Array.isArray(wasteByCategoryChart)
                        ? wasteByCategoryChart
                        : []
                    }
                    dataKey="value"
                    nameKey="name"
                    outerRadius={110}
                    label
                  >
                    {wasteByCategoryChart.map((_, index) => (
                      <Cell
                        key={index}
                        fill={chartColors[index % chartColors.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: isDark ? "#111111" : "#ffffff",
                      border: isDark
                        ? "1px solid rgba(255,255,255,0.1)"
                        : "1px solid #e5e7eb",
                      borderRadius: "16px",
                      color: isDark ? "#fff" : "#111",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <EmptyStateBlock
                text="No waste category data available yet."
                isDark={isDark}
              />
            )}
          </div>
        </AnalyticsCard>
      </div>
    );
  };

  const renderActionCenterContent = () => {
    const activeCount = allActionItems.filter(
      (item) =>
        (item.state || "active") === "active" && item.state !== "dismissed",
    ).length;

    const reviewedCount = allActionItems.filter(
      (item) => item.state === "reviewed",
    ).length;

    const snoozedCount = allActionItems.filter(
      (item) => item.state === "snoozed",
    ).length;

    const criticalCount = allActionItems.filter(
      (item) => item.priority === "Critical" && item.state !== "dismissed",
    ).length;

    return (
      <div className="space-y-6">
        <div
          className={`rounded-[28px] border p-5 shadow-lg backdrop-blur-sm ${
            isDark
              ? "border-white/10 bg-white/[0.04]"
              : "border-black/10 bg-white/80"
          }`}
        >
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <p
                className={
                  isDark ? "text-sm text-white/50" : "text-sm text-[#1A2119]/50"
                }
              >
                Action Queue Controls
              </p>
              <h3
                className={
                  isDark
                    ? "mt-2 text-xl font-semibold text-white"
                    : "mt-2 text-xl font-semibold text-[#1A2119]"
                }
              >
                Search, priority and lifecycle filters
              </h3>
            </div>

            <div className="flex flex-col gap-3 md:flex-row md:flex-wrap">
              <input
                type="text"
                value={actionSearchTerm}
                onChange={(e) => setActionSearchTerm(e.target.value)}
                placeholder="Search actions, suppliers, impact..."
                className={`rounded-[16px] px-4 py-3 text-sm outline-none border min-w-[240px] ${
                  isDark
                    ? "border-white/10 bg-black/20 text-white"
                    : "border-black/10 bg-[#f6f6f2] text-[#1A2119]"
                }`}
              />

              <FilterSelect
                value={selectedActionPriority}
                onChange={(e) => setSelectedActionPriority(e.target.value)}
                options={actionPriorityOptions}
                isDark={isDark}
              />

              <FilterSelect
                value={selectedActionState}
                onChange={(e) => setSelectedActionState(e.target.value)}
                options={actionStateOptions}
                isDark={isDark}
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
          <MetricCard
            title="Active Actions"
            value={activeCount}
            note="Operational queue"
            noteClass="text-[#9ad17b]"
            isDark={isDark}
          />
          <MetricCard
            title="Critical Actions"
            value={criticalCount}
            note="Immediate attention"
            noteClass="text-red-400"
            isDark={isDark}
          />
          <MetricCard
            title="Reviewed"
            value={reviewedCount}
            note="Already acknowledged"
            noteClass="text-blue-400"
            isDark={isDark}
          />
          <MetricCard
            title="Snoozed"
            value={snoozedCount}
            note="Deferred actions"
            noteClass="text-yellow-400"
            isDark={isDark}
          />
        </div>

        <AnalyticsCard
          title="Full Action Queue"
          subtitle="All generated operational decisions"
          isDark={isDark}
        >
          <div className="space-y-4">
            {filteredActionItems.length > 0 ? (
              filteredActionItems.map((action) => {
                const cardTone =
                  action.priority === "Critical"
                    ? "red"
                    : action.priority === "High"
                      ? "amber"
                      : action.type === "supplier"
                        ? "blue"
                        : "green";

                return (
                  <div
                    key={action.actionKey}
                    className={`relative rounded-[20px] border p-5 ${getActionToneClasses(
                      cardTone,
                      isDark,
                    )}`}
                  >
                    {action.actionKey ? (
                      <button
                        onClick={() =>
                          updateActionState(
                            DASHBOARD_ENDPOINTS.dismissAction,
                            action.actionKey,
                          )
                        }
                        disabled={actionUpdatingKey === action.actionKey}
                        className={`absolute top-3 right-3 text-sm rounded-full w-7 h-7 flex items-center justify-center transition ${
                          isDark
                            ? "bg-white/10 text-white hover:bg-white/20"
                            : "bg-black/10 text-black hover:bg-black/20"
                        }`}
                        title="Dismiss notification"
                      >
                        ×
                      </button>
                    ) : null}

                    <div className="flex items-start justify-between gap-4 pr-10">
                      <div className="flex items-center gap-3">
                        <span
                          className={`inline-block w-2.5 h-2.5 rounded-full ${
                            action.priority === "Critical"
                              ? "bg-red-500"
                              : action.priority === "High"
                                ? "bg-yellow-400"
                                : action.type === "supplier"
                                  ? "bg-blue-400"
                                  : "bg-green-400"
                          }`}
                        />
                        <div className="text-lg font-semibold">
                          {action.title}
                        </div>
                      </div>

                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          action.priority === "Critical"
                            ? "bg-red-100 text-red-700"
                            : action.priority === "High"
                              ? "bg-yellow-100 text-yellow-700"
                              : action.priority === "Medium"
                                ? "bg-blue-100 text-blue-700"
                                : "bg-green-100 text-green-700"
                        }`}
                      >
                        {action.priority}
                      </span>
                    </div>

                    <div
                      className={
                        isDark
                          ? "mt-3 text-sm text-white/70"
                          : "mt-3 text-sm text-[#1A2119]/70"
                      }
                    >
                      {action.detail}
                      {action.impact ? ` • ${action.impact}` : ""}
                    </div>

                    {action.state ? (
                      <div className="mt-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            action.state === "reviewed"
                              ? "bg-green-100 text-green-700"
                              : action.state === "snoozed"
                                ? "bg-yellow-100 text-yellow-700"
                                : "bg-blue-100 text-blue-700"
                          }`}
                        >
                          {action.state}
                        </span>
                      </div>
                    ) : null}

                    {action.actionKey ? (
                      <div className="mt-4 flex flex-wrap gap-2">
                        <button
                          onClick={() =>
                            updateActionState(
                              DASHBOARD_ENDPOINTS.reviewAction,
                              action.actionKey,
                            )
                          }
                          disabled={actionUpdatingKey === action.actionKey}
                          className="rounded-[12px] px-3 py-2 text-xs font-semibold bg-green-100 text-green-700 hover:opacity-90 disabled:opacity-50"
                        >
                          Review
                        </button>

                        <button
                          onClick={() =>
                            updateActionState(
                              DASHBOARD_ENDPOINTS.snoozeAction,
                              action.actionKey,
                            )
                          }
                          disabled={actionUpdatingKey === action.actionKey}
                          className="rounded-[12px] px-3 py-2 text-xs font-semibold bg-yellow-100 text-yellow-700 hover:opacity-90 disabled:opacity-50"
                        >
                          Snooze
                        </button>
                      </div>
                    ) : null}
                  </div>
                );
              })
            ) : (
              <EmptyStateBlock
                text="No actions match the current filters."
                isDark={isDark}
              />
            )}
          </div>
        </AnalyticsCard>
      </div>
    );
  };
  const renderReorderSuggestionsContent = () => {
    const criticalCount =
      dashboardAI.procurement?.summary?.criticalItems ??
      reorderItems.filter((item) => item.urgency === "Critical").length;

    const highCount =
      dashboardAI.procurement?.summary?.highPriorityItems ??
      reorderItems.filter((item) => item.urgency === "High").length;

    const totalReorderCost =
      dashboardAI.procurement?.summary?.totalEstimatedSpend ??
      reorderItems.reduce(
        (sum, item) => sum + Number(item.estimatedCost || 0),
        0,
      );

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <MetricCard
            title="Critical Reorders"
            value={criticalCount}
            note="Immediate purchase needed"
            noteClass="text-red-400"
            isDark={isDark}
          />
          <MetricCard
            title="High Priority"
            value={highCount}
            note="Should reorder soon"
            noteClass="text-yellow-400"
            isDark={isDark}
          />
          <MetricCard
            title="Estimated Reorder Cost"
            value={`₹${Math.round(totalReorderCost)}`}
            note="Suggested current cycle"
            noteClass="text-[#9ad17b]"
            isDark={isDark}
          />
        </div>

        <AnalyticsCard title="Smart Procurement" subtitle="Supplier-aware recommendations: what to buy, from whom, and why" isDark={isDark}>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="text-sm opacity-65">Prioritizes stockout exposure, supplier reliability, lead time and estimated spend.</div>
            <button onClick={() => createSmartPurchaseOrders()} disabled={procurementLoading} className="rounded-xl bg-[#9ad17b] px-4 py-2 text-sm font-semibold text-black disabled:opacity-50">
              {procurementLoading ? "Creating…" : "Create smart POs"}
            </button>
          </div>
          {procurementMessage && <div className="mb-4 rounded-xl border border-[#9ad17b]/30 bg-[#9ad17b]/10 px-4 py-3 text-sm">{procurementMessage}</div>}
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm text-left"><thead className={`border-b ${isDark ? "border-white/10 text-white/65" : "border-black/10 text-[#1A2119]/65"}`}><tr>
              <th className="px-4 py-3 font-medium">Item</th><th className="px-4 py-3 font-medium">Supplier</th><th className="px-4 py-3 font-medium">Qty</th><th className="px-4 py-3 font-medium">Reliability</th><th className="px-4 py-3 font-medium">Lead</th><th className="px-4 py-3 font-medium">Cost</th><th className="px-4 py-3 font-medium">Decision</th><th className="px-4 py-3 font-medium">Action</th>
            </tr></thead><tbody>
              {(dashboardAI.procurementIntelligence?.data?.recommendations || []).slice(0,8).map(row => <tr key={row.itemId} className={`border-b ${isDark ? "border-white/10 text-white/85" : "border-black/10 text-[#1A2119]/85"}`}>
                <td className="px-4 py-3 font-medium">{row.itemName}</td><td className="px-4 py-3">{row.recommendedSupplier}</td><td className="px-4 py-3">{row.recommendedOrderQty} {row.unit}</td><td className="px-4 py-3">{row.supplierReliability == null ? "—" : `${Math.round(row.supplierReliability)}%`}</td><td className="px-4 py-3">{row.leadTimeDays}d</td><td className="px-4 py-3">₹{Math.round((row.recommendedOrderQty || 0)*(row.costPrice || 0))}</td><td className="px-4 py-3">{row.purchaseDecision}</td><td className="px-4 py-3"><button onClick={() => createSmartPurchaseOrders([row])} className="rounded-lg border border-white/10 px-3 py-1.5 text-xs">Create PO</button></td>
              </tr>)}
            </tbody></table>
          </div>
        </AnalyticsCard>

        <AnalyticsCard title="Purchase Order Queue" subtitle="Track ordered stock and receive it back into the inventory ledger" isDark={isDark}>
          <div className="space-y-2">
            {(dashboardAI.procurementIntelligence?.data?.purchaseOrders || []).filter(po => String(po.status).toLowerCase() !== "received").slice(0,6).map(po => (
              <div key={po.id} className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3 ${isDark ? "border-white/10 bg-black/20" : "border-black/10 bg-[#f6f6f2]"}`}>
                <div><div className="font-medium">{po.itemName} · {po.quantityOrdered} {po.unit}</div><div className="text-xs opacity-55">{po.supplier} · PO {po.orderId}</div></div>
                <button onClick={() => receiveSmartPurchaseOrder(po)} disabled={procurementLoading} className="rounded-lg border border-white/10 px-3 py-2 text-xs disabled:opacity-50">Receive stock</button>
              </div>
            ))}
            {!(dashboardAI.procurementIntelligence?.data?.purchaseOrders || []).filter(po => String(po.status).toLowerCase() !== "received").length && <div className="text-sm opacity-50">No open purchase orders.</div>}
          </div>
        </AnalyticsCard>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
          <div className="xl:col-span-7">
            <AnalyticsCard
              title="Suggested Reorder Quantities"
              subtitle="Top items to replenish"
              isDark={isDark}
            >
              <div
                className={`h-[400px] px-1 py-2 ${
                  isDark
                    ? "border-white/10 bg-black/20 shadow-[0_0_30px_rgba(154,209,123,0.08)]"
                    : "border-black/10 bg-[#f6f6f2]"
                }`}
              >
                {Array.isArray(dashboardAI.reorder?.quantityChart) &&
                dashboardAI.reorder.quantityChart.length > 0 ? (
                  <ResponsiveContainer width="100%" height={340} minWidth={0} minHeight={280}>
                    <BarChart
                      data={
                        Array.isArray(dashboardAI.reorder?.quantityChart)
                          ? dashboardAI.reorder.quantityChart
                          : reorderQtyChartData || []
                      }
                      layout="vertical"
                      margin={{ left: 20 }}
                    >
                      <defs>
                        <linearGradient
                          id="reorderQtyGradient"
                          x1="0"
                          y1="0"
                          x2="1"
                          y2="0"
                        >
                          <stop offset="0%" stopColor="#d8f2c9" />
                          <stop offset="100%" stopColor="#9ad17b" />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke={isDark ? "rgba(255,255,255,0.12)" : "#d9ddd4"}
                      />
                      <XAxis
                        type="number"
                        stroke={isDark ? "#ffffff99" : "#1A211999"}
                      />
                      <YAxis
                        type="category"
                        dataKey="name"
                        width={120}
                        stroke={isDark ? "#ffffff99" : "#1A211999"}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: isDark ? "#111111" : "#ffffff",
                          border: isDark
                            ? "1px solid rgba(255,255,255,0.1)"
                            : "1px solid #e5e7eb",
                          borderRadius: "16px",
                          color: isDark ? "#fff" : "#111",
                        }}
                      />
                      <Bar
                        dataKey="qty"
                        fill="url(#reorderQtyGradient)"
                        radius={[0, 10, 10, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyStateBlock
                    text="No reorder data available yet."
                    isDark={isDark}
                  />
                )}
              </div>
            </AnalyticsCard>
          </div>

          <div className="xl:col-span-5">
            <AnalyticsCard
              title="Reorder Cost Projection"
              subtitle="Estimated spend by item"
              isDark={isDark}
            >
              <div
                className={`h-[400px] px-1 py-2 ${
                  isDark
                    ? "border-white/10 bg-black/20 shadow-[0_0_25px_rgba(59,130,246,0.08)]"
                    : "border-black/10 bg-[#f6f6f2]"
                }`}
              >
                {Array.isArray(dashboardAI.reorder?.costChart) &&
                dashboardAI.reorder.costChart.length > 0 ? (
                  <ResponsiveContainer width="100%" height={340} minWidth={0} minHeight={280}>
                    <AreaChart
                      data={
                        Array.isArray(dashboardAI.reorder?.costChart)
                          ? dashboardAI.reorder.costChart
                          : reorderCostChartData || []
                      }
                    >
                      <defs>
                        <linearGradient
                          id="reorderCostArea"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="5%"
                            stopColor="#3b82f6"
                            stopOpacity={0.8}
                          />
                          <stop
                            offset="95%"
                            stopColor="#3b82f6"
                            stopOpacity={0.05}
                          />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke={isDark ? "rgba(255,255,255,0.12)" : "#d9ddd4"}
                      />
                      <XAxis
                        dataKey="name"
                        stroke={isDark ? "#ffffff99" : "#1A211999"}
                      />
                      <YAxis stroke={isDark ? "#ffffff99" : "#1A211999"} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: isDark ? "#111111" : "#ffffff",
                          border: isDark
                            ? "1px solid rgba(255,255,255,0.1)"
                            : "1px solid #e5e7eb",
                          borderRadius: "16px",
                          color: isDark ? "#fff" : "#111",
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="cost"
                        stroke="#3b82f6"
                        fillOpacity={1}
                        fill="url(#reorderCostArea)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyStateBlock
                    text="No reorder cost data available yet."
                    isDark={isDark}
                  />
                )}
              </div>
            </AnalyticsCard>
          </div>
        </div>

        <AnalyticsCard
          title="Supplier Reorder Load"
          subtitle="How many reorder items each supplier has"
          isDark={isDark}
        >
          <div
            className={`h-[360px] px-1 py-2 ${
              isDark
                ? "border-white/10 bg-black/20 shadow-[0_0_25px_rgba(245,158,11,0.08)]"
                : "border-black/10 bg-[#f6f6f2]"
            }`}
          >
            {Array.isArray(dashboardAI.reorder?.supplierDistribution) &&
            dashboardAI.reorder.supplierDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height={340} minWidth={0} minHeight={280}>
                <PieChart>
                  <Pie
                    data={
                      Array.isArray(dashboardAI.reorder?.supplierDistribution)
                        ? dashboardAI.reorder.supplierDistribution
                        : reorderSupplierChartData || []
                    }
                    dataKey="count"
                    nameKey="name"
                    outerRadius={110}
                    innerRadius={55}
                    label
                  >
                    {reorderSupplierChartData.map((_, index) => (
                      <Cell
                        key={index}
                        fill={chartColors[index % chartColors.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: isDark ? "#111111" : "#ffffff",
                      border: isDark
                        ? "1px solid rgba(255,255,255,0.1)"
                        : "1px solid #e5e7eb",
                      borderRadius: "16px",
                      color: isDark ? "#fff" : "#111",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <EmptyStateBlock
                text="No supplier reorder data available yet."
                isDark={isDark}
              />
            )}
          </div>
        </AnalyticsCard>

        <AnalyticsCard
          title="Suggested Reorder Table"
          subtitle="Operational recommendation list"
          isDark={isDark}
        >
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm text-left">
              <thead
                className={`border-b ${
                  isDark
                    ? "border-white/10 text-white/65"
                    : "border-black/10 text-[#1A2119]/65"
                }`}
              >
                <tr>
                  <th className="px-4 py-3 font-medium">Item</th>
                  <th className="px-4 py-3 font-medium">Supplier</th>
                  <th className="px-4 py-3 font-medium">Current Stock</th>
                  <th className="px-4 py-3 font-medium">Forecast 14D</th>
                  <th className="px-4 py-3 font-medium">Daily Usage</th>
                  <th className="px-4 py-3 font-medium">Stockout In</th>
                  <th className="px-4 py-3 font-medium">Recommended Qty</th>
                  <th className="px-4 py-3 font-medium">Velocity</th>
                  <th className="px-4 py-3 font-medium">Est. Cost</th>
                  <th className="px-4 py-3 font-medium">Urgency</th>
                </tr>
              </thead>
              <tbody>
                {reorderItems.length > 0 ? (
                  reorderItems.map((item) => (
                    <tr
                      key={item.itemId || item.id}
                      className={`border-b ${
                        isDark
                          ? "border-white/10 text-white/85"
                          : "border-black/10 text-[#1A2119]/85"
                      }`}
                    >
                      <td className="px-4 py-4">
                        <div className="font-medium text-white">
                          {item.itemName}
                        </div>
                        {item.reason && (
                          <div className="text-[10px] text-white/40 leading-tight mt-0.5 max-w-[180px]">
                            {item.reason}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-4">{item.supplier}</td>
                      <td className="px-4 py-4">
                        {item.currentStock} {item.unit}
                      </td>
                      <td className="px-4 py-4">
                        {item.avgDailyUsage30d
                          ? `${item.avgDailyUsage30d} /day`
                          : "—"}
                      </td>
                      <td className="px-4 py-4">
                        {item.daysRemaining !== null
                          ? `${item.daysRemaining} days`
                          : "—"}
                      </td>
                      <td className="px-4 py-4">
                        {item.suggestedReorderQty || 0} {item.unit}
                      </td>
                      <td className="px-4 py-4">{item.velocity || "—"}</td>
                      <td className="px-4 py-4">
                        ₹{Math.round(item.estimatedCost || 0)}
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${
                            String(item.urgency).toLowerCase() === "critical"
                              ? "bg-red-500/20 text-red-400"
                              : String(item.urgency).toLowerCase() === "high"
                                ? "bg-yellow-500/20 text-yellow-400"
                                : "bg-blue-500/20 text-blue-400"
                          }`}
                        >
                          {item.urgency}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan="9"
                      className={`px-4 py-8 text-center ${
                        isDark ? "text-white/40" : "text-[#1A2119]/40"
                      }`}
                    >
                      No reorder suggestions right now.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </AnalyticsCard>
      </div>
    );
  };
  const renderEOQCalculatorContent = () => {
    const topEOQItems =
      dashboardAI.eoq?.data?.filter((item) => item.eoq > 0).slice(0, 5) || [];

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <div
            className={`rounded-[24px] border p-5 ${
              isDark
                ? "border-white/10 bg-white/[0.04]"
                : "border-black/10 bg-white/80"
            }`}
          >
            <p
              className={
                isDark
                  ? "text-sm text-white/50 mb-2"
                  : "text-sm text-[#1A2119]/50 mb-2"
              }
            >
              Annual Demand
            </p>
            <input
              type="number"
              value={demand}
              onChange={(e) => setDemand(Number(e.target.value))}
              className={`w-full rounded-[14px] border px-4 py-3 outline-none ${
                isDark
                  ? "border-white/10 bg-black/20 text-white"
                  : "border-black/10 bg-[#f6f6f2] text-[#1A2119]"
              }`}
            />
          </div>

          <div
            className={`rounded-[24px] border p-5 ${
              isDark
                ? "border-white/10 bg-white/[0.04]"
                : "border-black/10 bg-white/80"
            }`}
          >
            <p
              className={
                isDark
                  ? "text-sm text-white/50 mb-2"
                  : "text-sm text-[#1A2119]/50 mb-2"
              }
            >
              Ordering Cost
            </p>
            <input
              type="number"
              value={orderingCost}
              onChange={(e) => setOrderingCost(Number(e.target.value))}
              className={`w-full rounded-[14px] border px-4 py-3 outline-none ${
                isDark
                  ? "border-white/10 bg-black/20 text-white"
                  : "border-black/10 bg-[#f6f6f2] text-[#1A2119]"
              }`}
            />
          </div>

          <div
            className={`rounded-[24px] border p-5 ${
              isDark
                ? "border-white/10 bg-white/[0.04]"
                : "border-black/10 bg-white/80"
            }`}
          >
            <p
              className={
                isDark
                  ? "text-sm text-white/50 mb-2"
                  : "text-sm text-[#1A2119]/50 mb-2"
              }
            >
              Holding Cost
            </p>
            <input
              type="number"
              value={holdingCost}
              onChange={(e) => setHoldingCost(Number(e.target.value))}
              className={`w-full rounded-[14px] border px-4 py-3 outline-none ${
                isDark
                  ? "border-white/10 bg-black/20 text-white"
                  : "border-black/10 bg-[#f6f6f2] text-[#1A2119]"
              }`}
            />
          </div>
        </div>

        <AnalyticsCard
          title="Economic Order Quantity"
          subtitle="Optimal reorder quantity based on EOQ formula"
          isDark={isDark}
        >
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div
              className={`rounded-[22px] border p-6 ${
                isDark
                  ? "border-white/10 bg-black/20"
                  : "border-black/10 bg-[#f6f6f2]"
              }`}
            >
              <p
                className={
                  isDark ? "text-sm text-white/50" : "text-sm text-[#1A2119]/50"
                }
              >
                Formula
              </p>
              <p className="mt-4 text-lg font-semibold">
                EOQ = √((2 × Demand × Ordering Cost) / Holding Cost)
              </p>
            </div>

            <div
              className={`rounded-[22px] border p-6 text-center ${
                isDark
                  ? "border-white/10 bg-black/20"
                  : "border-black/10 bg-[#f6f6f2]"
              }`}
            >
              <p
                className={
                  isDark ? "text-sm text-white/50" : "text-sm text-[#1A2119]/50"
                }
              >
                Optimal EOQ
              </p>
              <p className="mt-4 text-5xl font-bold text-[#9ad17b]">
                {Math.round(eoqValue)}
              </p>
            </div>
          </div>
        </AnalyticsCard>

        <AnalyticsCard
          title="EOQ Recommendations"
          subtitle="Backend-driven procurement optimization"
          isDark={isDark}
        >
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm text-left">
              <thead
                className={`border-b ${
                  isDark
                    ? "border-white/10 text-white/65"
                    : "border-black/10 text-[#1A2119]/65"
                }`}
              >
                <tr>
                  <th className="px-4 py-3 font-medium">Item</th>
                  <th className="px-4 py-3 font-medium">Avg Daily Usage</th>
                  <th className="px-4 py-3 font-medium">Annual Demand</th>
                  <th className="px-4 py-3 font-medium">EOQ</th>
                  <th className="px-4 py-3 font-medium">Frequency</th>
                </tr>
              </thead>
              <tbody>
                {topEOQItems.length > 0 ? (
                  topEOQItems.map((item) => (
                    <tr
                      key={item.itemId}
                      className={`border-b ${
                        isDark
                          ? "border-white/10 text-white/85"
                          : "border-black/10 text-[#1A2119]/85"
                      }`}
                    >
                      <td className="px-4 py-4 font-medium">{item.itemName}</td>
                      <td className="px-4 py-4">
                        {item.avgDailyUsage} {item.unit}
                      </td>
                      <td className="px-4 py-4">{item.annualDemand}</td>
                      <td className="px-4 py-4">
                        {item.eoq} {item.unit}
                      </td>
                      <td className="px-4 py-4">
                        {item.reorderFrequencyDays
                          ? `${item.reorderFrequencyDays} days`
                          : "—"}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan="5"
                      className={`px-4 py-8 text-center ${
                        isDark ? "text-white/40" : "text-[#1A2119]/40"
                      }`}
                    >
                      No EOQ analytics available yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </AnalyticsCard>
      </div>
    );
  };

  const supplierAnalyticsRows = useMemo(() => {
    return dashboardAI.suppliers?.data || [];
  }, [dashboardAI.suppliers]);

  const supplierRiskDistribution = useMemo(() => {
    const counts = {
      High: 0,
      Medium: 0,
      Low: 0,
    };

    supplierAnalyticsRows.forEach((supplier) => {
      const risk = supplier.riskLevel || "Low";
      counts[risk] = (counts[risk] || 0) + 1;
    });

    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .filter((item) => item.value > 0);
  }, [supplierAnalyticsRows]);

  const supplierProcurementLoad = useMemo(() => {
    const map = {};

    reorderItems.forEach((item) => {
      const supplier = item.supplier || "Unknown Supplier";

      if (!map[supplier]) {
        map[supplier] = {
          supplier,
          estimatedCost: 0,
          items: 0,
        };
      }

      map[supplier].estimatedCost += Number(item.estimatedCost || 0);
      map[supplier].items += 1;
    });

    return Object.values(map)
      .map((item) => ({
        name: item.supplier,
        estimatedCost: Number(item.estimatedCost.toFixed(2)),
        items: item.items,
      }))
      .sort((a, b) => b.estimatedCost - a.estimatedCost)
      .slice(0, 8);
  }, [reorderItems]);

  const supplierConcentrationData = useMemo(() => {
    const totalItems = supplierAnalyticsRows.reduce(
      (sum, supplier) => sum + Number(supplier.totalItems || 0),
      0,
    );

    return supplierAnalyticsRows.map((supplier) => ({
      name: supplier.supplier,
      share:
        totalItems > 0
          ? Number(
              ((Number(supplier.totalItems || 0) / totalItems) * 100).toFixed(
                1,
              ),
            )
          : 0,
    }));
  }, [supplierAnalyticsRows]);

  const topRiskSuppliers = useMemo(() => {
    return [...supplierAnalyticsRows]
      .sort((a, b) => {
        const riskOrder = { High: 3, Medium: 2, Low: 1 };
        if ((riskOrder[b.riskLevel] || 0) !== (riskOrder[a.riskLevel] || 0)) {
          return (riskOrder[b.riskLevel] || 0) - (riskOrder[a.riskLevel] || 0);
        }

        return Number(b.totalStockValue || 0) - Number(a.totalStockValue || 0);
      })
      .slice(0, 8);
  }, [supplierAnalyticsRows]);

  const inventoryValue = useMemo(() => {
    return inventoryItems.reduce((sum, item) => {
      return sum + Number(item.currentStock || 0) * Number(item.costPrice || 0);
    }, 0);
  }, [inventoryItems]);

  const overviewMetrics = useMemo(() => {
    const healthMetrics = dashboardAI.healthScore?.data?.metrics || {};
    const intel = dashboardAI.intelligenceSummary?.data || {};

    return {
      inventoryValue,
      lowStockAlerts: intel.stockoutRiskItems ?? alertItems.length,
      fastMovingItems: intel.fastMovingItems ?? 0,
      expiryRiskItems: healthMetrics.expiringSoonCount ?? expiryItems.length,
      criticalDecisions: allActionItems.filter(
        (item) => item.priority === "Critical" && item.state !== "dismissed",
      ).length,
      highRiskSuppliers:
        healthMetrics.highRiskSuppliers ??
        supplierAnalyticsRows.filter(
          (supplier) => supplier.riskLevel === "High",
        ).length,
    };
  }, [
    inventoryValue,
    dashboardAI,
    alertItems,
    expiryItems,
    allActionItems,
    supplierAnalyticsRows,
  ]);

  const renderSuppliersContent = () => {
    const totalSuppliers = supplierAnalyticsRows.length;
    const highRiskSuppliers = supplierAnalyticsRows.filter(
      (supplier) => supplier.riskLevel === "High",
    ).length;
    const totalSupplierExposure = supplierAnalyticsRows.reduce(
      (sum, supplier) => sum + Number(supplier.totalStockValue || 0),
      0,
    );
    const procurementSuppliers = supplierProcurementLoad.length;
    const smartSuppliers = dashboardAI.procurementIntelligence?.data?.supplierPerformance || [];

    return (
      <div className="space-y-6">
        <AnalyticsCard title="Supplier Reliability" subtitle="Procurement-aware score from delivery history, lead time, and inventory pressure" isDark={isDark}>
          <div className="overflow-x-auto"><table className="min-w-full text-sm text-left"><thead><tr className="border-b border-white/10"><th className="px-3 py-3">Supplier</th><th className="px-3 py-3">Reliability</th><th className="px-3 py-3">Lead</th><th className="px-3 py-3">At Risk</th><th className="px-3 py-3">Spend</th><th className="px-3 py-3">Risk</th></tr></thead><tbody>
            {smartSuppliers.slice(0,8).map(x=><tr key={x.supplier} className="border-b border-white/10"><td className="px-3 py-3 font-medium">{x.supplier}</td><td className="px-3 py-3">{Math.round(x.reliabilityScore)}%</td><td className="px-3 py-3">{x.avgLeadTimeDays}d</td><td className="px-3 py-3">{x.criticalItems + x.highPriorityItems}</td><td className="px-3 py-3">₹{Math.round(x.estimatedSpend)}</td><td className="px-3 py-3 capitalize">{x.risk}</td></tr>)}
            {!smartSuppliers.length&&<tr><td colSpan="7" className="px-3 py-6 text-center opacity-50">No supplier procurement intelligence available.</td></tr>}
          </tbody></table></div>
        </AnalyticsCard>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
          <MetricCard
            title="Total Suppliers"
            value={totalSuppliers}
            note="Active supplier base"
            noteClass="text-[#9ad17b]"
            isDark={isDark}
          />
          <MetricCard
            title="High Risk Suppliers"
            value={highRiskSuppliers}
            note="Need procurement attention"
            noteClass="text-red-400"
            isDark={isDark}
          />
          <MetricCard
            title="Supplier Exposure"
            value={`₹${Math.round(totalSupplierExposure)}`}
            note="Inventory value under supplier control"
            noteClass="text-blue-400"
            isDark={isDark}
          />
          <MetricCard
            title="Procurement Loads"
            value={procurementSuppliers}
            note="Suppliers currently in reorder cycle"
            noteClass="text-yellow-400"
            isDark={isDark}
          />
        </div>

        <div className="grid grid-cols-1 gap-6 2xl:grid-cols-12">
          <div className="2xl:col-span-7 min-w-0">
            <AnalyticsCard
              title="Supplier Risk Profile"
              subtitle="Risk level across the supplier network"
              isDark={isDark}
            >
              <div
                className={`h-[340px] rounded-[22px] border p-4 ${
                  isDark
                    ? "border-white/10 bg-black/20"
                    : "border-black/10 bg-[#f6f6f2]"
                }`}
              >
                {supplierRiskDistribution.length > 0 ? (
                  <ResponsiveContainer width="100%" height={340} minWidth={0} minHeight={280}>
                    <PieChart>
                      <Pie
                        data={supplierRiskDistribution}
                        dataKey="value"
                        nameKey="name"
                        outerRadius={110}
                        innerRadius={55}
                        label
                      >
                        {supplierRiskDistribution.map((entry, index) => {
                          const colorMap = {
                            High: "#ef4444",
                            Medium: "#f59e0b",
                            Low: "#22c55e",
                          };

                          return (
                            <Cell
                              key={index}
                              fill={
                                colorMap[entry.name] ||
                                chartColors[index % chartColors.length]
                              }
                            />
                          );
                        })}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: isDark ? "#111111" : "#ffffff",
                          border: isDark
                            ? "1px solid rgba(255,255,255,0.1)"
                            : "1px solid #e5e7eb",
                          borderRadius: "16px",
                          color: isDark ? "#fff" : "#111",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyStateBlock
                    text="No supplier risk data available yet."
                    isDark={isDark}
                  />
                )}
              </div>
            </AnalyticsCard>
          </div>

          <div className="2xl:col-span-5 min-w-0">
            <AnalyticsCard
              title="Supplier Concentration"
              subtitle="Dependency share by supplier"
              isDark={isDark}
            >
              <div
                className={`h-[340px] rounded-[22px] border p-4 ${
                  isDark
                    ? "border-white/10 bg-black/20"
                    : "border-black/10 bg-[#f6f6f2]"
                }`}
              >
                {supplierConcentrationData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={340} minWidth={0} minHeight={280}>
                    <BarChart data={supplierConcentrationData}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke={isDark ? "rgba(255,255,255,0.12)" : "#d9ddd4"}
                      />
                      <XAxis
                        dataKey="name"
                        stroke={isDark ? "#ffffff99" : "#1A211999"}
                      />
                      <YAxis stroke={isDark ? "#ffffff99" : "#1A211999"} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: isDark ? "#111111" : "#ffffff",
                          border: isDark
                            ? "1px solid rgba(255,255,255,0.1)"
                            : "1px solid #e5e7eb",
                          borderRadius: "16px",
                          color: isDark ? "#fff" : "#111",
                        }}
                      />
                      <Bar
                        dataKey="share"
                        fill="#3b82f6"
                        radius={[10, 10, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyStateBlock
                    text="No supplier concentration data available yet."
                    isDark={isDark}
                  />
                )}
              </div>
            </AnalyticsCard>
          </div>
        </div>

        <AnalyticsCard
          title="Procurement Spend by Supplier"
          subtitle="Estimated reorder spend currently assigned to each supplier"
          isDark={isDark}
        >
          <div
            className={`h-[360px] px-1 py-2 ${
              isDark
                ? "border-white/10 bg-black/20"
                : "border-black/10 bg-[#f6f6f2]"
            }`}
          >
            {supplierProcurementLoad.length > 0 ? (
              <ResponsiveContainer width="100%" height={340} minWidth={0} minHeight={280}>
                <AreaChart data={supplierProcurementLoad}>
                  <defs>
                    <linearGradient
                      id="supplierSpendArea"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="5%" stopColor="#9ad17b" stopOpacity={0.8} />
                      <stop
                        offset="95%"
                        stopColor="#9ad17b"
                        stopOpacity={0.05}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke={isDark ? "rgba(255,255,255,0.12)" : "#d9ddd4"}
                  />
                  <XAxis
                    dataKey="name"
                    stroke={isDark ? "#ffffff99" : "#1A211999"}
                  />
                  <YAxis stroke={isDark ? "#ffffff99" : "#1A211999"} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: isDark ? "#111111" : "#ffffff",
                      border: isDark
                        ? "1px solid rgba(255,255,255,0.1)"
                        : "1px solid #e5e7eb",
                      borderRadius: "16px",
                      color: isDark ? "#fff" : "#111",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="estimatedCost"
                    stroke="#9ad17b"
                    fillOpacity={1}
                    fill="url(#supplierSpendArea)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <EmptyStateBlock
                text="No procurement load data available yet."
                isDark={isDark}
              />
            )}
          </div>
        </AnalyticsCard>

        <AnalyticsCard
          title="Supplier Command Table"
          subtitle="Risk, exposure, and operational pressure by supplier"
          isDark={isDark}
        >
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm text-left">
              <thead
                className={`border-b ${
                  isDark
                    ? "border-white/10 text-white/65"
                    : "border-black/10 text-[#1A2119]/65"
                }`}
              >
                <tr>
                  <th className="px-4 py-3 font-medium">Supplier</th>
                  <th className="px-4 py-3 font-medium">Risk</th>
                  <th className="px-4 py-3 font-medium">Items</th>
                  <th className="px-4 py-3 font-medium">Low Stock</th>
                  <th className="px-4 py-3 font-medium">Stockouts</th>
                  <th className="px-4 py-3 font-medium">Expiring</th>
                  <th className="px-4 py-3 font-medium">Exposure</th>
                  <th className="px-4 py-3 font-medium">Procurement Load</th>
                </tr>
              </thead>
              <tbody>
                {topRiskSuppliers.length > 0 ? (
                  topRiskSuppliers.map((supplier) => {
                    const procurementMatch = supplierProcurementLoad.find(
                      (item) => item.name === supplier.supplier,
                    );

                    return (
                      <tr
                        key={supplier.supplier}
                        className={`border-b ${
                          isDark
                            ? "border-white/10 text-white/85"
                            : "border-black/10 text-[#1A2119]/85"
                        }`}
                      >
                        <td className="px-4 py-4 font-medium">
                          {supplier.supplier}
                        </td>
                        <td className="px-4 py-4">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${
                              supplier.riskLevel === "High"
                                ? "bg-red-100 text-red-700"
                                : supplier.riskLevel === "Medium"
                                  ? "bg-yellow-100 text-yellow-700"
                                  : "bg-green-100 text-green-700"
                            }`}
                          >
                            {supplier.riskLevel}
                          </span>
                        </td>
                        <td className="px-4 py-4">{supplier.totalItems}</td>
                        <td className="px-4 py-4">{supplier.lowStockItems}</td>
                        <td className="px-4 py-4">
                          {supplier.outOfStockItems}
                        </td>
                        <td className="px-4 py-4">
                          {supplier.expiringSoonItems}
                        </td>
                        <td className="px-4 py-4">
                          ₹{Math.round(supplier.totalStockValue || 0)}
                        </td>
                        <td className="px-4 py-4">
                          {procurementMatch
                            ? `₹${Math.round(procurementMatch.estimatedCost)}`
                            : "—"}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td
                      colSpan="8"
                      className={`px-4 py-8 text-center ${
                        isDark ? "text-white/40" : "text-[#1A2119]/40"
                      }`}
                    >
                      No supplier analytics available yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </AnalyticsCard>
      </div>
    );
  };

  const renderBoardroomContent = () => {
    const dc = decisionCenter || {};
    const kpis = dc.kpis || {};
    const brief = dc.boardroom || {};
    const ct = dashboardAI.controlTower?.data || {};
    const ctkpis = ct.kpis || {};
    const topAction = (dc.actions || [])[0];
    const ledger = impactLedger?.summary || {};
    const formatMoney = (value) => `₹${Math.round(Number(value) || 0).toLocaleString("en-IN")}`;
    const health = dashboardAI.healthScore;
    const workspaceName = vendorDataMap[vendorKey]?.vendor || vendorKey || "Current Workspace";
    const categoryValue = (category) => (moneyLeaks?.categoryTotals || []).find((x) => x.category === category)?.value || 0;

    return (
      <div className="space-y-6">
        <div className={`relative overflow-hidden rounded-[30px] border p-7 md:p-9 ${isDark ? "border-white/10 bg-white/[0.035]" : "border-black/10 bg-white"}`}>
          <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-[#9ad17b]/10 blur-3xl" />
          <div className="relative">
            <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#9ad17b]">Executive Boardroom</p>
                <h2 className="mt-3 text-3xl font-semibold tracking-tight md:text-5xl">Good morning. Here is what matters today.</h2>
                <p className="mt-3 max-w-2xl text-sm opacity-60">A decision-first view of {workspaceName}: business health, financial exposure, operational risk and the highest-value action.</p>
              </div>
              <div className="rounded-2xl border border-[#9ad17b]/25 bg-[#9ad17b]/10 px-5 py-4 text-right">
                <div className="text-[10px] uppercase tracking-widest opacity-60">BizLift Health</div>
                <div className="mt-1 text-4xl font-bold text-[#9ad17b]">{health == null ? "—" : Math.round(health)}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard title="Revenue at Risk" value={formatMoney(ctkpis.revenueAtRisk)} note="Operational exposure" noteClass="text-yellow-400" isDark={isDark} />
          <MetricCard title="Waste Exposure" value={formatMoney(ctkpis.wasteCost ?? categoryValue("Waste"))} note="Estimated avoidable leakage" noteClass="text-orange-400" isDark={isDark} />
          <MetricCard title="Critical Issues" value={ctkpis.criticalNow ?? kpis.critical ?? 0} note="Requires attention" noteClass="text-red-400" isDark={isDark} />
          <MetricCard title="Expected Benefit" value={formatMoney(kpis.expectedBenefit)} note="From recommended actions" noteClass="text-[#9ad17b]" isDark={isDark} />
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.35fr_0.65fr]">
          <AnalyticsCard title="The Decision" subtitle="If management does only one thing today, this is it." isDark={isDark}>
            {topAction ? (
              <div className={`rounded-[24px] border p-6 ${isDark ? "border-[#9ad17b]/30 bg-[#9ad17b]/5" : "border-[#6d9f55]/30 bg-[#f2f8ed]"}`}>
                <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wider text-[#9ad17b]">#1 Recommended Action</div>
                    <h3 className="mt-2 text-2xl font-bold">{topAction.title}</h3>
                    <p className="mt-3 text-sm opacity-65">{topAction.reason}</p>
                    <p className="mt-3 text-sm font-semibold">→ {topAction.nextAction}</p>
                  </div>
                  <div className="shrink-0 md:text-right">
                    <div className="text-3xl font-bold text-[#9ad17b]">{formatMoney(topAction.expectedNetBenefit)}</div>
                    <div className="text-xs opacity-50">expected net benefit</div>
                    <div className="mt-3 text-xs">Confidence: <span className="font-semibold">{topAction.confidence || brief.confidence || "Medium"}</span></div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-white/10 p-6 text-sm opacity-60">No high-value action is currently waiting for management attention.</div>
            )}
          </AnalyticsCard>

          <AnalyticsCard title="Executive Brief" subtitle="The story behind the numbers" isDark={isDark}>
            <div className="space-y-4">
              <div><div className="text-[10px] uppercase tracking-widest opacity-45">Headline</div><div className="mt-1 font-semibold">{brief.headline || "Operations are being monitored."}</div></div>
              <div><div className="text-[10px] uppercase tracking-widest opacity-45">Top risk</div><div className="mt-1 text-sm">{brief.topRisk || "No critical operational risk detected."}</div></div>
              <div><div className="text-[10px] uppercase tracking-widest opacity-45">Recommended move</div><div className="mt-1 text-sm text-[#9ad17b]">{brief.topAction || "Continue monitoring."}</div></div>
            </div>
          </AnalyticsCard>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <AnalyticsCard title="Money Leaks" subtitle="Where value can disappear" isDark={isDark}>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span>Stockout exposure</span><b>{formatMoney(categoryValue("Stockout"))}</b></div>
              <div className="flex justify-between"><span>Waste</span><b>{formatMoney(categoryValue("Waste"))}</b></div>
              <div className="flex justify-between"><span>Expiry</span><b>{formatMoney(categoryValue("Expiry"))}</b></div>
              <div className="flex justify-between"><span>Procurement exposure</span><b>{formatMoney(categoryValue("Procurement"))}</b></div>
            </div>
          </AnalyticsCard>
          <AnalyticsCard title="Operational Pulse" subtitle="Signals management should watch" isDark={isDark}>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span>Menu 86</span><b>{ctkpis.menu86 ?? 0}</b></div>
              <div className="flex justify-between"><span>Forecast risk</span><b>{ctkpis.forecastRisk ?? 0}</b></div>
              <div className="flex justify-between"><span>Procurement exposure</span><b>{formatMoney(ctkpis.procurementExposure)}</b></div>
              <div className="flex justify-between"><span>Revenue at risk</span><b>{formatMoney(ctkpis.revenueAtRisk)}</b></div>
            </div>
          </AnalyticsCard>
          <AnalyticsCard title="Learning Loop" subtitle="Is BizLift getting better at decisions?" isDark={isDark}>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span>Recommendations</span><b>{ledger.totalRecommendations ?? 0}</b></div>
              <div className="flex justify-between"><span>Measured</span><b>{ledger.measured ?? 0}</b></div>
              <div className="flex justify-between"><span>Prediction accuracy</span><b>{ledger.predictionAccuracy == null ? "—" : `${Math.round(ledger.predictionAccuracy)}%`}</b></div>
              <div className="flex justify-between"><span>Value realized</span><b className="text-[#9ad17b]">{formatMoney(ledger.realizedValue)}</b></div>
            </div>
          </AnalyticsCard>
        </div>

        <div className={`rounded-[24px] border p-5 text-sm ${isDark ? "border-white/10 bg-white/[0.02]" : "border-black/10 bg-[#f6f6f2]"}`}>
          <span className="font-semibold">Management principle:</span> BizLift does not blindly automate the decision. It simulates the expected impact, presents the recommendation for human approval, executes approved actions, and measures the actual outcome.
        </div>
      </div>
    );
  };

  const renderSettingsContent = () => {
    const workspace = dashboardAI.workspaceHealth?.data || {};

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
          <MetricCard
            title="Inventory Records"
            value={workspace.inventoryCount ?? inventoryItems.length}
            note="Tracked stock entries"
            noteClass="text-[#9ad17b]"
            isDark={isDark}
          />
          <MetricCard
            title="Recipes"
            value={workspace.recipeCount ?? recipeItems.length}
            note="Menu mappings"
            noteClass="text-blue-400"
            isDark={isDark}
          />
          <MetricCard
            title="Sales Records"
            value={workspace.salesCount ?? salesItems.length}
            note="Recorded sales events"
            noteClass="text-yellow-400"
            isDark={isDark}
          />
          <MetricCard
            title="Workspace Health"
            value={dashboardAI.healthScore ?? 100}
            note={
              <span
                className={`px-3 py-1 rounded-full text-sm font-semibold ${
                  workspace.healthStatus === "Critical"
                    ? "bg-red-500/20 text-red-400"
                    : workspace.healthStatus === "Attention Needed" ||
                        workspace.healthStatus === "Needs Attention"
                      ? "bg-yellow-500/20 text-yellow-400"
                      : "bg-[#9ad17b]/20 text-[#9ad17b]"
                }`}
              >
                {workspace.healthStatus || "Stable"}
              </span>
            }
            noteClass="mt-2"
            isDark={isDark}
          />
        </div>

        <AnalyticsCard
          title="Workspace Intelligence Snapshot"
          subtitle="Live system status and operational footprint"
          isDark={isDark}
        >
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
            <div
              className={`rounded-[22px] border p-5 ${
                isDark
                  ? "border-white/10 bg-black/20"
                  : "border-black/10 bg-[#f6f6f2]"
              }`}
            >
              <p
                className={
                  isDark ? "text-sm text-white/50" : "text-sm text-[#1A2119]/50"
                }
              >
                Low Stock Items
              </p>
              <p className="mt-3 text-3xl font-bold">
                {workspace.lowStockCount ?? 0}
              </p>
            </div>

            <div
              className={`rounded-[22px] border p-5 ${
                isDark
                  ? "border-white/10 bg-black/20"
                  : "border-black/10 bg-[#f6f6f2]"
              }`}
            >
              <p
                className={
                  isDark ? "text-sm text-white/50" : "text-sm text-[#1A2119]/50"
                }
              >
                Out of Stock
              </p>
              <p className="mt-3 text-3xl font-bold">
                {workspace.outOfStockCount ?? 0}
              </p>
            </div>

            <div
              className={`rounded-[22px] border p-5 ${
                isDark
                  ? "border-white/10 bg-black/20"
                  : "border-black/10 bg-[#f6f6f2]"
              }`}
            >
              <p
                className={
                  isDark ? "text-sm text-white/50" : "text-sm text-[#1A2119]/50"
                }
              >
                Expiring Soon
              </p>
              <p className="mt-3 text-3xl font-bold">
                {workspace.expiringSoonCount ?? 0}
              </p>
            </div>

            <div
              className={`rounded-[22px] border p-5 ${
                isDark
                  ? "border-white/10 bg-black/20"
                  : "border-black/10 bg-[#f6f6f2]"
              }`}
            >
              <p
                className={
                  isDark ? "text-sm text-white/50" : "text-sm text-[#1A2119]/50"
                }
              >
                Transactions
              </p>
              <p className="mt-3 text-3xl font-bold">
                {workspace.transactionCount ?? transactionItems.length}
              </p>
            </div>
          </div>
        </AnalyticsCard>

        <AnalyticsCard
          title="Data Operations"
          subtitle="Export, refresh, and control workspace intelligence"
          isDark={isDark}
        >
          <div className="flex flex-wrap gap-4">
            <button
              onClick={handleExportWorkspacePack}
              disabled={settingsActionLoading === "export"}
              className="rounded-[16px] px-5 py-3 font-semibold text-black transition disabled:opacity-60"
              style={{ backgroundColor: "#9ad17b" }}
            >
              Export Intelligence Pack
            </button>

            <button
              onClick={() =>
                runSettingsAction("refresh", async () => {
                  await fetchDashboardData();
                  await fetchDashboardAI();
                })
              }
              disabled={settingsActionLoading === "refresh"}
              className={`rounded-[16px] px-5 py-3 font-semibold transition disabled:opacity-60 ${
                isDark
                  ? "bg-white/10 text-white hover:bg-white/15"
                  : "bg-[#eef1e8] text-[#1A2119] hover:bg-[#e4e8de]"
              }`}
            >
              Refresh Workspace
            </button>

            <button
              onClick={() =>
                runSettingsAction("reset-actions", async () => {
                  await fetchJSON(DASHBOARD_ENDPOINTS.resetActionStates, {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                    },
                  });
                })
              }
              disabled={settingsActionLoading === "reset-actions"}
              className="rounded-[16px] px-5 py-3 font-semibold bg-yellow-100 text-yellow-800 transition disabled:opacity-60"
            >
              Reset Action States
            </button>

            <button
              onClick={() => {
                localStorage.clear();
                sessionStorage.clear();
                window.location.reload();
              }}
              className="rounded-[16px] px-5 py-3 font-semibold bg-red-100 text-red-700 transition"
            >
              Clear Local Workspace
            </button>
          </div>

          <div
            className={`mt-6 rounded-[20px] border p-5 ${
              isDark
                ? "border-white/10 bg-black/20 text-white/65"
                : "border-black/10 bg-[#f6f6f2] text-[#1A2119]/65"
            }`}
          >
            <p className="font-semibold">Last backend health snapshot:</p>
            <p className="mt-2 text-sm">
              {workspace.generatedAt
                ? new Date(workspace.generatedAt).toLocaleString("en-GB")
                : "Not available"}
            </p>
          </div>
        </AnalyticsCard>
      </div>
    );
  };

  const topSignal = useMemo(() => {
    if (dashboardAI.topSignal)
      return dashboardAI.topSignal.detail || dashboardAI.topSignal.title;

    if (alertItems.length > 0) {
      return `${alertItems.length} low stock items need replenishment attention.`;
    }

    if (expiryItems.length > 0) {
      return `${expiryItems.length} items are nearing expiry within the next 7 days.`;
    }

    if (wasteTransactions.length > 0) {
      return `${wasteTransactions.length} waste-linked transactions have been detected.`;
    }

    return "Operations stable.";
  }, [dashboardAI.topSignal, alertItems, expiryItems, wasteTransactions]);

  const menuProfitabilityRows = useMemo(() => {
    const inventoryMap = new Map(
      inventoryItems.map((item) => [String(item.id), item]),
    );

    return recipeItems
      .map((recipe) => {
        const cost = (recipe.ingredients || []).reduce((sum, ingredient) => {
          const item = inventoryMap.get(String(ingredient.inventoryItemId));
          return sum + Number(ingredient.quantity || 0) * Number(item?.costPrice || 0);
        }, 0);
        const price = Number(recipe.sellingPrice || 0);
        const margin = price - cost;
        const marginPct = price > 0 ? (margin / price) * 100 : 0;
        const blockedIngredients = (recipe.ingredients || []).filter((ingredient) => {
          const item = inventoryMap.get(String(ingredient.inventoryItemId));
          return !item || Number(item.currentStock || 0) <= Number(item.minThreshold || 0);
        });
        const soldUnits = salesItems
          .filter((sale) => String(sale.recipeId) === String(recipe.id))
          .reduce((sum, sale) => sum + Number(sale.quantitySold || 0), 0);

        return {
          ...recipe,
          cost,
          margin,
          marginPct,
          soldUnits,
          blockedIngredients,
        };
      })
      .sort((a, b) => b.marginPct - a.marginPct);
  }, [recipeItems, inventoryItems, salesItems]);

  const smartOpsMetrics = useMemo(() => {
    const highMargin = menuProfitabilityRows.filter((item) => item.marginPct >= 60).length;
    const bottleneckMenus = menuProfitabilityRows.filter((item) => item.blockedIngredients.length > 0).length;
    const wasteCost = Number(totalWasteCost || 0);
    const recoverableWaste = wasteCost * 0.6;
    const recentCutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const recentSales = salesItems.filter((sale) => new Date(sale.createdAt).getTime() >= recentCutoff);
    const recentUnits = recentSales.reduce((sum, sale) => sum + Number(sale.quantitySold || 0), 0);
    const prepTomorrow = Math.max(0, Math.round((recentUnits / 7) * 1.08));

    return { highMargin, bottleneckMenus, recoverableWaste, prepTomorrow };
  }, [menuProfitabilityRows, totalWasteCost, salesItems]);

  const renderInventoryDashboardContent = () => {
    const uniqueItems = Array.from(
      new Map(inventoryItems.map((item) => [String(item.id), item])).values(),
    );
    const low = uniqueItems.filter(
      (item) => Number(item.currentStock || 0) <= Number(item.minThreshold || 0),
    );

    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm opacity-50">Unique master inventory</p>
            <h3 className="mt-1 text-2xl font-semibold">Live Stock Control</h3>
          </div>
          <Link
            to="/inventory"
            className="rounded-[14px] px-4 py-2 text-sm font-semibold text-black"
            style={{ backgroundColor: "#9ad17b" }}
          >
            Open full inventory
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <MetricCard title="Unique Items" value={uniqueItems.length} note="One master record per ingredient" isDark={isDark} />
          <MetricCard title="Low / Critical" value={low.length} note="Stock pressure detected" noteClass="text-yellow-400" isDark={isDark} />
          <MetricCard title="Recipes" value={recipeItems.length} note="Menu items linked to ingredients" isDark={isDark} />
          <MetricCard title="Transactions" value={transactionItems.length} note="Inventory movement history" isDark={isDark} />
        </div>

        <AnalyticsCard title="Master Inventory" subtitle="Duplicates are collapsed by item ID; transaction history remains separate" isDark={isDark}>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-white/10 text-xs uppercase opacity-50">
                <tr><th className="py-3 pr-4">Item</th><th className="py-3 pr-4">Category</th><th className="py-3 pr-4">Stock</th><th className="py-3 pr-4">Threshold</th><th className="py-3 pr-4">Supplier</th><th className="py-3">Status</th></tr>
              </thead>
              <tbody>
                {uniqueItems.map((item) => (
                  <tr key={item.id} className="border-b border-white/5">
                    <td className="py-3 pr-4 font-medium">{item.itemName}</td>
                    <td className="py-3 pr-4 opacity-70">{item.category}</td>
                    <td className="py-3 pr-4">{item.currentStock} {item.unit}</td>
                    <td className="py-3 pr-4">{item.minThreshold} {item.unit}</td>
                    <td className="py-3 pr-4 opacity-70">{item.supplier || "Unassigned"}</td>
                    <td className="py-3"><StatusPill label={item.status || "In Stock"} tone={String(item.status).toLowerCase().includes("out") ? "red" : String(item.status).toLowerCase().includes("low") ? "yellow" : "green"} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </AnalyticsCard>

        <AnalyticsCard title="Menu Profitability & Ingredient Bottlenecks" subtitle="Novel decision layer: connect recipe cost, margin and stock availability" isDark={isDark}>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-white/10 text-xs uppercase opacity-50">
                <tr><th className="py-3 pr-4">Menu Item</th><th className="py-3 pr-4">Food Cost</th><th className="py-3 pr-4">Margin</th><th className="py-3 pr-4">Sold</th><th className="py-3">Decision</th></tr>
              </thead>
              <tbody>
                {menuProfitabilityRows.map((row) => (
                  <tr key={row.id} className="border-b border-white/5">
                    <td className="py-3 pr-4 font-medium">{row.menuItemName}</td>
                    <td className="py-3 pr-4">₹{row.cost.toFixed(1)}</td>
                    <td className="py-3 pr-4">₹{row.margin.toFixed(1)} ({row.marginPct.toFixed(0)}%)</td>
                    <td className="py-3 pr-4">{row.soldUnits}</td>
                    <td className="py-3">
                      {row.blockedIngredients.length > 0 ? <StatusPill label={`Stock risk: ${row.blockedIngredients.length}`} tone="red" /> : row.marginPct >= 60 ? <StatusPill label="Promote" tone="green" /> : <StatusPill label="Monitor" tone="blue" />}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </AnalyticsCard>
      </div>
    );
  };

  const renderIntelligenceHealthNotice = () => {
    const health = dashboardAI.moduleHealth || { success: true, failures: [] };
    if (health.success && !aiError) return null;
    const failures = health.failures || [];
    return (
      <div className={`mt-6 rounded-[18px] border p-4 ${isDark ? "border-yellow-400/20 bg-yellow-400/5" : "border-yellow-600/20 bg-yellow-50"}`}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="font-semibold">Intelligence health</div>
            <div className="mt-1 text-sm opacity-70">{failures.length ? `${failures.length} module${failures.length === 1 ? "" : "s"} need attention. Working modules remain available.` : aiError}</div>
            {failures.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {failures.map((failure) => (
                  <span key={failure.key} className="rounded-full border border-yellow-400/20 px-2.5 py-1 text-xs">{failure.key}: {failure.message}</span>
                ))}
              </div>
            )}
          </div>
          <button type="button" onClick={() => fetchDashboardAI()} className="rounded-xl border border-white/10 px-3 py-2 text-xs font-medium hover:bg-white/5">Retry</button>
        </div>
      </div>
    );
  };

  const renderSmartOpsPanel = () => (
    <div className="mt-8 space-y-6">
      <AnalyticsCard title="Smart Ops Lab" subtitle="Novelty layer: convert raw operations data into decisions" isDark={isDark}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <MetricCard title="High-Margin Menus" value={smartOpsMetrics.highMargin} note="Candidate items for promotion" isDark={isDark} />
          <MetricCard title="Ingredient Bottlenecks" value={smartOpsMetrics.bottleneckMenus} note="Menus at risk from stock pressure" noteClass="text-red-400" isDark={isDark} />
          <MetricCard title="Recoverable Waste" value={`₹${Math.round(smartOpsMetrics.recoverableWaste)}`} note="Estimated value if waste falls 60%" noteClass="text-yellow-400" isDark={isDark} />
          <MetricCard title="Tomorrow Prep Signal" value={smartOpsMetrics.prepTomorrow} note="Suggested units from recent demand" noteClass="text-blue-400" isDark={isDark} />
        </div>
      </AnalyticsCard>
    </div>
  );

  const renderDecisionIntelligencePanel = () => {
    const decision = dashboardAI.decision?.data || {};
    const actions = decision.actions || [];
    const rescue = decision.expiryRescue || [];
    const dependency = decision.ingredientDependency || [];
    const promotions = decision.promotions || [];
    return (
      <AnalyticsCard title="Decision Intelligence" subtitle="Turns operational signals into explainable actions" isDark={isDark}>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className={`rounded-[20px] border p-4 ${isDark ? "border-white/10 bg-black/20" : "border-black/10 bg-[#f6f6f2]"}`}>
            <div className="text-sm font-semibold">Today’s recommended actions</div>
            <div className="mt-3 space-y-3">
              {actions.length ? actions.slice(0,4).map((a,i)=><div key={i} className="rounded-xl border border-white/10 p-3"><div className="font-medium">{a.title}</div><div className="mt-1 text-xs opacity-60">{a.message}</div></div>) : <div className="text-sm opacity-50">No urgent decision signals.</div>}
            </div>
          </div>
          <div className={`rounded-[20px] border p-4 ${isDark ? "border-white/10 bg-black/20" : "border-black/10 bg-[#f6f6f2]"}`}>
            <div className="text-sm font-semibold">Ingredient dependency</div>
            <div className="mt-3 space-y-2">{dependency.slice(0,5).map(x=><div key={x.inventoryItemId} className="flex items-center justify-between text-sm"><span>{x.itemName}</span><span className="opacity-60">{x.linkedMenuCount} menus · ₹{Math.round(x.estimatedDailyRevenueAtRisk)}/day</span></div>)}{!dependency.length&&<div className="text-sm opacity-50">No dependency risks detected.</div>}</div>
          </div>
          <div className={`rounded-[20px] border p-4 ${isDark ? "border-white/10 bg-black/20" : "border-black/10 bg-[#f6f6f2]"}`}>
            <div className="text-sm font-semibold">Expiry rescue & menu opportunities</div>
            <div className="mt-3 space-y-2">{rescue.slice(0,3).map(x=><div key={x.inventoryItemId} className="text-sm"><span className="font-medium">Rescue {x.itemName}</span><span className="opacity-60"> · {x.daysRemaining}d · ₹{Math.round(x.estimatedValueAtRisk)}</span></div>)}{promotions.filter(x=>x.recommendation==='promote').slice(0,2).map(x=><div key={x.recipeId} className="text-sm"><span className="font-medium">Promote {x.menuItemName}</span><span className="opacity-60"> · {x.marginPct}% margin</span></div>)}{!rescue.length&&!promotions.length&&<div className="text-sm opacity-50">No immediate opportunities.</div>}</div>
          </div>
        </div>
      </AnalyticsCard>
    );
  };

  const [recommendationOutcomes, setRecommendationOutcomes] = useState([]);
  const [outcomeSaving, setOutcomeSaving] = useState("");

  const stockoutScenarioRows = useMemo(() => {
    const decision = dashboardAI.decision?.data || {};
    return (decision.ingredientDependency || []).map((item) => {
      const baseRisk = Number(item.estimatedDailyRevenueAtRisk || 0);
      return { ...item, scenarioRisk: Math.round(baseRisk * (1 + stockoutScenario / 100)) };
    });
  }, [dashboardAI.decision, stockoutScenario]);

  const recordRecommendationOutcome = async (recommendation, status = "completed") => {
    try {
      setOutcomeSaving(recommendation.title || recommendation.menuItemName || "recommendation");
      const response = await apiFetch(DASHBOARD_ENDPOINTS.recommendationOutcomes, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recommendationId: recommendation.id || recommendation.recipeId || recommendation.inventoryItemId,
          type: recommendation.type || recommendation.recommendation || "operational",
          title: recommendation.title || `Action: ${recommendation.menuItemName || recommendation.itemName || "Recommendation"}`,
          status,
          expectedImpact: Number(recommendation.expectedImpact || recommendation.estimatedDailyRevenueAtRisk || 0),
          notes: recommendation.message || recommendation.why || "Action recorded from Decision Intelligence.",
        }),
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok || json.success === false) throw new Error(json.message || "Could not record outcome");
      setRecommendationOutcomes((prev) => [json.data, ...prev].slice(0, 200));
    } catch (error) {
      console.error("Failed to record recommendation outcome:", error);
    } finally {
      setOutcomeSaving("");
    }
  };

  const runDigitalTwin = async (pct = twinDemandPct) => {
    setDigitalTwinLoading(true);
    try {
      const response = await apiFetch(withWorkspace(DASHBOARD_ENDPOINTS.digitalTwin), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ demandPct: pct, horizonDays: 7 }),
      });
      const json = await response.json();
      if (!response.ok || json.success === false) throw new Error(json.message || "Simulation failed");
      setDigitalTwin(json.data);
      setTwinDemandPct(pct);
    } catch (error) {
      setAiError(error.message || "Digital twin simulation failed.");
    } finally {
      setDigitalTwinLoading(false);
    }
  };

  const runActionOptimizer = async () => {
    setActionOptimizerLoading(true);
    try {
      const response = await apiFetch(withWorkspace(DASHBOARD_ENDPOINTS.actionOptimizer), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
      const json = await response.json().catch(() => ({}));
      if (!response.ok || json.success === false) throw new Error(json.message || "Action optimization failed");
      setActionOptimizer(json.data);
    } catch (error) { setAiError(error.message || "Action optimization failed."); }
    finally { setActionOptimizerLoading(false); }
  };

  const approveOptimizedAction = async (action) => {
    setActionApprovalId(action.id);
    try {
      const response = await apiFetch(withWorkspace(DASHBOARD_ENDPOINTS.actionApprove), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) });
      const json = await response.json().catch(() => ({}));
      if (!response.ok || json.success === false) throw new Error(json.message || "Action approval failed");
      await fetchDashboardAI();
      setActionOptimizer(json.data ? { ...(actionOptimizer || {}), lastApproved: action.id } : actionOptimizer);
    } catch (error) { setAiError(error.message || "Action approval failed."); }
    finally { setActionApprovalId(""); }
  };

  const renderAICopilotPanel = () => {
    const run = copilotBrief?.run || copilotBrief || null;
    const actions = run?.actions || [];
    return (
      <AnalyticsCard title="AI Copilot" subtitle="Explainable decisions grounded in this workspace's live operational signals" isDark={isDark}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <div className="text-xl font-semibold">{run?.summary || "Ask BizLift to synthesize today's highest-value operational decisions."}</div>
            <div className="mt-2 text-xs opacity-55">Copilot does not silently change inventory, prices, or purchase orders. Actions remain proposed until an authorized user approves them.</div>
          </div>
          <button type="button" onClick={runCopilotBrief} disabled={copilotLoading} className="shrink-0 rounded-xl border border-[#9ad17b]/40 bg-[#9ad17b]/10 px-4 py-2 text-xs font-semibold">{copilotLoading ? "Thinking…" : "Generate Copilot Brief"}</button>
        </div>
        {actions.length > 0 && (
          <div className="mt-5 grid grid-cols-1 gap-3 lg:grid-cols-3">
            {actions.map((action) => (
              <div key={action.id} className={`rounded-2xl border p-4 ${isDark ? "border-white/10 bg-black/20" : "border-black/10 bg-[#f6f6f2]"}`}>
                <div className="flex items-center justify-between gap-2"><span className="text-[10px] font-semibold uppercase tracking-[0.12em] opacity-50">{action.priority}</span><span className="text-[10px] uppercase opacity-45">{action.status || "proposed"}</span></div>
                <div className="mt-2 font-semibold">{action.title}</div>
                <div className="mt-2 text-xs opacity-60">{action.rationale}</div>
                <div className="mt-3 flex items-center gap-2">
                  {action.status === "proposed" ? <>
                    <button type="button" disabled={Boolean(copilotActionId)} onClick={() => decideCopilotAction(action, "approved")} className="rounded-lg bg-[#9ad17b] px-3 py-2 text-[11px] font-semibold text-black">{copilotActionId === action.id ? "Saving…" : "Approve"}</button>
                    <button type="button" disabled={Boolean(copilotActionId)} onClick={() => decideCopilotAction(action, "dismissed")} className="rounded-lg border border-white/10 px-3 py-2 text-[11px]">Dismiss</button>
                  </> : <span className="text-[11px] opacity-50">Decision recorded</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </AnalyticsCard>
    );
  };

  const renderDecisionIntelligenceContent = () => {
    const d = dashboardAI.decision?.data || {};
    const dependency = d.ingredientDependency || [];
    const menu = d.menuEngineering || [];
    const prep = d.prepPlan || [];
    const variance = d.actualVsTheoretical || [];
    const whatIf = d.whatIf?.demandPlus20;
    const availability = d.menuAvailability || [];
    const reorderOptimizer = d.reorderOptimizer || [];
    const scenarios = d.whatIf?.scenarios || [];
    const demandMenu = dashboardAI.demandMenu?.data || {};
    return (
      <div className="space-y-6">
        {renderAICopilotPanel()}
        {renderIntelligenceHealthNotice()}
        <AnalyticsCard title="Operations Control Tower" subtitle="What happened → Why → What next → Operational impact" isDark={isDark}>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <MetricCard title="Critical Now" value={dashboardAI.controlTower?.data?.kpis?.criticalNow ?? 0} note="Immediate actions" noteClass="text-red-400" isDark={isDark} />
            <MetricCard title="Revenue at Risk" value={`₹${Math.round(dashboardAI.controlTower?.data?.kpis?.revenueAtRisk || 0).toLocaleString("en-IN")}`} note="Daily exposure" noteClass="text-yellow-400" isDark={isDark} />
            <MetricCard title="Menu 86" value={dashboardAI.controlTower?.data?.kpis?.menu86 ?? 0} note="Blocked by stock" noteClass="text-orange-400" isDark={isDark} />
            <MetricCard title="Forecast Risk" value={dashboardAI.controlTower?.data?.kpis?.forecastRisk ?? 0} note="High / critical coverage" noteClass="text-blue-400" isDark={isDark} />
          </div>
          <div className={`mt-5 rounded-2xl border p-4 ${isDark ? "border-white/10 bg-black/20" : "border-black/10 bg-[#f6f6f2]"}`}>
            <div className="text-sm font-semibold">{dashboardAI.controlTower?.data?.summary?.why || "Operational intelligence is loading."}</div>
            <div className="mt-1 text-sm opacity-60">{dashboardAI.controlTower?.data?.summary?.next || "Review the highest-priority action."}</div>
          </div>
          <div className="mt-5 overflow-x-auto"><table className="min-w-full text-sm"><thead><tr className="border-b border-white/10"><th className="px-3 py-3 text-left">Priority</th><th className="px-3 py-3 text-left">Action</th><th className="px-3 py-3 text-left">Why</th><th className="px-3 py-3 text-left">Impact</th><th className="px-3 py-3 text-left">State</th><th className="px-3 py-3 text-left">Next</th><th className="px-3 py-3 text-left">Update</th></tr></thead><tbody>
            {(dashboardAI.controlTower?.data?.actions || []).slice(0,8).map(a => <tr key={a.actionKey} className="border-b border-white/10"><td className="px-3 py-3 font-semibold">{a.priority}</td><td className="px-3 py-3">{a.title}</td><td className="px-3 py-3 opacity-70">{a.reason}</td><td className="px-3 py-3">₹{Math.round(a.impact || 0).toLocaleString("en-IN")}</td><td className="px-3 py-3">{a.state}</td><td className="px-3 py-3">{a.nextAction}</td><td className="px-3 py-3"><div className="flex gap-2">{a.state !== "reviewed" && a.state !== "completed" && <button type="button" onClick={() => updateControlTowerAction(a.actionKey, "reviewed")} className="rounded-lg border px-2 py-1 text-xs">Review</button>}{a.state !== "completed" && <button type="button" onClick={() => updateControlTowerAction(a.actionKey, "completed")} className="rounded-lg border px-2 py-1 text-xs">Done</button>}</div></td></tr>)}
            {!(dashboardAI.controlTower?.data?.actions || []).length && <tr><td colSpan="6" className="px-3 py-6 text-center opacity-50">No operational actions detected.</td></tr>}
          </tbody></table></div>
        </AnalyticsCard>
        <AnalyticsCard title="BizLift Decision Center" subtitle="What should I do today? — ranked decisions with expected business impact" isDark={isDark}>
          <div className="rounded-2xl border border-[#9ad17b]/30 bg-[#9ad17b]/5 p-4">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <MetricCard title="Top Opportunity" value={`₹${Math.round(decisionCenter?.kpis?.expectedBenefit || 0).toLocaleString("en-IN")}`} note="Expected net benefit" noteClass="text-[#9ad17b]" isDark={isDark} />
              <MetricCard title="Critical" value={decisionCenter?.kpis?.critical || 0} note="Requires attention" noteClass="text-red-400" isDark={isDark} />
              <MetricCard title="Pred. Accuracy" value={impactLedger?.summary?.predictionAccuracy == null ? "—" : `${Math.round(impactLedger.summary.predictionAccuracy)}%`} note="Measured recommendations" isDark={isDark} />
              <MetricCard title="Value Realized" value={`₹${Math.round(impactLedger?.summary?.realizedValue || 0).toLocaleString("en-IN")}`} note="Closed-loop impact" noteClass="text-[#9ad17b]" isDark={isDark} />
            </div>
            <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[1.3fr_1fr]">
              <div><div className="text-xs uppercase tracking-wider opacity-50">Today's highest-value decisions</div><div className="mt-2 space-y-2">
                {(decisionCenter?.actions || []).map((a,i)=><div key={a.id} className={`rounded-xl border p-3 ${i===0 ? "border-[#9ad17b]/40" : "border-white/10"}`}><div className="flex items-start justify-between gap-3"><div><div className="font-semibold">#{i+1} {a.title}</div><div className="mt-1 text-xs opacity-60">{a.reason}</div><div className="mt-1 text-xs text-[#9ad17b]">→ {a.nextAction}</div></div><div className="text-right shrink-0"><div className="font-semibold">₹{Math.round(a.expectedNetBenefit || 0).toLocaleString("en-IN")}</div><div className="text-[10px] opacity-50">expected</div></div></div></div>)}
                {!(decisionCenter?.actions || []).length && <div className="text-sm opacity-50">No high-value decisions detected.</div>}
              </div></div>
              <div className="rounded-xl border border-white/10 p-4"><div className="text-xs uppercase tracking-wider opacity-50">Boardroom brief</div><div className="mt-2 text-lg font-bold">{decisionCenter?.boardroom?.headline || "Operations stable"}</div><div className="mt-3 text-xs opacity-60">Top risk</div><div className="text-sm">{decisionCenter?.boardroom?.topRisk || "No critical operational risk detected."}</div><div className="mt-3 text-xs opacity-60">Recommended action</div><div className="text-sm text-[#9ad17b]">{decisionCenter?.boardroom?.topAction || "Continue monitoring."}</div><div className="mt-3 flex justify-between text-xs"><span>Confidence</span><span className="font-semibold">{decisionCenter?.boardroom?.confidence || "Medium"}</span></div></div>
            </div>
          </div>
        </AnalyticsCard>
        <AnalyticsCard title="Decision Intelligence" subtitle="Explainable actions across inventory, menu, demand and procurement" isDark={isDark}>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <MetricCard title="Stockout Exposure" value={dependency.length} note="Ingredient dependencies tracked" isDark={isDark} />
            <MetricCard title="Expiry Rescue" value={(d.expiryRescue || []).length} note="Items requiring intervention" isDark={isDark} />
            <MetricCard title="Menu Opportunities" value={(d.promotions || []).filter(x=>x.recommendation==='promote').length} note="High-margin promotion candidates" isDark={isDark} />
            <MetricCard title="Demand +20%" value={whatIf ? `₹${Math.round(whatIf.projectedRevenue)}` : "—"} note={whatIf ? `${whatIf.atRiskInventoryItems} items at risk` : "Scenario unavailable"} isDark={isDark} />
          </div>
        </AnalyticsCard>
        <AnalyticsCard title="Recommendation Outcomes" subtitle="Close the loop: record what was acted on so BizLift can measure impact" isDark={isDark}>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div>
              <div className="mb-3 text-sm font-semibold">Open decisions</div>
              <div className="space-y-2">
                {(d.actions || []).slice(0, 5).map((action, index) => (
                  <div key={`${action.type}-${index}`} className={`flex items-center justify-between gap-3 rounded-xl border p-3 ${isDark ? "border-white/10 bg-black/20" : "border-black/10 bg-[#f6f6f2]"}`}>
                    <div><div className="text-sm font-medium">{action.title}</div><div className="text-xs opacity-60">{action.message}</div></div>
                    <button type="button" disabled={Boolean(outcomeSaving)} onClick={() => recordRecommendationOutcome(action)} className="shrink-0 rounded-lg border border-white/10 px-3 py-2 text-xs hover:bg-white/5 disabled:opacity-50">{outcomeSaving === action.title ? "Saving…" : "Record"}</button>
                  </div>
                ))}
                {!d.actions?.length && <div className="text-sm opacity-50">No open recommendations.</div>}
              </div>
            </div>
            <div>
              <div className="mb-3 text-sm font-semibold">Recent outcomes</div>
              <div className="space-y-2 max-h-[250px] overflow-auto">
                {recommendationOutcomes.slice(0, 6).map((item) => (
                  <div key={item.id} className="rounded-xl border border-white/10 p-3"><div className="flex items-center justify-between gap-2"><span className="text-sm font-medium">{item.title}</span><StatusPill label={item.status} tone="green" /></div><div className="mt-1 text-xs opacity-50">{new Date(item.createdAt).toLocaleString()}</div></div>
                ))}
                {!recommendationOutcomes.length && <div className="text-sm opacity-50">No outcomes recorded yet.</div>}
              </div>
            </div>
          </div>
        </AnalyticsCard>
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <AnalyticsCard title="Action Optimizer" subtitle="Turn operational signals into the highest-value next action" isDark={isDark}>
            <div className="flex items-center justify-between gap-3">
              <div><div className="text-2xl font-bold">What should I do next?</div><div className="mt-1 text-xs opacity-60">BizLift ranks avoidable loss and opportunity against the cost of acting.</div></div>
              <button type="button" onClick={runActionOptimizer} disabled={actionOptimizerLoading} className="rounded-xl border border-[#9ad17b]/40 bg-[#9ad17b]/10 px-4 py-2 text-xs font-semibold">{actionOptimizerLoading ? "Optimizing…" : "Optimize Actions"}</button>
            </div>
            {actionOptimizer?.summary && <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
              <MetricCard title="Top Net Benefit" value={`₹${Math.round(actionOptimizer.summary.topAction?.expectedNetBenefit || 0).toLocaleString("en-IN")}`} note={actionOptimizer.summary.topAction?.title || "—"} noteClass="text-[#9ad17b]" isDark={isDark} />
              <MetricCard title="Critical" value={actionOptimizer.summary.critical || 0} note="Needs fast review" noteClass="text-red-400" isDark={isDark} />
              <MetricCard title="Opportunities" value={actionOptimizer.summary.actions || 0} note="Ranked actions" isDark={isDark} />
              <MetricCard title="Est. Benefit" value={`₹${Math.round(actionOptimizer.summary.estimatedBenefit || 0).toLocaleString("en-IN")}`} note="Before action costs" isDark={isDark} />
            </div>}
            <div className="mt-4 space-y-2">{(actionOptimizer?.actions || []).slice(0,5).map((action, i) => <div key={action.id} className={`rounded-xl border p-3 ${i === 0 ? "border-[#9ad17b]/40 bg-[#9ad17b]/5" : "border-white/10"}`}>
              <div className="flex items-start justify-between gap-3"><div><div className="flex items-center gap-2"><span className="text-xs opacity-50">#{i+1}</span><span className="font-semibold">{action.title}</span><span className="text-[10px] uppercase opacity-50">{action.priority}</span></div><div className="mt-1 text-xs opacity-60">{action.reason}</div><div className="mt-2 text-xs text-[#9ad17b]">Next: {action.nextAction}</div></div><div className="shrink-0 text-right"><div className="font-semibold">₹{Math.round(action.expectedNetBenefit || 0).toLocaleString("en-IN")}</div><div className="text-[10px] opacity-50">expected net</div><button type="button" disabled={Boolean(actionApprovalId)} onClick={() => approveOptimizedAction(action)} className="mt-2 rounded-lg border border-white/10 px-2 py-1 text-[11px] hover:bg-white/5 disabled:opacity-50">{actionApprovalId === action.id ? "Approving…" : "Approve"}</button></div></div>
            </div>)}{!(actionOptimizer?.actions || []).length && <div className="rounded-xl border border-dashed border-white/10 p-6 text-center text-sm opacity-50">Run the optimizer to generate a ranked action plan.</div>}</div>
            {actionOptimizer?.methodology && <div className="mt-3 text-[11px] opacity-40">{actionOptimizer.methodology}</div>}
          </AnalyticsCard>

          <AnalyticsCard title="Waste Rescue Engine" subtitle="Convert expiring inventory into a controlled revenue recovery plan" isDark={isDark}>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <MetricCard title="At Risk" value={`₹${Math.round(dashboardAI.wasteRescue?.data?.summary?.valueAtRisk || 0).toLocaleString("en-IN")}`} note="Near-expiry inventory" noteClass="text-yellow-400" isDark={isDark} />
              <MetricCard title="Recoverable" value={`₹${Math.round(dashboardAI.wasteRescue?.data?.summary?.estimatedRecoverableValue || 0).toLocaleString("en-IN")}`} note="Estimated value saved" noteClass="text-[#9ad17b]" isDark={isDark} />
              <MetricCard title="Plans" value={dashboardAI.wasteRescue?.data?.summary?.actionablePlans || 0} note="Actionable rescue plans" isDark={isDark} />
              <MetricCard title="Revenue Opp." value={`₹${Math.round(dashboardAI.wasteRescue?.data?.summary?.revenueOpportunity || 0).toLocaleString("en-IN")}`} note="Linked menu opportunity" isDark={isDark} />
            </div>
            <div className="mt-4 space-y-2">{(dashboardAI.wasteRescue?.data?.plans || []).slice(0,5).map(plan => <div key={plan.id} className="rounded-xl border border-white/10 p-3"><div className="flex items-center justify-between gap-3"><div><div className="font-semibold">{plan.itemName}</div><div className="mt-1 text-xs opacity-60">{plan.currentStock} {plan.unit} · {plan.daysRemaining <= 0 ? "Expires now" : `${plan.daysRemaining} day(s) left`} · ₹{Math.round(plan.inventoryValueAtRisk)} at risk</div></div><div className="text-right"><div className="font-semibold">{plan.recommendedMenuItem || "Review"}</div><div className="text-xs text-[#9ad17b]">{plan.recommendedUnits || 0} units</div></div></div><div className="mt-2 text-xs opacity-70">{plan.nextAction}</div><div className="mt-2 text-xs text-[#9ad17b]">Potential value saved: ₹{Math.round(plan.estimatedValueSaved || 0)} · revenue opportunity: ₹{Math.round(plan.estimatedRevenueRecovered || 0)}</div></div>)}{!(dashboardAI.wasteRescue?.data?.plans || []).length && <div className="rounded-xl border border-dashed border-white/10 p-6 text-center text-sm opacity-50">No near-expiry rescue plan is currently needed.</div>}</div>
            <div className="mt-3 text-[11px] opacity-40">Rescue recommendations never fabricate sales or silently change stock. Actual consumption happens through POS.</div>
          </AnalyticsCard>
        </div>

        <AnalyticsCard title="Operational Control" subtitle="Availability, reorder timing and demand scenarios" isDark={isDark}>
          <AnalyticsCard title="Stockout Impact Simulator" subtitle="Stress-test ingredient shortages before they hit revenue" isDark={isDark}>
          <div className="flex min-w-max shrink-0 flex-nowrap items-center gap-2">
            {[10,20,50].map((value) => (
              <button key={value} type="button" onClick={() => setStockoutScenario(value)} className={`rounded-xl border px-3 py-2 text-xs ${stockoutScenario === value ? "border-[#9ad17b] bg-[#9ad17b]/10" : "border-white/10"}`}>+{value}% demand</button>
            ))}
            <div className="ml-auto text-sm"><span className="opacity-60">Revenue exposure:</span> <b>₹{stockoutScenarioRows.reduce((sum, x) => sum + Number(x.scenarioRisk || 0), 0).toLocaleString("en-IN")}/day</b></div>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-3">
            {stockoutScenarioRows.slice(0,3).map((x) => (
              <div key={x.inventoryItemId} className="rounded-xl border border-white/10 p-3"><div className="font-medium">{x.itemName}</div><div className="mt-1 text-xs opacity-60">{x.linkedMenuCount} menus exposed</div><div className="mt-2 font-semibold">₹{Number(x.scenarioRisk || 0).toLocaleString("en-IN")}/day</div></div>
            ))}
            {!stockoutScenarioRows.length && <div className="text-sm opacity-50">No stockout exposure detected.</div>}
          </div>
        </AnalyticsCard>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className={`rounded-[20px] border p-4 ${isDark ? "border-white/10 bg-black/20" : "border-black/10 bg-[#f6f6f2]"}`}>
              <div className="text-sm font-semibold">Menu availability</div>
              <div className="mt-2 text-3xl font-bold">{availability.filter(x => x.status === "86").length}</div>
              <div className="mt-1 text-xs opacity-60">Items currently blocked by ingredient stock</div>
            </div>
            <div className={`rounded-[20px] border p-4 ${isDark ? "border-white/10 bg-black/20" : "border-black/10 bg-[#f6f6f2]"}`}>
              <div className="text-sm font-semibold">Reorder optimizer</div>
              <div className="mt-2 text-3xl font-bold">{reorderOptimizer.filter(x => x.action === "order_now").length}</div>
              <div className="mt-1 text-xs opacity-60">Items where timing should be acted on now</div>
            </div>
            <div className={`rounded-[20px] border p-4 ${isDark ? "border-white/10 bg-black/20" : "border-black/10 bg-[#f6f6f2]"}`}>
              <div className="text-sm font-semibold">Demand scenarios</div>
              <div className="mt-2 text-3xl font-bold">{scenarios.length}</div>
              <div className="mt-1 text-xs opacity-60">Precomputed demand stress tests</div>
            </div>
          </div>
        </AnalyticsCard>
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <AnalyticsCard title="Ingredient Dependency & Revenue at Risk" subtitle="Which constrained ingredients can affect the most menu revenue" isDark={isDark}>
            <div className="overflow-x-auto"><table className="min-w-full text-sm"><thead><tr className="border-b border-white/10"><th className="px-3 py-3 text-left">Ingredient</th><th className="px-3 py-3 text-left">Menus</th><th className="px-3 py-3 text-left">Daily Revenue Risk</th></tr></thead><tbody>{dependency.map(x=><tr key={x.inventoryItemId} className="border-b border-white/10"><td className="px-3 py-3 font-medium">{x.itemName}</td><td className="px-3 py-3">{x.linkedMenuCount}</td><td className="px-3 py-3">₹{Math.round(x.estimatedDailyRevenueAtRisk)}</td></tr>)}{!dependency.length&&<tr><td colSpan="3" className="px-3 py-6 text-center opacity-50">No dependency risks.</td></tr>}</tbody></table></div>
          </AnalyticsCard>
          <AnalyticsCard title="Menu Engineering" subtitle="Star / Puzzle / Plowhorse / Dog classification" isDark={isDark}>
            <div className="space-y-2">{menu.slice(0,8).map(x=><div key={x.recipeId} className="flex items-center justify-between rounded-xl border border-white/10 px-3 py-3"><span className="font-medium">{x.menuItemName}</span><span className="text-xs capitalize opacity-70">{x.class} · {x.marginPct}% margin · {x.unitsSold} sold</span></div>)}{!menu.length&&<div className="text-sm opacity-50">No menu engineering data.</div>}</div>
          </AnalyticsCard>
          <AnalyticsCard title="Expiry Rescue" subtitle="Use at-risk stock before it becomes waste" isDark={isDark}>
            <div className="space-y-2">{(d.expiryRescue||[]).map(x=><div key={x.inventoryItemId} className="rounded-xl border border-white/10 px-3 py-3"><div className="font-medium">{x.itemName} · {x.daysRemaining} day(s)</div><div className="mt-1 text-xs opacity-60">{x.currentStock} stock · ₹{Math.round(x.estimatedValueAtRisk)} at risk · {x.recommendedMenuItems.join(', ') || 'No linked menu item'}</div></div>)}{!(d.expiryRescue||[]).length&&<div className="text-sm opacity-50">No near-expiry rescue opportunities.</div>}</div>
          </AnalyticsCard>
          <AnalyticsCard title="Prep Plan & What-If" subtitle="Demand-driven preparation with a 20% demand stress scenario" isDark={isDark}>
            <div className="mb-4 rounded-xl border border-white/10 p-3 text-sm">If demand rises 20%: projected sales <b>₹{whatIf ? Math.round(whatIf.projectedRevenue) : 0}</b>, incremental ingredient cost <b>₹{whatIf ? Math.round(whatIf.incrementalIngredientCost) : 0}</b>, inventory items at risk <b>{whatIf?.atRiskInventoryItems || 0}</b>.</div>
            <div className="space-y-2">{prep.slice(0,6).map(x=><div key={x.menuItemName} className="flex justify-between text-sm"><span>{x.menuItemName}</span><span className="opacity-60">{x.suggestedPrepUnits} units</span></div>)}</div>
          </AnalyticsCard>
        </div>
        <AnalyticsCard title="Demand Sensing" subtitle="Observed sales velocity, peak hours, short-horizon forecast and inventory coverage" isDark={isDark}>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <MetricCard title="30d Units" value={Math.round(demandMenu?.demand?.totalUnits30d || 0)} note="Observed menu demand" isDark={isDark} />
            <MetricCard title="Trend" value={demandMenu?.demand?.trendPct === null || demandMenu?.demand?.trendPct === undefined ? "—" : `${demandMenu.demand.trendPct}%`} note="Recent 7d vs prior 7d" isDark={isDark} />
            <MetricCard title="Peak Hours" value={(demandMenu?.demand?.peakHours || []).map(h => `${h}:00`).join(', ') || "—"} note="Highest observed unit volume" isDark={isDark} />
            <MetricCard title="High Risk Stock" value={(demandMenu?.demand?.inventoryRisk || []).filter(x=>x.risk==='High').length} note="Forecast coverage under 3 days" noteClass="text-red-400" isDark={isDark} />
          </div>
          <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-2">
            <div className="overflow-x-auto"><table className="min-w-full text-sm"><thead><tr className="border-b border-white/10"><th className="px-3 py-3 text-left">Menu Item</th><th className="px-3 py-3">30d</th><th className="px-3 py-3">7d Forecast</th><th className="px-3 py-3">Prep/day</th><th className="px-3 py-3">Confidence</th></tr></thead><tbody>{(demandMenu?.demand?.forecast || []).slice(0,8).map(x=><tr key={x.recipeId} className="border-b border-white/10"><td className="px-3 py-3 font-medium">{x.menuItemName}</td><td className="px-3 py-3 text-center">{x.observed30dUnits}</td><td className="px-3 py-3 text-center">{x.forecast7dUnits}</td><td className="px-3 py-3 text-center">{x.suggestedDailyPrep}</td><td className="px-3 py-3 text-center">{x.confidence}</td></tr>)}{!(demandMenu?.demand?.forecast || []).length&&<tr><td colSpan="5" className="px-3 py-6 text-center opacity-50">No observed demand data available.</td></tr>}</tbody></table></div>
            <div className="overflow-x-auto"><table className="min-w-full text-sm"><thead><tr className="border-b border-white/10"><th className="px-3 py-3 text-left">Ingredient</th><th className="px-3 py-3">7d Usage</th><th className="px-3 py-3">Coverage</th><th className="px-3 py-3">Risk</th></tr></thead><tbody>{(demandMenu?.demand?.inventoryRisk || []).slice(0,8).map(x=><tr key={x.inventoryItemId} className="border-b border-white/10"><td className="px-3 py-3 font-medium">{x.itemName}</td><td className="px-3 py-3 text-center">{x.projected7dUsage}</td><td className="px-3 py-3 text-center">{x.daysCoverage === null ? '—' : `${x.daysCoverage}d`}</td><td className="px-3 py-3 text-center">{x.risk}</td></tr>)}{!(demandMenu?.demand?.inventoryRisk || []).length&&<tr><td colSpan="4" className="px-3 py-6 text-center opacity-50">No forecast inventory risks.</td></tr>}</tbody></table></div>
          </div>
        </AnalyticsCard>

        <AnalyticsCard title="Menu Intelligence" subtitle="Turn demand, recipe cost and ingredient availability into menu decisions" isDark={isDark}>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <MetricCard title="Promote" value={(demandMenu?.menu?.promote || []).length} note="High-margin available items" noteClass="text-[#9ad17b]" isDark={isDark} />
            <MetricCard title="Price Reviews" value={(demandMenu?.menu?.pricingReviews || []).length} note="Under-margin or pricing pressure" noteClass="text-yellow-400" isDark={isDark} />
            <MetricCard title="Protect Stock" value={(demandMenu?.menu?.stockProtected || []).length} note="Items constrained by ingredients" noteClass="text-red-400" isDark={isDark} />
          </div>
          <div className="mt-5 overflow-x-auto"><table className="min-w-full text-sm"><thead><tr className="border-b border-white/10"><th className="px-3 py-3 text-left">Menu Item</th><th className="px-3 py-3">30d Units</th><th className="px-3 py-3">Food Cost</th><th className="px-3 py-3">Margin</th><th className="px-3 py-3">Pricing</th><th className="px-3 py-3">Decision</th></tr></thead><tbody>{(demandMenu?.menu?.items || []).slice(0,10).map(x=><tr key={x.recipeId} className="border-b border-white/10"><td className="px-3 py-3 font-medium">{x.menuItemName}</td><td className="px-3 py-3 text-center">{x.unitsSold30d}</td><td className="px-3 py-3 text-center">₹{x.foodCost}</td><td className="px-3 py-3 text-center">{x.marginPct}%</td><td className="px-3 py-3 text-center">{x.pricingSignal}</td><td className="px-3 py-3 text-center">{x.decision}</td></tr>)}{!(demandMenu?.menu?.items || []).length&&<tr><td colSpan="6" className="px-3 py-6 text-center opacity-50">No menu intelligence available.</td></tr>}</tbody></table></div>
        </AnalyticsCard>

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          <AnalyticsCard title="BizLift Digital Twin" subtitle="Simulate tomorrow before changing the real operation" isDark={isDark}>
            <div className="flex flex-wrap gap-2">
              {[10,20,50].map(pct => <button key={pct} type="button" onClick={() => runDigitalTwin(pct)} disabled={digitalTwinLoading} className={`rounded-xl border px-4 py-2 text-sm font-semibold ${isDark ? "border-white/10 bg-white/5 hover:bg-white/10" : "border-black/10 bg-black/5 hover:bg-black/10"}`}>Simulate +{pct}%</button>)}
            </div>
            {digitalTwin ? <div className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <MetricCard title="Revenue" value={`₹${Math.round(digitalTwin.scenarioResult.projectedRevenue||0).toLocaleString("en-IN")}`} note={`+${digitalTwin.scenario.demandPct}% demand`} isDark={isDark} />
                <MetricCard title="Profit Proxy" value={`₹${Math.round(digitalTwin.scenarioResult.profitProxy||0).toLocaleString("en-IN")}`} note={`${(digitalTwin.scenarioResult.netImpactVsBaseline||0)>=0?"Upside":"Downside"} vs baseline`} noteClass={(digitalTwin.scenarioResult.netImpactVsBaseline||0)>=0?"text-[#9ad17b]":"text-red-400"} isDark={isDark} />
                <MetricCard title="Stockouts" value={digitalTwin.scenarioResult.stockouts||0} note="Projected in 7 days" noteClass="text-red-400" isDark={isDark} />
                <MetricCard title="Procurement" value={`₹${Math.round(digitalTwin.scenarioResult.procurementCost||0).toLocaleString("en-IN")}`} note="Only simulated" isDark={isDark} />
              </div>
              <div className="rounded-xl border border-white/10 p-3 text-sm">{digitalTwin.warnings?.length ? digitalTwin.warnings.slice(0,3).map((w,i)=><div key={i} className="mb-1 text-yellow-300">⚠ {w}</div>) : <div className="text-[#9ad17b]">✓ No simulated stockout warning.</div>}<div className="mt-3 text-xs opacity-50">No inventory or purchase order is changed by simulation.</div></div>
              <div className="overflow-x-auto"><table className="min-w-full text-sm"><thead><tr className="border-b border-white/10"><th className="px-3 py-2 text-left">Scenario</th><th className="px-3 py-2">Revenue</th><th className="px-3 py-2">Profit proxy</th><th className="px-3 py-2">Stockouts</th></tr></thead><tbody>{(digitalTwin.comparison||[]).map(x=><tr key={x.demandPct} className="border-b border-white/10"><td className="px-3 py-2">+{x.demandPct}% demand</td><td className="px-3 py-2 text-center">₹{Math.round(x.projectedRevenue||0).toLocaleString("en-IN")}</td><td className="px-3 py-2 text-center">₹{Math.round(x.profitProxy||0).toLocaleString("en-IN")}</td><td className="px-3 py-2 text-center">{x.stockouts}</td></tr>)}</tbody></table></div>
            </div> : <div className="mt-4 rounded-xl border border-dashed border-white/10 p-8 text-center text-sm opacity-50">Choose a demand scenario to run a live operational simulation.</div>}
          </AnalyticsCard>

          <AnalyticsCard title="Money Leak Detector" subtitle="Find where operational friction is turning into measurable value loss" isDark={isDark}>
            <div className="grid grid-cols-2 gap-3">
              <MetricCard title="Identified" value={`₹${Math.round(dashboardAI.moneyLeaks?.data?.totalIdentifiedValue||0).toLocaleString("en-IN")}`} note="30-day operational estimate" noteClass="text-yellow-400" isDark={isDark} />
              <MetricCard title="Leaks" value={(dashboardAI.moneyLeaks?.data?.leaks||[]).length} note="Ranked by estimated value" isDark={isDark} />
            </div>
            <div className="mt-4 space-y-2">{(dashboardAI.moneyLeaks?.data?.leaks||[]).slice(0,6).map((x)=><div key={x.id} className="rounded-xl border border-white/10 p-3"><div className="flex items-center justify-between gap-3"><div><div className="font-semibold">{x.title}</div><div className="mt-1 text-xs opacity-60">{x.reason}</div></div><div className="text-right"><div className="font-semibold">₹{Math.round(x.periodValue||0).toLocaleString("en-IN")}</div><div className="text-xs opacity-50">{x.severity}</div></div></div><div className="mt-2 text-xs text-[#9ad17b]">Next: {x.action}</div></div>)}{!(dashboardAI.moneyLeaks?.data?.leaks||[]).length&&<div className="text-sm opacity-50">No material operational leaks detected.</div>}</div>
            <div className="mt-3 text-xs opacity-40">Estimates are for operational prioritization, not audited accounting.</div>
          </AnalyticsCard>
        </div>

        <AnalyticsCard title="Actual vs Theoretical Usage" subtitle="Recipe-implied consumption versus recorded POS deductions" isDark={isDark}>
          <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
            <MetricCard title="Status" value={d.usageIntegrity?.status || "—"} note="Sales → recipe → inventory" isDark={isDark} />
            <MetricCard title="Tracked Items" value={d.usageIntegrity?.trackedItems || 0} note="Items with usage history" isDark={isDark} />
            <MetricCard title="Variance Items" value={d.usageIntegrity?.varianceItems || 0} note="Items needing review" noteClass="text-yellow-400" isDark={isDark} />
            <MetricCard title="Absolute Variance" value={d.usageIntegrity?.absoluteVariance || 0} note="Unit-level difference" isDark={isDark} />
          </div>
          <div className="overflow-x-auto"><table className="min-w-full text-sm"><thead><tr className="border-b border-white/10"><th className="px-3 py-3 text-left">Ingredient</th><th className="px-3 py-3">Theoretical</th><th className="px-3 py-3">Actual</th><th className="px-3 py-3">Variance</th></tr></thead><tbody>{variance.map(x=><tr key={x.inventoryItemId} className="border-b border-white/10"><td className="px-3 py-3">{x.itemName}</td><td className="px-3 py-3 text-center">{x.theoreticalUsage}</td><td className="px-3 py-3 text-center">{x.actualUsage}</td><td className="px-3 py-3 text-center">{x.variancePct}%</td></tr>)}{!variance.length&&<tr><td colSpan="4" className="px-3 py-6 text-center opacity-50">No material usage variance detected.</td></tr>}</tbody></table></div>
        </AnalyticsCard>
      </div>
    );
  };

  const renderContent = () => {
    switch (activePage) {
      case "Overview":
        return (
          <>
            {aiLoading && (
              <div className="text-sm opacity-60 mb-4">
                Updating AI intelligence...
              </div>
            )}
            {aiError && (
              <div className="text-sm text-red-400 mb-4">{aiError}</div>
            )}
            {renderDecisionIntelligencePanel()}
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
              <section
                className={`xl:col-span-8 rounded-[30px] border p-6 shadow-lg backdrop-blur-sm ${
                  isDark
                    ? "border-white/10 bg-white/[0.04]"
                    : "border-black/10 bg-white/80"
                }`}
              >
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                  <div className="lg:col-span-7">
                    <p
                      className={
                        isDark
                          ? "text-sm text-white/50"
                          : "text-sm text-[#1A2119]/50"
                      }
                    >
                      AI Operations Control Center
                    </p>
                    <h2 className="mt-2 text-4xl font-semibold leading-tight">
                      BizLift Health Score
                    </h2>

                    <div className="mt-6 flex flex-col gap-4 md:flex-row md:items-center">
                      <div className="text-7xl font-bold leading-none text-[#9ad17b]">
                        {dashboardAI.healthScore ?? healthScore}
                      </div>

                      <div className="max-w-md">
                        <StatusPill
                          label={healthStatus}
                          tone={
                            healthStatus === "Strong"
                              ? "green"
                              : healthStatus === "Stable"
                                ? "blue"
                                : healthStatus === "Needs Attention"
                                  ? "yellow"
                                  : "red"
                          }
                        />
                        <p
                          className={
                            isDark
                              ? "mt-3 text-white/60"
                              : "mt-3 text-[#1A2119]/60"
                          }
                        >
                          A combined operational score based on stock pressure,
                          expiry exposure, and waste-related signals.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="lg:col-span-5">
                    <div
                      className={`h-full min-h-[220px] rounded-[24px] border px-5 py-5 ${
                        isDark
                          ? "border-white/10 bg-black/20"
                          : "border-black/10 bg-[#f6f6f2]"
                      }`}
                    >
                      <p
                        className={
                          isDark
                            ? "text-sm text-white/50"
                            : "text-sm text-[#1A2119]/50"
                        }
                      >
                        Top AI Signal
                      </p>
                      <p className="mt-4 text-2xl font-semibold leading-snug">
                        {topSignal}
                      </p>
                      <p
                        className={
                          isDark
                            ? "mt-3 text-sm text-white/60"
                            : "mt-3 text-sm text-[#1A2119]/60"
                        }
                      >
                        {dashboardAI.topSignal?.detail ||
                          (featuredActions[0]
                            ? featuredActions[0].detail
                            : "System is stable right now.")}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <div
                    className={`rounded-[22px] border p-5 min-h-[170px] ${
                      isDark
                        ? "border-white/10 bg-white/[0.05]"
                        : "border-black/10 bg-[#f6f6f2]"
                    }`}
                  >
                    <p
                      className={
                        isDark
                          ? "text-sm text-white/50"
                          : "text-sm text-[#1A2119]/50"
                      }
                    >
                      Inventory Value
                    </p>
                    <p className="mt-4 text-4xl font-bold leading-none break-words">
                      ₹
                      {inventoryValue >= 100000
                        ? `${(inventoryValue / 100000).toFixed(2)}L`
                        : Math.round(inventoryValue)}
                    </p>
                    <p className="mt-4 text-lg text-[#9ad17b]">
                      Live stock valuation
                    </p>
                  </div>

                  <div
                    className={`rounded-[22px] border p-5 min-h-[170px] ${
                      isDark
                        ? "border-white/10 bg-white/[0.05]"
                        : "border-black/10 bg-[#f6f6f2]"
                    }`}
                  >
                    <p
                      className={
                        isDark
                          ? "text-sm text-white/50"
                          : "text-sm text-[#1A2119]/50"
                      }
                    >
                      Low Stock Alerts
                    </p>
                    <p className="mt-4 text-4xl font-bold leading-none">
                      {overviewMetrics.lowStockAlerts}
                    </p>
                    <p className="mt-4 text-lg text-yellow-400">
                      Needs action soon
                    </p>
                  </div>

                  <div
                    className={`rounded-[22px] border p-5 min-h-[170px] ${
                      isDark
                        ? "border-white/10 bg-white/[0.05]"
                        : "border-black/10 bg-[#f6f6f2]"
                    }`}
                  >
                    <p
                      className={
                        isDark
                          ? "text-sm text-white/50"
                          : "text-sm text-[#1A2119]/50"
                      }
                    >
                      Expiry Risk Items
                    </p>
                    <p className="mt-4 text-4xl font-bold leading-none">
                      {overviewMetrics.expiryRiskItems}
                    </p>
                    <p className="mt-4 text-lg text-red-400">Next 7 days</p>
                  </div>

                  <div
                    className={`rounded-[22px] border p-5 min-h-[170px] ${
                      isDark
                        ? "border-white/10 bg-white/[0.05]"
                        : "border-black/10 bg-[#f6f6f2]"
                    }`}
                  >
                    <p
                      className={
                        isDark
                          ? "text-sm text-white/50"
                          : "text-sm text-[#1A2119]/50"
                      }
                    >
                      Critical Decisions
                    </p>
                    <p className="mt-4 text-4xl font-bold leading-none">
                      {overviewMetrics.criticalDecisions}
                    </p>
                    <p className="mt-4 text-lg text-blue-400">
                      Immediate operational actions
                    </p>
                  </div>
                </div>
              </section>

              <section
                className={`xl:col-span-4 rounded-[30px] border p-6 shadow-lg backdrop-blur-sm ${
                  isDark
                    ? "border-white/10 bg-white/[0.04]"
                    : "border-black/10 bg-white/80"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p
                      className={
                        isDark
                          ? "text-sm text-white/50"
                          : "text-sm text-[#1A2119]/50"
                      }
                    >
                      Priority Queue
                    </p>
                    <h3 className="mt-2 text-2xl font-semibold">
                      Action Center
                    </h3>
                  </div>

                  <button
                    onClick={() => setActivePage("Action Center")}
                    className={`rounded-[14px] px-4 py-2 text-sm font-semibold transition ${
                      isDark
                        ? "bg-white/10 text-white hover:bg-white/15"
                        : "bg-[#eef1e8] text-[#1A2119] hover:bg-[#e4e8de]"
                    }`}
                  >
                    View All
                  </button>
                </div>

                <div className="mt-6 space-y-4 min-h-[420px]">
                  {featuredActions.length > 0 ? (
                    featuredActions.map((action, idx) => (
                      <div
                        key={idx}
                        className={`relative rounded-[20px] border p-4 ${getActionToneClasses(
                          action.type === "danger"
                            ? "red"
                            : action.type === "warning"
                              ? "amber"
                              : action.type === "info"
                                ? "blue"
                                : "green",
                          isDark,
                        )}`}
                      >
                        {action.actionKey ? (
                          <button
                            onClick={() =>
                              updateActionState(
                                DASHBOARD_ENDPOINTS.dismissAction,
                                action.actionKey,
                              )
                            }
                            disabled={actionUpdatingKey === action.actionKey}
                            className={`absolute top-3 right-3 text-sm rounded-full w-7 h-7 flex items-center justify-center transition ${
                              isDark
                                ? "bg-white/10 text-white hover:bg-white/20"
                                : "bg-black/10 text-black hover:bg-black/20"
                            }`}
                            title="Dismiss notification"
                          >
                            ×
                          </button>
                        ) : null}
                        <div className="flex items-center gap-2 text-lg font-semibold">
                          <span
                            className={`w-2.5 h-2.5 rounded-full ${
                              action.type === "danger"
                                ? "bg-red-500"
                                : action.type === "warning"
                                  ? "bg-amber-400"
                                  : action.type === "info"
                                    ? "bg-blue-400"
                                    : "bg-green-400"
                            }`}
                          />
                          {action.title}
                        </div>
                        <div
                          className={
                            isDark
                              ? "mt-2 text-sm text-white/65"
                              : "mt-2 text-sm text-[#1A2119]/65"
                          }
                        >
                          {action.detail}
                        </div>
                        {action.state ? (
                          <div className="mt-3">
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                action.state === "reviewed"
                                  ? "bg-green-100 text-green-700"
                                  : action.state === "snoozed"
                                    ? "bg-yellow-100 text-yellow-700"
                                    : "bg-blue-100 text-blue-700"
                              }`}
                            >
                              {action.state}
                            </span>
                          </div>
                        ) : null}
                        {action.actionKey ? (
                          <div className="mt-4 flex flex-wrap gap-2">
                            <button
                              onClick={() =>
                                updateActionState(
                                  DASHBOARD_ENDPOINTS.reviewAction,
                                  action.actionKey,
                                )
                              }
                              disabled={actionUpdatingKey === action.actionKey}
                              className="rounded-[12px] px-3 py-2 text-xs font-semibold bg-green-100 text-green-700 hover:opacity-90 disabled:opacity-50"
                            >
                              Review
                            </button>

                            <button
                              onClick={() =>
                                updateActionState(
                                  DASHBOARD_ENDPOINTS.snoozeAction,
                                  action.actionKey,
                                )
                              }
                              disabled={actionUpdatingKey === action.actionKey}
                              className="rounded-[12px] px-3 py-2 text-xs font-semibold bg-yellow-100 text-yellow-700 hover:opacity-90 disabled:opacity-50"
                            >
                              Snooze
                            </button>
                          </div>
                        ) : null}
                      </div>
                    ))
                  ) : (
                    <EmptyStateBlock
                      text="No critical actions right now."
                      isDark={isDark}
                    />
                  )}
                </div>
              </section>
            </div>

            <div className="mt-8 grid grid-cols-1 gap-6 2xl:grid-cols-12">
              <div className="2xl:col-span-7 min-w-0">
                <AnalyticsCard
                  title="Forecast vs Actual Demand"
                  subtitle="Actual sales trend against projected demand"
                  isDark={isDark}
                >
                  <div
                    className={`h-[340px] rounded-[22px] border p-4 ${
                      isDark
                        ? "border-white/10 bg-black/20 shadow-[0_0_30px_rgba(154,209,123,0.08)]"
                        : "border-black/10 bg-[#f6f6f2]"
                    }`}
                  >
                    {Array.isArray(forecastVsActualDemandData) &&
                    forecastVsActualDemandData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={340} minWidth={0} minHeight={280}>
                        <LineChart data={forecastVsActualDemandData}>
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke={
                              isDark ? "rgba(255,255,255,0.12)" : "#d9ddd4"
                            }
                          />
                          <XAxis
                            dataKey="date"
                            stroke={isDark ? "#ffffff99" : "#1A211999"}
                          />
                          <YAxis stroke={isDark ? "#ffffff99" : "#1A211999"} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: isDark ? "#111111" : "#ffffff",
                              border: isDark
                                ? "1px solid rgba(255,255,255,0.1)"
                                : "1px solid #e5e7eb",
                              borderRadius: "16px",
                              color: isDark ? "#fff" : "#111",
                            }}
                          />
                          <Legend />
                          <Line
                            type="monotone"
                            dataKey="actual"
                            stroke="#3b82f6"
                            strokeWidth={3}
                            dot={{ fill: "#3b82f6", r: 4 }}
                          />
                          <Line
                            type="monotone"
                            dataKey="forecast"
                            stroke="#9ad17b"
                            strokeDasharray="6 6"
                            strokeWidth={3}
                            dot={{ fill: "#9ad17b", r: 3 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <EmptyStateBlock
                        text="No forecast data available yet."
                        isDark={isDark}
                      />
                    )}
                  </div>
                </AnalyticsCard>
              </div>

              <div className="2xl:col-span-5 space-y-6 min-w-0 self-start">
                <AnalyticsCard
                  title="Quick Record Sale"
                  subtitle="Live sales entry into operations system"
                  isDark={isDark}
                >
                  <div className="space-y-4">
                    <select
                      value={quickSaleRecipeId}
                      onChange={(e) => setQuickSaleRecipeId(e.target.value)}
                      className={`w-full rounded-[14px] border px-4 py-3 outline-none ${
                        isDark
                          ? "border-white/10 bg-black/20 text-white"
                          : "border-black/10 bg-[#f6f6f2] text-[#1A2119]"
                      }`}
                    >
                      <option value="">Select menu item</option>
                      {quickSaleOptions.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                    </select>

                    <input
                      type="number"
                      min="1"
                      value={quickSaleQuantity}
                      onChange={(e) =>
                        setQuickSaleQuantity(Number(e.target.value))
                      }
                      className={`w-full rounded-[14px] border px-4 py-3 outline-none ${
                        isDark
                          ? "border-white/10 bg-black/20 text-white"
                          : "border-black/10 bg-[#f6f6f2] text-[#1A2119]"
                      }`}
                      placeholder="Quantity sold"
                    />

                    <button
                      onClick={handleQuickSale}
                      disabled={quickSaleLoading}
                      className="w-full rounded-[14px] px-4 py-3 font-semibold text-black transition disabled:opacity-60"
                      style={{ backgroundColor: "#9ad17b" }}
                    >
                      {quickSaleLoading ? "Recording..." : "Record Sale"}
                    </button>

                    {quickSaleMessage ? (
                      <div
                        className={`rounded-[16px] border px-4 py-3 text-sm ${
                          isDark
                            ? "border-white/10 bg-black/20 text-white/70"
                            : "border-black/10 bg-[#f6f6f2] text-[#1A2119]/70"
                        }`}
                      >
                        {quickSaleMessage}
                      </div>
                    ) : null}
                  </div>
                </AnalyticsCard>

                <AnalyticsCard
                  title="AI Recommendations"
                  subtitle="Intelligent operational suggestions"
                  isDark={isDark}
                >
                  <div className="space-y-4">
                    {(dashboardAI.recommendations || recommendationCards)
                      .length > 0 ? (
                      (dashboardAI.recommendations || recommendationCards).map(
                        (card, idx) => (
                          <div
                            key={idx}
                            className={`rounded-[20px] border p-4 ${getActionToneClasses(
                              card.color,
                              isDark,
                            )}`}
                          >
                            <div className="font-semibold text-lg">
                              {card.title}
                            </div>
                            <div
                              className={
                                isDark
                                  ? "mt-2 text-sm text-white/65"
                                  : "mt-2 text-sm text-[#1A2119]/65"
                              }
                            >
                              {card.detail}
                            </div>
                          </div>
                        ),
                      )
                    ) : (
                      <EmptyStateBlock
                        text="Recommendations will appear as operational data grows."
                        isDark={isDark}
                      />
                    )}
                  </div>
                </AnalyticsCard>
              </div>
            </div>

            <div className="mt-8 grid grid-cols-1 gap-6 xl:grid-cols-3 items-stretch">
              <AnalyticsCard
                title="Alert Distribution"
                subtitle="Low stock vs expiry vs waste"
                isDark={isDark}
              >
                <div className="h-[260px] min-w-0">
                  {[
                    { name: "Low Stock", value: alertItems.length },
                    { name: "Expiry", value: expiryItems.length },
                    { name: "Waste", value: wasteTransactions.length },
                  ].some((item) => item.value > 0) ? (
                    <ResponsiveContainer width="100%" height={340} minWidth={0} minHeight={280}>
                      <PieChart>
                        <Pie
                          data={[
                            { name: "Low Stock", value: alertItems.length },
                            { name: "Expiry", value: expiryItems.length },
                            { name: "Waste", value: wasteTransactions.length },
                          ]}
                          dataKey="value"
                          nameKey="name"
                          outerRadius={80}
                          label
                        >
                          {[0, 1, 2].map((index) => (
                            <Cell
                              key={index}
                              fill={chartColors[index % chartColors.length]}
                            />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <EmptyStateBlock
                      text="No alert distribution data yet."
                      isDark={isDark}
                    />
                  )}
                </div>
              </AnalyticsCard>

              <AnalyticsCard
                title="Top Menu Demand"
                subtitle="Best performing items"
                isDark={isDark}
              >
                <div className="space-y-4 min-h-[260px]">
                  {topSellingItems.length > 0 ? (
                    topSellingItems.map((item, idx) => (
                      <div
                        key={idx}
                        className={`rounded-[18px] border p-4 text-sm ${
                          isDark
                            ? "border-white/10 bg-black/20 text-white/65"
                            : "border-black/10 bg-[#f6f6f2] text-[#1A2119]/65"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span>{item.name}</span>
                          <span className="text-[#9ad17b] font-semibold">
                            {item.units} sold
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <EmptyStateBlock
                      text="No menu sales yet."
                      isDark={isDark}
                    />
                  )}
                </div>
              </AnalyticsCard>

              <AnalyticsCard
                title="Recent Sales Feed"
                subtitle="Latest live sales recorded"
                isDark={isDark}
              >
                <div className="space-y-4 min-h-[260px]">
                  {recentSalesPreview.length > 0 ? (
                    recentSalesPreview.map((sale) => (
                      <div
                        key={sale.id}
                        className={`rounded-[18px] border p-4 text-sm ${
                          isDark
                            ? "border-white/10 bg-black/20 text-white/65"
                            : "border-black/10 bg-[#f6f6f2] text-[#1A2119]/65"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span>{sale.menuItemName}</span>
                          <span className="text-[#9ad17b] font-semibold">
                            x{sale.quantitySold}
                          </span>
                        </div>
                        <p className="mt-1 opacity-70">
                          ₹{sale.totalAmount} •{" "}
                          {new Date(sale.createdAt).toLocaleDateString(
                            "en-GB",
                            {
                              day: "2-digit",
                              month: "short",
                            },
                          )}
                        </p>
                      </div>
                    ))
                  ) : (
                    <EmptyStateBlock
                      text="No recent sales yet."
                      isDark={isDark}
                    />
                  )}
                </div>
              </AnalyticsCard>
            </div>
            {renderSmartOpsPanel()}
            {renderIntelligenceHealthNotice()}
          </>
        );

      case "Inventory":
        return renderInventoryDashboardContent();

      case "Decision Intelligence":
        return renderDecisionIntelligenceContent();
      case "Action Center":
        return renderActionCenterContent();
      case "Expiry Monitor":
        return renderExpiryMonitorContent();

      case "Low Stock Alerts":
        return renderLowStockContent();

      case "Demand Forecasting":
        return renderDemandForecastingContent();

      case "Waste Analytics":
        return renderWasteAnalyticsContent();

      case "Reorder Suggestions":
        return renderReorderSuggestionsContent();

      case "EOQ Calculator":
        return renderEOQCalculatorContent();

      case "Suppliers":
        return renderSuppliersContent();

      case "Reports":
        return <ReportsPage theme={theme} toggleTheme={toggleTheme} />;

      case "Settings":
        return renderSettingsContent();

      case "Boardroom Mode":
        return renderBoardroomContent();

      default:
        return null;
    }
  };

  return (
    <div
      className={
        isDark
          ? "bizlift-advanced-page bizlift-dashboard-page min-h-screen bg-black text-white"
          : "bizlift-advanced-page bizlift-dashboard-page min-h-screen bg-[#f6f6f2] text-[#1A2119]"
      }
    >
      <ExperienceLayer variant="dashboard" />
      <div className="relative z-10 px-6 pt-6 md:px-10 lg:px-14"><IntelligenceRibbon label="COMMAND CENTER" value="AI signals · inventory · demand · waste" /></div>

      <header className="px-6 pt-8 md:px-10 lg:px-14">
        <div
          className={`mx-auto flex max-w-7xl items-center justify-between gap-3 overflow-x-auto rounded-[20px] border px-5 py-4 shadow-lg backdrop-blur-xl ${
            isDark
              ? "border-white/10 bg-white/[0.03] shadow-[0_0_24px_rgba(255,255,255,0.02)]"
              : "border-black/10 bg-white/80"
          }`}
        >
          <div className="flex shrink-0 items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-white/10 shadow">
              <img
                src={logoImage}
                alt="BizLift logo"
                className="h-full w-full object-cover animate-spin"
                style={{ animationDuration: "18s" }}
              />
            </div>

            <div>
              <p
                className={
                  isDark
                    ? "font-semibold text-white text-lg"
                    : "font-semibold text-[#1A2119] text-lg"
                }
              >
                BizLift
              </p>
              <p
                className={
                  isDark ? "text-xs text-white/40" : "text-xs text-[#1A2119]/40"
                }
              >
                Vendor Workspace
              </p>
            </div>
          </div>

          <div className="flex min-w-max shrink-0 flex-nowrap items-center gap-2">
            <div className="flex shrink-0 items-center gap-2">
              <div
                className={`shrink-0 rounded-[10px] px-3 py-2 text-sm font-semibold whitespace-nowrap ${
                  isDark
                    ? "bg-white/10 text-white"
                    : "bg-[#eceee8] text-[#1A2119]"
                }`}
              >
                {currentDay}
                <span className="ml-1 text-[#9ad17b]">▲</span>
              </div>

              <div
                className={`shrink-0 rounded-[10px] px-3 py-2 text-sm font-semibold whitespace-nowrap ${
                  isDark
                    ? "bg-white/10 text-white"
                    : "bg-[#eceee8] text-[#1A2119]"
                }`}
              >
                {currentMonth}
                <span className="ml-1 text-[#9ad17b]">▲</span>
              </div>

              <div
                className={`shrink-0 rounded-[10px] px-3 py-2 text-sm font-semibold whitespace-nowrap ${
                  isDark
                    ? "bg-white/10 text-white"
                    : "bg-[#eceee8] text-[#1A2119]"
                }`}
              >
                {currentYear}
                <span className="ml-1 text-[#9ad17b]">▲</span>
              </div>
            </div>

            <button
              onClick={handleExportWorkspacePack}
              className={`shrink-0 whitespace-nowrap rounded-[12px] px-4 py-2.5 text-sm font-semibold transition hover:-translate-y-0.5 ${
                isDark ? "bg-[#9ad17b] text-black" : "bg-[#1A2119] text-white"
              }`}
            >
              Download Report
            </button>

            <Link
              to="/pos"
              className={`shrink-0 whitespace-nowrap rounded-[12px] border px-4 py-2.5 text-sm font-semibold transition hover:-translate-y-0.5 ${
                isDark ? "border-white/10 bg-white/5 text-white hover:bg-white/10" : "border-black/10 bg-white text-[#1A2119] hover:bg-[#f1f3ed]"
              }`}
            >
              Open POS & Billing
            </Link>
            <Link
              to="/inventory"
              className="inline-block shrink-0 whitespace-nowrap rounded-[12px] px-4 py-2.5 font-semibold text-black transition hover:-translate-y-0.5"
              style={{ backgroundColor: "#9ad17b" }}
            >
              Go to Inventory
            </Link>

            {toggleTheme && (
              <button
                onClick={toggleTheme}
                className={`shrink-0 whitespace-nowrap rounded-[12px] px-3.5 py-2.5 text-sm font-medium transition ${
                  isDark
                    ? "border border-white/20 bg-white text-black"
                    : "border border-black/15 bg-black text-white"
                }`}
              >
                {isDark ? "Light" : "Dark"}
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="mt-10 flex gap-6 px-6 md:px-10 lg:px-14 items-start">
        <aside
          className={`sticky top-8 self-start transition-all duration-300 ${
            showExpandedSidebar ? "w-[260px]" : "w-[92px]"
          }`}
        >
          <div
            className={`rounded-[26px] border p-4 md:p-5 backdrop-blur-sm transition-all duration-300 ${
              isDark
                ? "border-white/10 bg-white/[0.03]"
                : "border-black/10 bg-white/80"
            }`}
          >
            <div
              className={`flex items-center ${
                showExpandedSidebar ? "justify-between" : "justify-center"
              }`}
            >
              {showExpandedSidebar ? (
                <p className="text-xs uppercase tracking-[0.2em] text-[#9ad17b]">
                  Navigation
                </p>
              ) : null}

              <button
                onClick={() => setIsSidebarCollapsed((prev) => !prev)}
                className={`rounded-[12px] px-3 py-2 text-xs font-semibold transition ${
                  isDark
                    ? "bg-white/10 text-white hover:bg-white/15"
                    : "bg-[#eef1e8] text-[#1A2119] hover:bg-[#e4e8de]"
                }`}
                title={
                  showExpandedSidebar ? "Collapse sidebar" : "Expand sidebar"
                }
              >
                {showExpandedSidebar ? "Collapse" : "Expand"}
              </button>
            </div>

            <nav className="mt-5 space-y-2">
              {sidebarItems.map((item) => (
                <button
                  key={item.key}
                  onClick={() => setActivePage(item.key)}
                  className={`w-full flex items-center ${
                    showExpandedSidebar
                      ? "justify-start gap-3 px-5"
                      : "justify-center px-0"
                  } rounded-[16px] py-3.5 text-left text-[15px] transition ${
                    activePage === item.key
                      ? "bg-[#9ad17b] font-semibold text-black shadow-[0_0_18px_rgba(154,209,123,0.22)]"
                      : isDark
                        ? "text-white/75 hover:bg-white/5 hover:text-white"
                        : "text-[#1A2119]/75 hover:bg-[#eef1e8] hover:text-[#1A2119]"
                  }`}
                  title={item.key}
                >
                  <span
                    className={`w-5 text-center ${
                      activePage === item.key ? "text-black" : "text-[#9ad17b]"
                    }`}
                  >
                    {item.icon}
                  </span>
                  {showExpandedSidebar ? <span>{item.key}</span> : null}
                </button>
              ))}
            </nav>
          </div>
        </aside>

        <main className="flex-1 min-w-0 pb-12">
          <div className="mb-8 flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <h1
                className={
                  isDark
                    ? "text-4xl font-semibold text-white tracking-tight"
                    : "text-4xl font-semibold text-[#1A2119] tracking-tight"
                }
              >
                {activePage}
              </h1>
              <p
                className={
                  isDark ? "mt-2 text-white/55" : "mt-2 text-[#1A2119]/55"
                }
              >
                {pageMeta[activePage]?.subtitle ||
                  `${vendorData.vendor} • ${vendorData.office}`}
              </p>
              <p
                className={
                  isDark
                    ? "mt-2 text-sm text-white/35 font-medium"
                    : "mt-2 text-sm text-[#1A2119]/35 font-medium"
                }
              >
                {vendorKey} • {officeKey}
              </p>
            </div>

            <div className="pt-1 text-right">
              <p
                className={`text-3xl font-semibold italic leading-none md:text-4xl ${
                  isDark ? "text-white" : "text-[#1A2119]"
                }`}
              >
                {greeting}
              </p>
              <p className="mt-2 text-sm text-[#9ad17b]">
                Ready to review today’s operations
              </p>
            </div>
          </div>

          {renderContent()}
        </main>
      </div>
    </div>
  );
}

export default DashboardPage;
