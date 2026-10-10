/**
 * BizLift Decision Intelligence
 * Canonical workspace-level decision layer: sales -> recipes -> ingredients -> inventory -> action.
 */
const n = (v) => Number.isFinite(Number(v)) ? Number(v) : 0;
const round = (v) => Number(n(v).toFixed(2));

const buildSalesUnits = (sales = []) => {
  const map = new Map();
  for (const sale of sales) {
    const key = String(sale.recipeId);
    map.set(key, (map.get(key) || 0) + n(sale.quantitySold ?? sale.quantity));
  }
  return map;
};

export const buildDecisionIntelligence = ({ inventory = [], recipes = [], sales = [], wasteEvents = [], suppliers = [], now = new Date() }) => {
  const salesUnits = buildSalesUnits(sales);
  const itemMap = new Map(inventory.map(i => [String(i.id), i]));
  const recipeMap = new Map(recipes.map(r => [String(r.id), r]));
  const recipeSales = recipes.map(recipe => ({ recipe, units: salesUnits.get(String(recipe.id)) || 0 }));

  const menuProfitability = recipeSales.map(({ recipe, units }) => {
    const foodCost = (recipe.ingredients || []).reduce((sum, ing) => sum + n(ing.quantity) * n(itemMap.get(String(ing.inventoryItemId))?.costPrice), 0);
    const price = n(recipe.sellingPrice);
    const revenue = units * price;
    const margin = Math.max(0, price - foodCost);
    const marginPct = price > 0 ? margin / price * 100 : 0;
    const blockedIngredients = (recipe.ingredients || []).filter(ing => n(itemMap.get(String(ing.inventoryItemId))?.currentStock) <= n(itemMap.get(String(ing.inventoryItemId))?.minThreshold)).map(ing => ing.itemName || itemMap.get(String(ing.inventoryItemId))?.itemName).filter(Boolean);
    return { recipeId: recipe.id, menuItemName: recipe.menuItemName, unitsSold: round(units), sellingPrice: round(price), foodCost: round(foodCost), revenue: round(revenue), margin: round(margin * units), marginPct: round(marginPct), blockedIngredients };
  }).sort((a,b)=>b.marginPct-a.marginPct);

  const dependency = inventory.map(item => {
    const affected = menuProfitability.filter(m => m.blockedIngredients.includes(item.itemName));
    const linkedRecipes = recipes.filter(r => (r.ingredients || []).some(i => String(i.inventoryItemId) === String(item.id)));
    const avgDailyUnits = affected.reduce((s,m)=>s+m.unitsSold,0) / 30;
    const revenueAtRisk = linkedRecipes.reduce((s,r)=>s + (salesUnits.get(String(r.id)) || 0) / 30 * n(r.sellingPrice), 0);
    return { inventoryItemId:item.id, itemName:item.itemName, currentStock:round(item.currentStock), linkedMenuCount:linkedRecipes.length, affectedMenuItems:linkedRecipes.map(r=>r.menuItemName), estimatedDailyRevenueAtRisk:round(revenueAtRisk), riskScore:round(revenueAtRisk * (n(item.currentStock) <= 0 ? 1 : 0.5)) };
  }).filter(x=>x.linkedMenuCount).sort((a,b)=>b.riskScore-a.riskScore).slice(0,10);

  const expiryRescue = inventory.map(item => {
    if (!item.expiryDate) return null;
    const days = Math.ceil((new Date(item.expiryDate).getTime() - now.getTime()) / 86400000);
    if (days < 0 || days > 3) return null;
    const recipesUsing = recipes.filter(r => (r.ingredients || []).some(i=>String(i.inventoryItemId)===String(item.id))).map(r=>r.menuItemName);
    const stockValue = n(item.currentStock) * n(item.costPrice);
    return { inventoryItemId:item.id, itemName:item.itemName, expiryDate:item.expiryDate, daysRemaining:days, currentStock:round(item.currentStock), estimatedValueAtRisk:round(stockValue), recommendedMenuItems:recipesUsing.slice(0,5) };
  }).filter(Boolean).sort((a,b)=>a.daysRemaining-b.daysRemaining);

  const promotions = menuProfitability.filter(m=>m.unitsSold>0).map(m=>({ ...m, recommendation: m.blockedIngredients.length ? 'protect_stock' : m.marginPct >= 55 ? 'promote' : m.marginPct < 30 ? 'review_price' : 'maintain', why: m.blockedIngredients.length ? `Ingredient pressure: ${m.blockedIngredients.join(', ')}` : m.marginPct >= 55 ? 'High estimated contribution margin with existing ingredient availability.' : m.marginPct < 30 ? 'Low contribution margin; review price or recipe cost.' : 'Balanced demand and margin.' })).sort((a,b)=>({promote:3,review_price:2,maintain:1,protect_stock:0}[b.recommendation]-({promote:3,review_price:2,maintain:1,protect_stock:0}[a.recommendation]))).slice(0,8);

  const reasonMap = new Map();
  const reasonEvents = new Map();
  for (const w of wasteEvents) {
    const reason=String(w.reason||'unspecified');
    const cost=n(w.wasteCost ?? n(w.quantity)*n(w.unitCost));
    reasonMap.set(reason,(reasonMap.get(reason)||0)+cost);
    reasonEvents.set(reason,(reasonEvents.get(reason)||0)+1);
  }
  const topWasteReason = [...reasonMap.entries()].sort((a,b)=>b[1]-a[1])[0];

  const prepPlan = menuProfitability.filter(m=>m.unitsSold>0).slice(0,8).map(m=>({ menuItemName:m.menuItemName, recent30dUnits:m.unitsSold, suggestedPrepUnits:Math.max(1,Math.ceil(m.unitsSold/30*1.08)), reason:'30-day demand velocity with an 8% operating buffer.' }));

  const popularityCut = menuProfitability.filter(m=>m.unitsSold>0).reduce((s,m)=>s+m.unitsSold,0) / Math.max(1, menuProfitability.filter(m=>m.unitsSold>0).length);
  const menuEngineering = menuProfitability.map(m => ({ ...m, class: m.unitsSold >= popularityCut && m.marginPct >= 50 ? 'star' : m.unitsSold < popularityCut && m.marginPct >= 50 ? 'puzzle' : m.unitsSold >= popularityCut ? 'plowhorse' : 'dog', action: m.marginPct < 30 ? 'review-price-or-recipe' : m.unitsSold < popularityCut ? 'test-promotion' : 'maintain' }));

  const whatIf = (demandIncreasePct = 20) => {
    const factor = 1 + demandIncreasePct / 100;
    const projectedRevenue = menuProfitability.reduce((sum,m)=>sum + m.revenue * factor,0);
    const extraIngredientCost = menuProfitability.reduce((sum,m)=>sum + m.foodCost * m.unitsSold * (factor-1),0);
    const atRiskItems = inventory.filter(item => {
      const linked = recipes.filter(r=>(r.ingredients||[]).some(i=>String(i.inventoryItemId)===String(item.id)));
      const required = linked.reduce((sum,r)=>sum + (salesUnits.get(String(r.id))||0)/30 * factor * (r.ingredients||[]).filter(i=>String(i.inventoryItemId)===String(item.id)).reduce((a,i)=>a+n(i.quantity),0),0);
      return n(item.currentStock) < required * 7;
    }).length;
    return { demandIncreasePct, projectedRevenue:round(projectedRevenue), incrementalIngredientCost:round(extraIngredientCost), atRiskInventoryItems:atRiskItems };
  };
  const whatIf20 = whatIf(20);
  const scenarios = [10, 20, 50].map(whatIf);

  // Recipe-level availability: a menu item is effectively "86" when any
  // required ingredient cannot support one additional unit. This keeps menu
  // availability tied to the same recipe/inventory truth as POS deduction.
  const menuAvailability = recipes.map(recipe => {
    const blockedIngredients = (recipe.ingredients || []).filter(ing => {
      const item = itemMap.get(String(ing.inventoryItemId));
      return !item || n(item.currentStock) < n(ing.quantity);
    }).map(ing => ing.itemName || itemMap.get(String(ing.inventoryItemId))?.itemName).filter(Boolean);
    return { recipeId: recipe.id, menuItemName: recipe.menuItemName, status: blockedIngredients.length ? '86' : 'Available', blockedIngredients };
  });

  // Smart reorder timing: prioritize items that will run out before their
  // estimated supplier lead time, not merely items below a static threshold.
  const reorderOptimizer = inventory.map(item => {
    const linked = recipes.filter(r => (r.ingredients || []).some(i => String(i.inventoryItemId) === String(item.id)));
    const dailyUnits = linked.reduce((sum, r) => sum + (salesUnits.get(String(r.id)) || 0), 0) / 30;
    const usagePerMenuUnit = linked.reduce((sum, r) => sum + (r.ingredients || []).filter(i => String(i.inventoryItemId) === String(item.id)).reduce((a, i) => a + n(i.quantity), 0), 0);
    const avgDailyUsage = dailyUnits > 0 ? dailyUnits * (usagePerMenuUnit / Math.max(1, linked.length)) : 0;
    const coverageDays = avgDailyUsage > 0 ? n(item.currentStock) / avgDailyUsage : null;
    const leadTimeDays = 3;
    const targetStock = avgDailyUsage > 0 ? Math.ceil(avgDailyUsage * (leadTimeDays + 7)) : Math.max(n(item.minThreshold), n(item.currentStock));
    const recommendedOrderQty = Math.max(0, Math.ceil(targetStock - n(item.currentStock)));
    let action = 'monitor';
    if (coverageDays !== null && coverageDays <= leadTimeDays) action = 'order_now';
    else if (n(item.currentStock) <= n(item.minThreshold) || (coverageDays !== null && coverageDays <= leadTimeDays + 3)) action = 'order_soon';
    return { inventoryItemId: item.id, itemName: item.itemName, unit: item.unit, currentStock: round(item.currentStock), avgDailyUsage: round(avgDailyUsage), coverageDays: coverageDays === null ? null : round(coverageDays), leadTimeDays, recommendedOrderQty, action };
  }).sort((a,b) => ({order_now:3,order_soon:2,monitor:1}[b.action] - {order_now:3,order_soon:2,monitor:1}[a.action]));

  const usageAudit = inventory.map(item => {
    const theoretical = recipes.reduce((sum,r)=>sum + (salesUnits.get(String(r.id))||0) * (r.ingredients||[]).filter(i=>String(i.inventoryItemId)===String(item.id)).reduce((a,i)=>a+n(i.quantity),0),0);
    const actual = sales.reduce((sum,sale)=>sum + (sale.deductions||[]).filter(d=>String(d.inventoryItemId)===String(item.id)).reduce((a,d)=>a+n(d.deductedQuantity),0),0);
    const variance = actual - theoretical;
    return { inventoryItemId:item.id, itemName:item.itemName, theoreticalUsage:round(theoretical), actualUsage:round(actual), variance:round(variance), variancePct:theoretical?round(variance/theoretical*100):0 };
  });
  const actualVsTheoretical = usageAudit.filter(x=>Math.abs(x.variance)>0.001).sort((a,b)=>Math.abs(b.variance)-Math.abs(a.variance)).slice(0,10);
  const usageIntegrity = {
    status: actualVsTheoretical.length ? 'Review variance' : 'Reconciled',
    trackedItems: usageAudit.filter(x=>x.theoreticalUsage>0 || x.actualUsage>0).length,
    varianceItems: actualVsTheoretical.length,
    theoreticalUnits: round(usageAudit.reduce((s,x)=>s+x.theoreticalUsage,0)),
    actualUnits: round(usageAudit.reduce((s,x)=>s+x.actualUsage,0)),
    absoluteVariance: round(usageAudit.reduce((s,x)=>s+Math.abs(x.variance),0)),
  };

  const supplierIntelligence = [...new Set(inventory.map(i=>i.supplier).filter(Boolean))].map(name => {
    const items=inventory.filter(i=>i.supplier===name);
    const risk=items.reduce((sum,i)=>sum + (n(i.currentStock)<=n(i.minThreshold)?2:0),0);
    return { supplier:name, linkedItems:items.length, atRiskItems:risk, dependencyScore:risk, operationalScore:Math.max(0,100-risk*8) };
  }).sort((a,b)=>b.atRiskItems-a.atRiskItems);

  const actions=[];
  dependency.filter(x=>x.riskScore>0).slice(0,3).forEach(x=>actions.push({type:'stockout_risk',priority:'high',title:`Protect ${x.itemName}`,message:`Potential daily revenue at risk: ₹${Math.round(x.estimatedDailyRevenueAtRisk)} across ${x.linkedMenuCount} menu item(s).`}));
  expiryRescue.slice(0,3).forEach(x=>actions.push({type:'expiry_rescue',priority:'high',title:`Rescue ${x.itemName}`,message:`${x.currentStock} ${inventory.find(i=>String(i.id)===String(x.inventoryItemId))?.unit||''} expires in ${Math.max(0,x.daysRemaining)} day(s).`}));
  promotions.filter(x=>x.recommendation==='promote').slice(0,2).forEach(x=>actions.push({type:'menu_promotion',priority:'medium',title:`Promote ${x.menuItemName}`,message:`Estimated margin ${x.marginPct}% with ingredients available.`}));

  return { menuProfitability, menuEngineering, ingredientDependency:dependency, expiryRescue, promotions, prepPlan, menuAvailability, reorderOptimizer, whatIf: { demandPlus20: whatIf20, scenarios }, actualVsTheoretical, usageIntegrity, supplierIntelligence, wasteRootCause: topWasteReason ? { reason:topWasteReason[0], estimatedCost:round(topWasteReason[1]), events:reasonEvents.get(topWasteReason[0]) || 0, sharePct: wasteEvents.length ? round((reasonEvents.get(topWasteReason[0]) || 0) / wasteEvents.length * 100) : 0 } : null, actions:actions.slice(0,8) };
};
