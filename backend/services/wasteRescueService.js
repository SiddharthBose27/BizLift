/** Waste Rescue Engine: converts near-expiry stock into actionable menu rescue plans. */
const n = (v) => Number.isFinite(Number(v)) ? Number(v) : 0;
const round = (v) => Number(n(v).toFixed(2));
const DAY = 86400000;

export const buildWasteRescuePlans = ({ inventory = [], recipes = [], sales = [], now = new Date() }) => {
  const itemMap = new Map(inventory.map(i => [String(i.id), i]));
  const units = new Map();
  for (const s of sales) {
    const at = new Date(s.createdAt || s.date || 0).getTime();
    if (at < now.getTime() - 30 * DAY) continue;
    const id = String(s.recipeId);
    units.set(id, (units.get(id) || 0) + n(s.quantitySold ?? s.quantity));
  }

  const plans = [];
  for (const item of inventory) {
    if (!item.expiryDate) continue;
    const daysRemaining = Math.ceil((new Date(item.expiryDate).getTime() - now.getTime()) / DAY);
    const stock = n(item.currentStock);
    const value = stock * n(item.costPrice);
    if (stock <= 0 || daysRemaining < 0 || daysRemaining > 5 || value <= 0) continue;

    const linked = recipes.filter(r => (r.ingredients || []).some(i => String(i.inventoryItemId) === String(item.id)));
    const menuOptions = linked.map(r => {
      const req = (r.ingredients || []).filter(i => String(i.inventoryItemId) === String(item.id)).reduce((s, i) => s + n(i.quantity), 0);
      const maxUnits = req > 0 ? Math.floor(stock / req) : 0;
      const recentUnits = n(units.get(String(r.id))) / 30 * Math.max(1, daysRemaining);
      const suggestedUnits = Math.min(maxUnits, Math.max(1, Math.ceil(recentUnits)));
      return {
        recipeId: r.id,
        menuItemName: r.menuItemName,
        unitsPossible: maxUnits,
        suggestedUnits,
        ingredientPerUnit: round(req),
        sellingPrice: round(r.sellingPrice),
        estimatedRevenue: round(suggestedUnits * n(r.sellingPrice)),
      };
    }).filter(x => x.unitsPossible > 0).sort((a,b) => b.estimatedRevenue - a.estimatedRevenue);

    const best = menuOptions[0];
    plans.push({
      id: `rescue-${item.id}`,
      inventoryItemId: item.id,
      itemName: item.itemName,
      unit: item.unit || '',
      daysRemaining,
      currentStock: round(stock),
      inventoryValueAtRisk: round(value),
      rescueableUnits: best?.unitsPossible || 0,
      recommendedUnits: best?.suggestedUnits || 0,
      recommendedMenuItem: best?.menuItemName || null,
      estimatedRevenueRecovered: best?.estimatedRevenue || 0,
      estimatedValueSaved: round(Math.min(value, value * (daysRemaining <= 1 ? 1 : 0.75))),
      menuOptions: menuOptions.slice(0, 5),
      status: menuOptions.length ? 'Actionable' : 'No linked rescue menu',
      nextAction: best ? `Prioritize ${best.suggestedUnits} × ${best.menuItemName} before ${daysRemaining <= 0 ? 'expiry' : `${daysRemaining} day(s)`}.` : 'Review the ingredient for alternate use or controlled disposal.',
    });
  }
  return plans.sort((a,b) => b.inventoryValueAtRisk - a.inventoryValueAtRisk);
};

export const buildWasteRescueSummary = (plans = []) => ({
  plans: plans.length,
  actionablePlans: plans.filter(x => x.status === 'Actionable').length,
  valueAtRisk: round(plans.reduce((s,x) => s + n(x.inventoryValueAtRisk), 0)),
  estimatedRecoverableValue: round(plans.reduce((s,x) => s + n(x.estimatedValueSaved), 0)),
  revenueOpportunity: round(plans.reduce((s,x) => s + n(x.estimatedRevenueRecovered), 0)),
});
