import { buildProcurementIntelligence } from "../services/procurementIntelligence.js";
import { getRolePermissions, hasPermission } from "../services/authService.js";

const inventory = [
  { id: "i1", itemName: "Potato", supplier: "Fresh Farm", unit: "kg", currentStock: 2, minThreshold: 10, costPrice: 40 },
  { id: "i2", itemName: "Oil", supplier: "Fresh Farm", unit: "L", currentStock: 30, minThreshold: 20, costPrice: 120 },
];
const rows = [{ itemId: "i1", itemName: "Potato", supplier: "Fresh Farm", currentStock: 2, minThreshold: 10, avgDailyUsage: 4, costPrice: 40, recommendedOrderQty: 20, procurementPriority: "Critical", reorderNeeded: true }];
const result = buildProcurementIntelligence({ inventory, purchaseOrders: [], suppliers: [{ name: "Fresh Farm", lead_time_days: 2, on_time_rate: 0.95 }], procurementRows: rows });
if (!result.recommendations.length || result.recommendations[0].purchaseDecision !== "Buy now") throw new Error("Procurement recommendation contract failed");
if (!hasPermission("manager", "procurement:write")) throw new Error("Manager procurement permission missing");
if (hasPermission("analyst", "procurement:write")) throw new Error("Analyst incorrectly has procurement write permission");
if (!getRolePermissions("viewer").includes("procurement:read")) throw new Error("Viewer procurement read permission missing");
console.log("Procurement platform smoke test passed:", JSON.stringify({ recommendations: result.recommendations.length, decision: result.recommendations[0].purchaseDecision, supplierRisk: result.recommendations[0].supplierRisk }));
