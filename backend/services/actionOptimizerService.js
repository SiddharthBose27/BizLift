/** BizLift Action Optimizer: rank explainable actions and quantify their estimated value. */
const n = (v) => Number.isFinite(Number(v)) ? Number(v) : 0;
const round = (v) => Number(n(v).toFixed(2));
const DAY = 86400000;

export const buildActionOptimizer = ({ inventory = [], recipes = [], sales = [], wasteEvents = [], purchaseOrders = [], suppliers = [], now = new Date(), moneyLeaks = {}, wasteRescue = [] }) => {
  const actions = [];
  const itemMap = new Map(inventory.map(i => [String(i.id), i]));
  const recentSales = sales.filter(s => new Date(s.createdAt || 0).getTime() >= now.getTime() - 30 * DAY);
  const units = new Map();
  recentSales.forEach(s => units.set(String(s.recipeId), (units.get(String(s.recipeId)) || 0) + n(s.quantitySold ?? s.quantity)));

  // Reorder: only recommend items that are actually exposed, with supplier-aware cost.
  for (const item of inventory) {
    const stock = n(item.currentStock);
    if (stock > n(item.minThreshold) && stock > 0) continue;
    const linked = recipes.filter(r => (r.ingredients || []).some(i => String(i.inventoryItemId) === String(item.id)));
    const dailyUnits = linked.reduce((sum, r) => sum + n(units.get(String(r.id))) / 30, 0);
    if (dailyUnits <= 0 && stock > 0) continue;
    const supplier = suppliers.find(s => String(s.supplier_name || s.name || s.supplier || '').toLowerCase() === String(item.supplier || '').toLowerCase());
    const lead = Math.max(1, n(supplier?.lead_time_days || 3));
    const qty = Math.max(1, Math.ceil(Math.max(n(item.minThreshold) - stock, dailyUnits * Math.max(lead + 2, 3) - stock)));
    const cost = qty * n(item.costPrice);
    const dailyRevenueRisk = linked.reduce((sum, r) => sum + (n(units.get(String(r.id))) / 30) * n(r.sellingPrice), 0);
    const avoidedRisk = dailyRevenueRisk * Math.min(7, Math.max(1, lead));
    actions.push({
      id: `opt-reorder-${item.id}`, type: 'reorder', priority: avoidedRisk >= 1000 ? 'Critical' : avoidedRisk >= 400 ? 'High' : 'Medium',
      title: `Reorder ${item.itemName}`, reason: `${item.itemName} has ${round(stock)} ${item.unit || 'units'} and supports ${linked.length} menu item(s).`,
      nextAction: `Order ${qty} ${item.unit || 'units'} from ${item.supplier || 'the preferred supplier'}.`,
      estimatedCost: round(cost), estimatedBenefit: round(avoidedRisk), expectedNetBenefit: round(avoidedRisk - cost),
      confidence: avoidedRisk > 0 ? 'High' : 'Medium', target: { itemId: item.id, itemName: item.itemName, quantity: qty, unit: item.unit || '', costPrice: n(item.costPrice), leadTimeDays: lead, supplier: item.supplier || '' },
      approval: 'Creates a purchase order only after human approval.'
    });
  }

  // Rescue actions come directly from the dedicated rescue engine.
  for (const plan of wasteRescue.filter(x => x.status === 'Actionable').slice(0, 8)) {
    actions.push({
      id: `opt-rescue-${plan.inventoryItemId}`, type: 'waste_rescue', priority: plan.daysRemaining <= 1 ? 'Critical' : 'High',
      title: `Rescue ${plan.itemName}`, reason: `${round(plan.currentStock)} ${plan.unit} worth about ₹${round(plan.inventoryValueAtRisk)} is nearing expiry.`,
      nextAction: plan.nextAction, estimatedCost: 0, estimatedBenefit: round(plan.estimatedValueSaved), expectedNetBenefit: round(plan.estimatedValueSaved),
      confidence: plan.recommendedMenuItem ? 'High' : 'Medium', target: plan, approval: 'Approval records the rescue plan; actual stock is consumed only through a real POS sale.'
    });
  }

  // Margin actions: estimate upside from a modest 5% price review, without changing price automatically.
  for (const r of recipes) {
    const sold = n(units.get(String(r.id)));
    if (!sold) continue;
    const foodCost = (r.ingredients || []).reduce((s, ing) => s + n(ing.quantity) * n(itemMap.get(String(ing.inventoryItemId))?.costPrice), 0);
    const price = n(r.sellingPrice);
    const margin = price ? (price - foodCost) / price : 0;
    if (price > 0 && margin < 0.25) {
      const uplift = sold * 0.05 * price;
      actions.push({
        id: `opt-price-${r.id}`, type: 'price_review', priority: margin < 0.1 ? 'High' : 'Medium',
        title: `Review price of ${r.menuItemName}`, reason: `Estimated food cost is ₹${round(foodCost)} against ₹${round(price)} (${round(margin * 100)}% contribution before overhead).`,
        nextAction: 'Test a small price increase or reformulate the recipe; do not auto-change the live price.', estimatedCost: 0,
        estimatedBenefit: round(uplift), expectedNetBenefit: round(uplift), confidence: 'Medium', target: { recipeId: r.id, menuItemName: r.menuItemName, currentPrice: price, estimated5PctUplift: round(uplift) }, approval: 'Human review required before any price change.'
      });
    }
  }

  const sorted = actions.sort((a,b) => b.expectedNetBenefit - a.expectedNetBenefit || (a.priority === 'Critical' ? -1 : 1));
  return {
    generatedAt: now.toISOString(), actions: sorted.slice(0, 12),
    summary: {
      actions: sorted.length,
      critical: sorted.filter(x => x.priority === 'Critical').length,
      estimatedBenefit: round(sorted.reduce((s,x) => s + n(x.estimatedBenefit), 0)),
      estimatedNetBenefit: round(sorted.reduce((s,x) => s + n(x.expectedNetBenefit), 0)),
      topAction: sorted[0] || null,
    },
    methodology: 'Rank = estimated avoidable loss/opportunity minus direct action cost. Estimates use only current workspace sales, recipes, inventory, suppliers and waste data.'
  };
};
