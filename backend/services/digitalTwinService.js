/**
 * BizLift Digital Twin — deterministic scenario simulator.
 * Uses only the current workspace's recipes, sales and inventory truth.
 * Nothing is written to operational data: scenarios are simulations until a human acts.
 */
const n = (v) => Number.isFinite(Number(v)) ? Number(v) : 0;
const round = (v) => Number(n(v).toFixed(2));
const DAY = 86400000;

const salesUnits = (sales, since) => {
  const map = new Map();
  for (const s of sales) {
    const at = new Date(s.createdAt || s.date || 0).getTime();
    if (since && at < since) continue;
    const id = String(s.recipeId);
    map.set(id, (map.get(id) || 0) + n(s.quantitySold ?? s.quantity));
  }
  return map;
};

export const simulateDigitalTwin = ({ inventory = [], recipes = [], sales = [], wasteEvents = [], scenario = {}, now = new Date() }) => {
  const demandPct = Math.max(-80, Math.min(300, n(scenario.demandPct ?? 20)));
  const factor = 1 + demandPct / 100;
  const horizonDays = Math.max(1, Math.min(30, n(scenario.horizonDays ?? 7)));
  const since = now.getTime() - 30 * DAY;
  const units = salesUnits(sales, since);
  const itemMap = new Map(inventory.map(i => [String(i.id), i]));
  const priceChanges = scenario.priceChanges && typeof scenario.priceChanges === 'object' ? scenario.priceChanges : {};
  const reorderChoices = scenario.reorderChoices && typeof scenario.reorderChoices === 'object' ? scenario.reorderChoices : {};

  const menu = recipes.map(r => {
    const observed = units.get(String(r.id)) || 0;
    const projectedUnits = observed / 30 * horizonDays * factor;
    const basePrice = n(r.sellingPrice);
    const pricePct = n(priceChanges[r.id]);
    const price = basePrice * (1 + pricePct / 100);
    const foodCost = (r.ingredients || []).reduce((sum, ing) => sum + n(ing.quantity) * n(itemMap.get(String(ing.inventoryItemId))?.costPrice), 0);
    return { recipeId:r.id, menuItemName:r.menuItemName, observed30dUnits:round(observed), projectedUnits:round(projectedUnits), price:round(price), foodCostPerUnit:round(foodCost), revenue:round(projectedUnits * price), ingredientCost:round(projectedUnits * foodCost) };
  });

  const ingredient = inventory.map(item => {
    const linked = recipes.filter(r => (r.ingredients || []).some(i => String(i.inventoryItemId) === String(item.id)));
    const projectedUsage = linked.reduce((sum, r) => {
      const m = menu.find(x => String(x.recipeId) === String(r.id));
      const qty = (r.ingredients || []).filter(i => String(i.inventoryItemId) === String(item.id)).reduce((a,i)=>a+n(i.quantity),0);
      return sum + n(m?.projectedUnits) * qty;
    }, 0);
    const choice = reorderChoices[item.id] === true || reorderChoices[item.id] === 'true';
    const reorderQty = choice ? Math.max(0, n(scenario.reorderQuantities?.[item.id] ?? Math.ceil(projectedUsage - n(item.currentStock)))) : 0;
    const postReorder = n(item.currentStock) + reorderQty;
    const stockout = postReorder < projectedUsage;
    const procurementCost = reorderQty * n(item.costPrice);
    return { inventoryItemId:item.id, itemName:item.itemName, unit:item.unit, currentStock:round(item.currentStock), projectedUsage:round(projectedUsage), reorderSelected:choice, reorderQty:round(reorderQty), procurementCost:round(procurementCost), endingStock:round(postReorder - projectedUsage), stockout };
  }).filter(x => x.projectedUsage > 0);

  const blockedMenus = menu.filter(m => ingredient.some(i => i.stockout && recipes.find(r=>String(r.id)===String(m.recipeId))?.ingredients?.some(ing=>String(ing.inventoryItemId)===String(i.inventoryItemId))));
  const realizedRevenue = menu.filter(m => !blockedMenus.some(b=>String(b.recipeId)===String(m.recipeId))).reduce((s,m)=>s+m.revenue,0);
  const projectedRevenue = menu.reduce((s,m)=>s+m.revenue,0);
  const ingredientCost = ingredient.reduce((s,i)=>s+i.procurementCost,0) + menu.reduce((s,m)=>s+m.ingredientCost,0);
  const scaleToHorizon = horizonDays / 30;
  const wasteExposure = wasteEvents.filter(w => new Date(w.createdAt || 0).getTime() >= since).reduce((s,w)=>s+n(w.wasteCost ?? n(w.quantity)*n(w.unitCost)),0) * scaleToHorizon * factor;
  const baselineRevenue30 = sales.filter(s=>new Date(s.createdAt||0).getTime()>=since).reduce((sum,s)=>sum+n(s.subtotal ?? s.totalAmount ?? s.sellingPrice*n(s.quantitySold??s.quantity)),0);
  const baselineCost30 = sales.filter(s=>new Date(s.createdAt||0).getTime()>=since).reduce((sum,s)=>sum+(s.deductions||[]).reduce((a,d)=>a+n(d.deductedQuantity)*n(itemMap.get(String(d.inventoryItemId))?.costPrice),0),0);
  const baselineWaste30 = wasteEvents.filter(w=>new Date(w.createdAt||0).getTime()>=since).reduce((s,w)=>s+n(w.wasteCost ?? n(w.quantity)*n(w.unitCost)),0);
  const baselineRevenue = baselineRevenue30 * scaleToHorizon;
  const baselineCost = baselineCost30 * scaleToHorizon;
  const baselineWaste = baselineWaste30 * scaleToHorizon;
  const baselineProfitProxy = baselineRevenue - baselineCost - baselineWaste;
  const scenarioProfitProxy = realizedRevenue - ingredientCost - wasteExposure;

  return {
    scenario:{ demandPct, horizonDays, priceChanges, reorderChoices },
    baseline:{ revenue:round(baselineRevenue), ingredientCost:round(baselineCost), wasteCost:round(baselineWaste), profitProxy:round(baselineProfitProxy) },
    scenarioResult:{ projectedRevenue:round(projectedRevenue), realizableRevenue:round(realizedRevenue), ingredientCost:round(ingredientCost), wasteExposure:round(wasteExposure), profitProxy:round(scenarioProfitProxy), netImpactVsBaseline:round(scenarioProfitProxy-baselineProfitProxy), stockouts:ingredient.filter(i=>i.stockout).length, blockedMenuItems:blockedMenus.length, procurementCost:round(ingredient.reduce((s,i)=>s+i.procurementCost,0)) },
    ingredients:ingredient.sort((a,b)=>Number(b.stockout)-Number(a.stockout)||b.projectedUsage-a.projectedUsage).slice(0,20),
    menu:menu.sort((a,b)=>b.revenue-a.revenue).slice(0,15),
    warnings:[
      ...ingredient.filter(i=>i.stockout).slice(0,6).map(i=>`${i.itemName} becomes a stockout under this scenario.`),
      ...(blockedMenus.length ? [`${blockedMenus.length} menu item(s) lose availability because of ingredient pressure.`] : []),
    ],
    explainability:[
      `Demand is scaled by ${demandPct}% over a ${horizonDays}-day horizon using the workspace's last 30 days of sales.`,
      `Recipe quantities are multiplied by projected units to estimate ingredient consumption.`,
      `Selected reorder quantities are added only inside the simulation; no inventory or purchase order is changed.`,
    ]
  };
};

export const buildDigitalTwinComparison = (args) => {
  const scenarios = [0, 10, 20, 50].map(pct => simulateDigitalTwin({...args, scenario:{...(args.scenario||{}), demandPct:pct}}));
  return scenarios.map(x => ({ demandPct:x.scenario.demandPct, projectedRevenue:x.scenarioResult.projectedRevenue, realizableRevenue:x.scenarioResult.realizableRevenue, profitProxy:x.scenarioResult.profitProxy, netImpactVsBaseline:x.scenarioResult.netImpactVsBaseline, stockouts:x.scenarioResult.stockouts, blockedMenuItems:x.scenarioResult.blockedMenuItems, procurementCost:x.scenarioResult.procurementCost }));
};
