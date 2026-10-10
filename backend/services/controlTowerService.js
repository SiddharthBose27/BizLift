import { buildInventoryMetrics } from './inventoryAnalytics.js';
import { buildExpiryMetrics } from './expiryEngine.js';
import { buildSupplierAnalytics } from './supplierAnalytics.js';
import { buildReorderSuggestions } from './inventoryEngine.js';
import { buildDecisionIntelligence } from './decisionIntelligence.js';
import { buildDemandMenuIntelligence } from './demandMenuIntelligence.js';
import { buildProcurementIntelligence } from './procurementIntelligence.js';
import { readDb, writeDb } from '../utils/db.js';
import { getWorkspaceStore } from './workspaceService.js';

const n = v => Number.isFinite(Number(v)) ? Number(v) : 0;
const round = v => Number(n(v).toFixed(2));
const rank = { Critical: 4, High: 3, Medium: 2, Low: 1 };
const idFor = (type, ref) => `tower:${type}:${String(ref || '').replace(/\s+/g,'-').toLowerCase()}`;

const ensure = store => { if (!Array.isArray(store.controlTowerActions)) store.controlTowerActions = []; return store.controlTowerActions; };

export const buildControlTower = ({ officeId, vendorId }) => {
  const store = getWorkspaceStore({ officeId, vendorId });
  const now = new Date();
  const metrics = buildInventoryMetrics({ inventory: store.inventory || [], transactions: store.inventoryTransactions || [], now });
  const expiry = buildExpiryMetrics({ inventory: store.inventory || [], itemMetrics: metrics, now });
  const suppliers = buildSupplierAnalytics({ inventory: store.inventory || [], metrics });
  const reorder = (store.inventory || []).map(item => {
    const m = metrics.find(x => String(x.inventoryItemId) === String(item.id));
    return buildReorderSuggestions({ item, metrics: m });
  }).filter(x => x.shouldReorder);
  const decision = buildDecisionIntelligence({ inventory:store.inventory||[], recipes:store.recipes||[], sales:store.sales||[], wasteEvents:store.wasteEvents||[], suppliers:store.suppliers||[], now });
  const demandMenu = buildDemandMenuIntelligence({ inventory:store.inventory||[], recipes:store.recipes||[], sales:store.sales||[], now });
  const procurementRows = reorder.map(x => ({ itemId:x.inventoryItemId, itemName:x.inventoryItemName, supplier:x.supplier, unit:x.unit, currentStock:n(x.currentStock), minThreshold:n(x.minThreshold), avgDailyUsage:n(x.avgDailyUsage30d || x.avgDailyUsage), costPrice:n(x.costPrice), recommendedOrderQty:n(x.suggestedReorderQty || x.recommendedOrderQty), procurementPriority:x.urgency==='critical'?'Critical':x.urgency==='high'?'High':'Medium', reorderNeeded:true }));
  const procurement = buildProcurementIntelligence({ inventory:store.inventory||[], purchaseOrders:store.purchaseOrders||[], suppliers:store.suppliers||[], procurementRows });
  const actions = [];
  const add = (type, priority, title, reason, next, impact, ref, meta={}) => actions.push({ actionKey:idFor(type,ref||title), type, priority, title, reason, nextAction:next, impact:round(impact), state:'active', meta });

  for (const x of expiry.filter(e=>e.expirySeverity==='expired').slice(0,5)) add('expired_stock','Critical',`Remove expired ${x.inventoryItemName}`,`${x.currentStock} ${x.unit} is already expired.`,'Record waste and remove the stock.',n(x.currentStock)*n((store.inventory||[]).find(i=>String(i.id)===String(x.inventoryItemId))?.costPrice),x.inventoryItemId,{inventoryItemId:x.inventoryItemId});
  for (const x of reorder.slice(0,6)) add(x.urgency==='critical'?'stockout':'reorder',x.urgency==='critical'?'Critical':'High',`Reorder ${x.inventoryItemName}`,`Stock coverage is ${x.daysRemaining ?? 'limited'} day(s) at current usage.`,'Create or receive a purchase order.',n(x.suggestedReorderQty||x.recommendedOrderQty)*n(x.costPrice),x.inventoryItemId,{inventoryItemId:x.inventoryItemId,supplier:x.supplier});
  for (const x of decision.ingredientDependency.filter(x=>x.riskScore>0).slice(0,4)) add('revenue_risk','High',`Protect ${x.itemName}`,`${x.linkedMenuCount} menu item(s) depend on this ingredient.`,'Replenish stock or temporarily protect affected menu items.',n(x.estimatedDailyRevenueAtRisk),x.inventoryItemId,{inventoryItemId:x.inventoryItemId});
  for (const x of demandMenu.menu.inventoryRisk?.filter?.(x=>x.risk==='High'||x.risk==='Critical').slice(0,4) || []) add('forecast_risk','High',`Prepare for ${x.itemName}`,`Forecast usage may exceed available ingredient coverage.`,'Increase prep/reorder coverage before the forecast window.',n(x.projected7dUsage)*n(x.costPrice||0),x.itemName);
  if (decision.wasteRootCause?.estimatedCost) add('waste_root_cause','Medium',`Reduce ${decision.wasteRootCause.reason} waste`,`This is the leading waste reason (${decision.wasteRootCause.sharePct}% of events).`,'Tighten prep, storage, or portion controls for this reason.',decision.wasteRootCause.estimatedCost,decision.wasteRootCause.reason);
  for (const x of procurement.supplierPerformance.filter(s=>s.risk==='High').slice(0,3)) add('supplier_risk','High',`Review ${x.supplier}`,`Reliability is ${x.reliabilityScore}% with ${x.criticalItems} critical item(s).`,'Consider an alternate supplier or earlier ordering.',x.estimatedSpend,x.supplier);
  for (const x of decision.menuAvailability.filter(x=>x.status==='86').slice(0,3)) add('menu_86','High',`Menu item 86: ${x.menuItemName}`,`Current ingredient stock cannot support another unit.`,'Replenish the blocking ingredient before promoting this item.',n(x.sellingPrice),x.recipeId,{recipeId:x.recipeId});

  const existing = ensure(store);
  const stateByKey = new Map(existing.map(x=>[x.actionKey,x]));
  const merged = actions.map(x => ({ ...x, createdAt: stateByKey.get(x.actionKey)?.createdAt || now.toISOString(), updatedAt: now.toISOString(), state: stateByKey.get(x.actionKey)?.state || 'active' }));
  const lifecycle = existing.filter(x=>!actions.some(a=>a.actionKey===x.actionKey)).map(x=>({ ...x, state:x.state==='active'?'completed':x.state }));
  const db=readDb(); db.workspaces[`${officeId}::${vendorId}`]=store; writeDb(db);
  const kpis = {
    criticalNow: merged.filter(x=>x.priority==='Critical' && !['dismissed','completed'].includes(x.state)).length,
    highPriority: merged.filter(x=>x.priority==='High' && !['dismissed','completed'].includes(x.state)).length,
    revenueAtRisk: round(merged.filter(x=>x.type==='revenue_risk').reduce((s,x)=>s+n(x.impact),0)),
    wasteCost: round(decision.wasteRootCause?.estimatedCost || 0),
    procurementExposure: round(procurement.recommendations.reduce((s,x)=>s+n(x.recommendedOrderQty)*n(x.costPrice),0)),
    menu86: decision.menuAvailability.filter(x=>x.status==='86').length,
    forecastRisk: (demandMenu.demand?.inventoryRisk || []).filter(x=>x.risk==='High'||x.risk==='Critical').length,
  };
  const summary = { happened: `${store.sales?.length||0} sales and ${store.wasteEvents?.length||0} waste events are recorded.`, why: `${kpis.criticalNow} critical operational issue(s) need immediate attention.`, next: merged.find(x=>x.priority==='Critical')?.nextAction || merged[0]?.nextAction || 'Continue monitoring operations.', generatedAt:now.toISOString() };
  return { kpis, summary, actions:[...merged,...lifecycle].sort((a,b)=>(rank[b.priority]||0)-(rank[a.priority]||0)).slice(0,25), usageIntegrity:decision.usageIntegrity, menuAvailability:decision.menuAvailability.slice(0,20), supplierPerformance:procurement.supplierPerformance };
};

export const updateControlTowerAction = ({ officeId, vendorId, actionKey, state }) => {
  const allowed = ['active','reviewed','snoozed','dismissed','completed'];
  if (!allowed.includes(state)) throw new Error(`Invalid action state. Use: ${allowed.join(', ')}`);
  const store=getWorkspaceStore({officeId,vendorId}); const actions=ensure(store); const now=new Date().toISOString();
  let action=actions.find(x=>x.actionKey===actionKey);
  if (!action) { action={actionKey,state:'active',createdAt:now}; actions.push(action); }
  action.state=state; action.updatedAt=now;
  const db=readDb(); db.workspaces[`${officeId}::${vendorId}`]=store; writeDb(db); return action;
};
