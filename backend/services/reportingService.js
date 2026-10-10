import { buildDecisionIntelligence } from './decisionIntelligence.js';

const num = (v) => Number.isFinite(Number(v)) ? Number(v) : 0;
const within = (value, start) => {
  const t = new Date(value || 0).getTime();
  return Number.isFinite(t) && t >= start;
};

export const buildOperationsReport = ({ inventory = [], recipes = [], sales = [], wasteEvents = [], purchaseOrders = [], inventoryTransactions = [], suppliers = [], days = 30, now = new Date() }) => {
  const safeDays = Math.min(90, Math.max(7, Number(days) || 30));
  const start = new Date(now).getTime() - safeDays * 86400000;
  const recentSales = sales.filter(s => within(s.createdAt || s.saleDate || s.date, start));
  const recentWaste = wasteEvents.filter(w => within(w.createdAt || w.date, start));
  const recentPOs = purchaseOrders.filter(p => within(p.createdAt || p.orderDate || p.date, start));
  const revenue = recentSales.reduce((sum, s) => sum + num(s.grandTotal ?? s.totalAmount ?? s.total ?? s.sellingPrice) * (num(s.quantity) || 1), 0);
  const units = recentSales.reduce((sum, s) => sum + (num(s.quantity) || 1), 0);
  const wasteCost = recentWaste.reduce((sum, w) => sum + num(w.cost ?? w.estimatedCost ?? w.totalCost ?? w.value), 0);
  const procurementSpend = recentPOs.reduce((sum, p) => sum + num(p.totalAmount ?? p.totalCost ?? p.estimatedCost), 0);
  const inventoryValue = inventory.reduce((sum, i) => sum + num(i.currentStock) * num(i.costPrice), 0);
  const lowStock = inventory.filter(i => num(i.currentStock) <= num(i.minThreshold)).length;
  const outOfStock = inventory.filter(i => num(i.currentStock) <= 0).length;
  const cancelled = recentSales.filter(s => String(s.status || '').toLowerCase() === 'cancelled').length;
  const daily = Array.from({ length: safeDays }, (_, idx) => {
    const d = new Date(start + idx * 86400000); const key = d.toISOString().slice(0,10);
    const rows = recentSales.filter(s => String(s.createdAt || s.saleDate || s.date || '').slice(0,10) === key);
    return { date:key, revenue:Math.round(rows.reduce((sum,s)=>sum+num(s.grandTotal ?? s.totalAmount ?? s.total ?? s.sellingPrice)*(num(s.quantity)||1),0)), orders:rows.length };
  });
  const topMenu = {};
  const hourly = Array.from({ length: 24 }, (_, hour) => ({ hour, orders: 0, units: 0 }));
  const categoryRevenue = {};
  recentSales.forEach(s => {
    const key=s.menuItemName || s.recipeName || s.itemName || s.recipeId || 'Unknown';
    topMenu[key]=(topMenu[key]||0)+(num(s.quantity)||1);
    const dt = new Date(s.createdAt || s.saleDate || s.date || 0);
    if (Number.isFinite(dt.getTime())) { hourly[dt.getHours()].orders += 1; hourly[dt.getHours()].units += (num(s.quantity)||1); }
    const category = s.category || s.menuCategory || 'Other';
    categoryRevenue[category]=(categoryRevenue[category]||0)+num(s.grandTotal ?? s.totalAmount ?? s.total ?? s.sellingPrice);
  });
  const wasteByReason = {};
  recentWaste.forEach(w => { const key=w.reason || 'Other'; wasteByReason[key]=(wasteByReason[key]||0)+num(w.cost ?? w.estimatedCost ?? w.totalCost ?? w.value); });
  const decision = buildDecisionIntelligence({ inventory, recipes, sales, wasteEvents, suppliers, now });
  return {
    periodDays:safeDays, from:new Date(start).toISOString(), to:new Date(now).toISOString(),
    kpis:{ revenue:Math.round(revenue), orders:recentSales.length, units, averageOrderValue:recentSales.length ? Math.round(revenue/recentSales.length) : 0, wasteCost:Math.round(wasteCost), procurementSpend:Math.round(procurementSpend), inventoryValue:Math.round(inventoryValue), lowStock, outOfStock, cancelled, transactionCount:inventoryTransactions.filter(t=>within(t.createdAt||t.timestamp||t.date,start)).length },
    daily,
    topMenu:Object.entries(topMenu).sort((a,b)=>b[1]-a[1]).slice(0,10).map(([menuItem,units])=>({menuItem,units})),
    wasteByReason:Object.entries(wasteByReason).sort((a,b)=>b[1]-a[1]).map(([reason,cost])=>({reason,cost:Math.round(cost)})),
    hourlyDemand:hourly,
    revenueByCategory:Object.entries(categoryRevenue).sort((a,b)=>b[1]-a[1]).map(([category,revenue])=>({category,revenue:Math.round(revenue)})),
    intelligence:{ actions:(decision.actions||[]).slice(0,10), menu86:(decision.menuAvailability||[]).filter(x=>x.status==='86').length, expiryRescue:(decision.expiryRescue||[]).length },
  };
};
