import { getWorkspaceStore } from './workspaceService.js';
import { readDb, writeDb } from '../utils/db.js';

const n = (v) => Number.isFinite(Number(v)) ? Number(v) : 0;
const round = (v) => Number(n(v).toFixed(2));
const norm = (v) => String(v || '').trim().toLowerCase();

const makeId = (prefix='po') => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2,7)}`;

export const buildProcurementIntelligence = ({ inventory=[], purchaseOrders=[], suppliers=[], procurementRows=[] }) => {
  const supplierNames = [...new Set([
    ...inventory.map(i => i.supplier).filter(Boolean),
    ...suppliers.map(s => s.name || s.supplier).filter(Boolean),
  ])];

  const supplierPerformance = supplierNames.map(name => {
    const itemRows = procurementRows.filter(r => norm(r.supplier) === norm(name));
    const linkedItems = inventory.filter(i => norm(i.supplier) === norm(name));
    const history = purchaseOrders.filter(po => norm(po.supplier || po.supplierName) === norm(name));
    const delivered = history.filter(po => ['received','delivered','completed'].includes(norm(po.status)));
    const supplierMaster = suppliers.find(s => norm(s.supplier_name || s.name || s.supplier) === norm(name));
    const onTime = delivered.filter(po => po.expectedDate && po.receivedDate && new Date(po.receivedDate) <= new Date(po.expectedDate));
    const prices = history.map(po => n(po.unitCost)).filter(Boolean);
    const avgLead = history.length ? history.reduce((s,po)=>s+n(po.leadTimeDays ?? supplierMaster?.lead_time_days ?? 3),0)/history.length : 3;
    const masterRate = n(supplierMaster?.on_time_rate ?? supplierMaster?.onTimeRate ?? 0);
    const onTimeRate = delivered.length ? onTime.length / delivered.length * 100 : (masterRate <= 1 ? masterRate * 100 : masterRate);
    const reliability = Math.max(0, Math.min(100, Math.round(onTimeRate * 0.65 + Math.max(0,100-Math.max(0,avgLead-3)*8) * 0.35)));
    return {
      supplier: name,
      linkedItems: linkedItems.length,
      procurementItems: itemRows.length,
      criticalItems: itemRows.filter(r=>r.procurementPriority==='Critical').length,
      highPriorityItems: itemRows.filter(r=>r.procurementPriority==='High').length,
      estimatedSpend: round(itemRows.reduce((s,r)=>s+n(r.recommendedOrderQty)*n(r.costPrice),0)),
      avgLeadTimeDays: round(avgLead),
      onTimeRate: round(onTimeRate),
      reliabilityScore: reliability,
      priceHistoryCount: prices.length,
      risk: reliability < 60 ? 'High' : reliability < 80 ? 'Medium' : 'Low',
    };
  }).sort((a,b)=>b.criticalItems-a.criticalItems || b.estimatedSpend-a.estimatedSpend);

  const recommendations = procurementRows.map(row => {
    const candidates = supplierPerformance.filter(s => s.linkedItems > 0).sort((a,b)=>b.reliabilityScore-a.reliabilityScore);
    const preferred = candidates.find(s => norm(s.supplier) === norm(row.supplier)) || candidates[0];
    const targetSupplier = preferred?.supplier || row.supplier;
    const supplierRisk = preferred?.risk || 'Unknown';
    const delayRisk = preferred ? Math.max(0, n(row.avgDailyUsage) * n(preferred.avgLeadTimeDays) - n(row.currentStock)) : 0;
    return {
      ...row,
      costPrice: n(row.costPrice),
      recommendedSupplier: targetSupplier,
      supplierReliability: preferred?.reliabilityScore ?? null,
      supplierRisk,
      leadTimeDays: preferred?.avgLeadTimeDays ?? 3,
      stockoutExposureBeforeDelivery: round(delayRisk),
      purchaseDecision: row.reorderNeeded ? (row.procurementPriority === 'Critical' ? 'Buy now' : row.procurementPriority === 'High' ? 'Buy soon' : 'Monitor') : 'Hold',
    };
  });

  return { recommendations, supplierPerformance };
};

export const createPurchaseOrders = ({ officeId, vendorId, items=[] }) => {
  const store = getWorkspaceStore({officeId,vendorId});
  if (!Array.isArray(store.purchaseOrders)) store.purchaseOrders = [];
  const db = readDb();
  const workspaceKey = `${officeId}::${vendorId}`;
  db.workspaces[workspaceKey] = store;
  const now = new Date();
  const created = items.map(item => {
    const qty = Math.max(0, n(item.recommendedOrderQty));
    if (!qty) return null;
    const lead = Math.max(1,n(item.leadTimeDays || 3));
    const expected = new Date(now.getTime() + lead*86400000);
    return {
      id: makeId(), orderId: makeId('PO'), officeId, vendorId,
      inventoryItemId: item.itemId, itemName: item.itemName,
      supplier: item.recommendedSupplier || item.supplier || 'Unknown Supplier',
      quantityOrdered: qty, unit: item.unit || '', unitCost: n(item.costPrice),
      totalCost: round(qty*n(item.costPrice)), status:'ordered',
      orderedAt: now.toISOString(), expectedAt: expected.toISOString(), receivedAt:null,
      leadTimeDays: lead, source:'bizlift-smart-procurement', createdAt:now.toISOString(), updatedAt:now.toISOString()
    };
  }).filter(Boolean);
  store.purchaseOrders.unshift(...created);
  db.workspaces[workspaceKey]=store;
  writeDb(db);
  return created;
};

export const receivePurchaseOrder = ({ officeId, vendorId, purchaseOrderId, receivedQuantity }) => {
  const store = getWorkspaceStore({officeId,vendorId});
  const po = store.purchaseOrders.find(x => String(x.id)===String(purchaseOrderId) || String(x.orderId)===String(purchaseOrderId));
  if (!po) throw new Error('Purchase order not found.');
  if (norm(po.status)==='received') throw new Error('Purchase order is already received.');
  const qty = Math.max(0, n(receivedQuantity ?? po.quantityOrdered));
  if (!qty) throw new Error('Received quantity must be greater than zero.');
  const item = store.inventory.find(i => String(i.id)===String(po.inventoryItemId));
  if (!item) throw new Error('Inventory item linked to purchase order was not found.');
  const before = n(item.currentStock);
  item.currentStock = round(before + qty);
  item.lastUpdated = new Date().toISOString();
  item.status = item.currentStock <= n(item.minThreshold) ? 'Low Stock' : 'In Stock';
  po.status='received'; po.receivedAt=new Date().toISOString(); po.receivedQuantity=qty; po.updatedAt=new Date().toISOString();
  if (!Array.isArray(store.inventoryTransactions)) store.inventoryTransactions=[];
  store.inventoryTransactions.unshift({
    id:`po_tx_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
    officeId,vendorId, inventoryItemId:item.id, itemName:item.itemName, quantity:qty, unit:item.unit,
    direction:'in', sourceType:'purchase_order', referenceId:po.orderId || po.id, type:'receive',
    beforeStock:before, afterStock:item.currentStock, timestamp:new Date().toISOString()
  });
  const db=readDb(); db.workspaces[`${officeId}::${vendorId}`]=store; writeDb(db);
  return {purchaseOrder:po, inventoryItem:item};
};
