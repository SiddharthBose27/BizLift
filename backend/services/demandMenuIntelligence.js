/**
 * BizLift Phase 3 + 4 intelligence.
 * Demand sensing uses observed sales; menu intelligence uses recipe cost + availability.
 * No synthetic demand is created by this service.
 */
const n = (v) => Number.isFinite(Number(v)) ? Number(v) : 0;
const round = (v) => Number(n(v).toFixed(2));
const dateOf = (v) => { const d = new Date(v); return Number.isNaN(d.getTime()) ? null : d; };

export const buildDemandMenuIntelligence = ({ inventory = [], recipes = [], sales = [], now = new Date() }) => {
  const itemMap = new Map(inventory.map(i => [String(i.id), i]));
  const recipeMap = new Map(recipes.map(r => [String(r.id), r]));
  const menuStats = new Map();
  const hourly = Array.from({ length: 24 }, (_, hour) => ({ hour, units: 0, events: 0 }));
  const daily = new Map();
  const cutoff = new Date(now.getTime() - 30 * 86400000);

  for (const sale of sales) {
    const d = dateOf(sale.createdAt || sale.timestamp || sale.soldAt);
    if (!d || d < cutoff) continue;
    const qty = n(sale.quantitySold ?? sale.quantity);
    const recipeId = String(sale.recipeId || 'unknown');
    const recipeName = sale.recipeName || sale.menuItemName || recipeMap.get(recipeId)?.menuItemName || 'Unknown';
    if (!menuStats.has(recipeId)) menuStats.set(recipeId, { recipeId, menuItemName: recipeName, units: 0, events: 0, days: new Set() });
    const m = menuStats.get(recipeId); m.units += qty; m.events += 1; m.days.add(d.toISOString().slice(0,10));
    hourly[d.getHours()].units += qty; hourly[d.getHours()].events += 1;
    const key = d.toISOString().slice(0,10); daily.set(key, (daily.get(key) || 0) + qty);
  }

  const observedDays = Math.max(1, Math.min(30, Math.ceil((now - cutoff) / 86400000)));
  const dailySeries = [...daily.entries()].sort((a,b)=>a[0].localeCompare(b[0])).map(([date, units])=>({date, units:round(units)}));
  const recent7 = dailySeries.slice(-7).reduce((s,x)=>s+x.units,0);
  const prior7 = dailySeries.slice(-14,-7).reduce((s,x)=>s+x.units,0);
  const trendPct = prior7 ? round((recent7-prior7)/prior7*100) : null;
  const peakHours = hourly.slice().sort((a,b)=>b.units-a.units).slice(0,3).map(x=>x.hour);

  const demandForecast = [...menuStats.values()].map(m => {
    const avgDaily = m.units / observedDays;
    const recentWeight = m.days.size ? Math.min(1, m.days.size / 7) : 0;
    const trendFactor = trendPct === null ? 1 : Math.max(0.8, Math.min(1.3, 1 + trendPct/100 * 0.35));
    const forecast7d = Math.max(0, Math.ceil(avgDaily * 7 * trendFactor));
    const recipe = recipeMap.get(m.recipeId);
    const blockedIngredients = (recipe?.ingredients || []).filter(ing => {
      const item = itemMap.get(String(ing.inventoryItemId));
      return !item || n(item.currentStock) < n(ing.quantity);
    }).map(ing => ing.itemName || itemMap.get(String(ing.inventoryItemId))?.itemName).filter(Boolean);
    const suggestedPrep = Math.max(0, Math.ceil(forecast7d / 7));
    return { recipeId:m.recipeId, menuItemName:m.menuItemName, observed30dUnits:round(m.units), avgDailyDemand:round(avgDaily), forecast7dUnits:forecast7d, suggestedDailyPrep:suggestedPrep, confidence: recentWeight >= .8 ? 'High' : recentWeight >= .4 ? 'Medium' : 'Low', blockedIngredients };
  }).sort((a,b)=>b.forecast7dUnits-a.forecast7dUnits);

  const inventoryDemandRisk = inventory.map(item => {
    let dailyUsage = 0; let linkedMenus = 0;
    for (const recipe of recipes) {
      const ingredientQty = (recipe.ingredients || []).filter(i=>String(i.inventoryItemId)===String(item.id)).reduce((s,i)=>s+n(i.quantity),0);
      const forecast = demandForecast.find(x=>String(x.recipeId)===String(recipe.id));
      if (ingredientQty > 0 && forecast) { dailyUsage += forecast.suggestedDailyPrep * ingredientQty; linkedMenus++; }
    }
    const daysCoverage = dailyUsage > 0 ? n(item.currentStock)/dailyUsage : null;
    return { inventoryItemId:item.id, itemName:item.itemName, currentStock:round(item.currentStock), forecastDailyUsage:round(dailyUsage), projected7dUsage:round(dailyUsage*7), daysCoverage:daysCoverage===null?null:round(daysCoverage), linkedMenus, risk:daysCoverage!==null && daysCoverage<3?'High':daysCoverage!==null && daysCoverage<7?'Medium':'Low' };
  }).filter(x=>x.linkedMenus>0).sort((a,b)=>(b.risk==='High'?3:b.risk==='Medium'?2:1)-(a.risk==='High'?3:a.risk==='Medium'?2:1) || (a.daysCoverage??999)-(b.daysCoverage??999));

  const menuIntelligence = recipes.map(recipe => {
    const units = menuStats.get(String(recipe.id))?.units || 0;
    const foodCost = (recipe.ingredients || []).reduce((s,ing)=>s+n(ing.quantity)*n(itemMap.get(String(ing.inventoryItemId))?.costPrice),0);
    const price = n(recipe.sellingPrice);
    const marginPct = price ? round((price-foodCost)/price*100) : 0;
    const blocked = (recipe.ingredients || []).filter(ing=>{ const i=itemMap.get(String(ing.inventoryItemId)); return !i || n(i.currentStock)<n(ing.quantity); }).map(ing=>ing.itemName || itemMap.get(String(ing.inventoryItemId))?.itemName).filter(Boolean);
    const decision = blocked.length ? 'Protect stock' : marginPct >= 60 ? 'Promote' : marginPct < 30 ? 'Review price/cost' : units > 0 ? 'Maintain' : 'Test demand';
    const pricingSignal = price<=0 ? 'Missing price' : marginPct<20 ? 'Under-margin' : marginPct<30 ? 'Price review' : marginPct>=65 ? 'Pricing headroom' : 'Healthy';
    return { recipeId:recipe.id, menuItemName:recipe.menuItemName, unitsSold30d:round(units), sellingPrice:round(price), foodCost:round(foodCost), marginPerUnit:round(price-foodCost), marginPct, pricingSignal, decision, blockedIngredients:blocked };
  }).sort((a,b)=>b.marginPct-a.marginPct);

  return {
    demand: { observedDays, totalUnits30d:round([...menuStats.values()].reduce((s,x)=>s+x.units,0)), trendPct, peakHours, dailySeries, hourly, forecast:demandForecast, inventoryRisk:inventoryDemandRisk },
    menu: { items:menuIntelligence, promote:menuIntelligence.filter(x=>x.decision==='Promote').slice(0,8), pricingReviews:menuIntelligence.filter(x=>x.pricingSignal==='Price review'||x.pricingSignal==='Under-margin').slice(0,8), stockProtected:menuIntelligence.filter(x=>x.decision==='Protect stock').slice(0,8) }
  };
};
