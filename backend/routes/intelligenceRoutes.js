import express from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import { requireWorkspace } from '../middleware/requireWorkspace.js';
import { requireWorkspaceAccess } from '../middleware/requireWorkspaceAccess.js';
import { getVendorSummaryState } from '../repositories/vendorSummaryRepository.js';
import { buildDecisionIntelligence } from '../services/decisionIntelligence.js';
import { listRecommendationOutcomes, createRecommendationOutcome } from '../services/recommendationOutcomeService.js';
import { buildProcurementIntelligence, createPurchaseOrders, receivePurchaseOrder } from '../services/procurementIntelligence.js';
import { buildInventoryMetrics } from '../services/inventoryAnalytics.js';
import { buildDemandMenuIntelligence } from '../services/demandMenuIntelligence.js';
import { buildControlTower, updateControlTowerAction } from '../services/controlTowerService.js';
import { simulateDigitalTwin, buildDigitalTwinComparison } from '../services/digitalTwinService.js';
import { buildMoneyLeaks } from '../services/moneyLeakService.js';
import { buildWasteRescuePlans, buildWasteRescueSummary } from '../services/wasteRescueService.js';
import { buildActionOptimizer } from '../services/actionOptimizerService.js';
import { buildImpactLedger } from '../services/impactLedgerService.js';
import { buildBIVariance } from '../services/biVarianceService.js';

const router = express.Router();

router.get('/bi-variance', requireAuth, requireWorkspace, requireWorkspaceAccess, (req,res)=>{
  try {
    const data=buildBIVariance({...req.workspace,days:req.query?.days,now:new Date()});
    res.json({success:true,data,workspace:req.workspace});
  } catch(error) {
    console.error('GET /api/intelligence/bi-variance error:',error);
    res.status(500).json({success:false,message:'Failed to build BI variance report.'});
  }
});

router.get('/decision', requireAuth, requireWorkspace, requireWorkspaceAccess, (req,res)=>{
  try {
    const { officeId, vendorId } = req.workspace;
    const state = getVendorSummaryState({officeId,vendorId});
    res.json({success:true,data:buildDecisionIntelligence({inventory:state.inventory,recipes:state.recipes,sales:state.sales,wasteEvents:state.wasteEvents,suppliers:state.suppliers,now:new Date()}),workspace:req.workspace});
  } catch(error) {
    console.error('GET /api/intelligence/decision error:',error);
    res.status(500).json({success:false,message:'Failed to build decision intelligence.'});
  }
});


router.get('/procurement-intelligence', requireAuth, requireWorkspace, requireWorkspaceAccess, (req,res)=>{
  try {
    const state=getVendorSummaryState(req.workspace);
    const metrics=buildInventoryMetrics({inventory:state.inventory,transactions:state.inventoryTransactions,now:new Date()});
    const procurementRows=state.inventory.map(item=>{
      const m=metrics.find(x=>String(x.inventoryItemId)===String(item.id))||{};
      const avg=Number(m.avgDailyUsage30d||0), stock=Number(item.currentStock||0), threshold=Number(item.minThreshold||0), cost=Number(item.costPrice||0);
      const recommendedOrderQty=Math.max(0,Math.ceil(Math.max(threshold-stock,avg*14-stock)));
      const priority=stock<=0?'Critical':stock<=threshold?'High':(m.daysRemaining!==null&&m.daysRemaining<=5?'High':m.daysRemaining!==null&&m.daysRemaining<=10?'Medium':'Low');
      return {itemId:item.id,itemName:item.itemName,supplier:item.supplier,unit:item.unit,currentStock:stock,minThreshold:threshold,avgDailyUsage:avg,costPrice:cost,recommendedOrderQty,procurementPriority:priority,reorderNeeded:recommendedOrderQty>0};
    }).filter(x=>x.reorderNeeded);
    const result=buildProcurementIntelligence({inventory:state.inventory,purchaseOrders:state.purchaseOrders,suppliers:state.suppliers,procurementRows});
    result.purchaseOrders=state.purchaseOrders.slice(0,20);
    res.json({success:true,data:result,workspace:req.workspace});
  } catch(error) { console.error('GET /api/intelligence/procurement-intelligence error:',error); res.status(500).json({success:false,message:'Failed to build procurement intelligence.'}); }
});

router.post('/procurement-orders', requireAuth, requireWorkspace, requireWorkspaceAccess, (req,res)=>{
  try {
    const items=Array.isArray(req.body?.items)?req.body.items:[];
    if(!items.length) return res.status(400).json({success:false,message:'At least one procurement item is required.'});
    const created=createPurchaseOrders({...req.workspace,items});
    res.status(201).json({success:true,data:created,count:created.length,workspace:req.workspace});
  } catch(error) { console.error('POST /api/intelligence/procurement-orders error:',error); res.status(500).json({success:false,message:error.message||'Failed to create purchase orders.'}); }
});

router.post('/procurement-orders/:id/receive', requireAuth, requireWorkspace, requireWorkspaceAccess, (req,res)=>{
  try {
    const result=receivePurchaseOrder({...req.workspace,purchaseOrderId:req.params.id,receivedQuantity:req.body?.receivedQuantity});
    res.json({success:true,data:result,workspace:req.workspace});
  } catch(error) { console.error('POST /api/intelligence/procurement-orders/:id/receive error:',error); res.status(400).json({success:false,message:error.message||'Failed to receive purchase order.'}); }
});

router.get('/demand-menu-intelligence', requireAuth, requireWorkspace, requireWorkspaceAccess, (req,res)=>{
  try {
    const state=getVendorSummaryState(req.workspace);
    const data=buildDemandMenuIntelligence({inventory:state.inventory,recipes:state.recipes,sales:state.sales,now:new Date()});
    res.json({success:true,data,workspace:req.workspace});
  } catch(error) { console.error('GET /api/intelligence/demand-menu-intelligence error:',error); res.status(500).json({success:false,message:'Failed to build demand and menu intelligence.'}); }
});


router.post('/digital-twin', requireAuth, requireWorkspace, requireWorkspaceAccess, (req,res)=>{
  try {
    const state=getVendorSummaryState(req.workspace);
    const data=simulateDigitalTwin({...state,scenario:req.body||{},now:new Date()});
    data.comparison=buildDigitalTwinComparison({...state,scenario:req.body||{},now:new Date()});
    res.json({success:true,data,workspace:req.workspace});
  } catch(error) { console.error('POST /api/intelligence/digital-twin error:',error); res.status(500).json({success:false,message:'Failed to run digital twin simulation.'}); }
});

router.get('/money-leaks', requireAuth, requireWorkspace, requireWorkspaceAccess, (req,res)=>{
  try {
    const state=getVendorSummaryState(req.workspace);
    res.json({success:true,data:buildMoneyLeaks({...state,now:new Date()}),workspace:req.workspace});
  } catch(error) { console.error('GET /api/intelligence/money-leaks error:',error); res.status(500).json({success:false,message:'Failed to detect money leaks.'}); }
});


router.get('/waste-rescue', requireAuth, requireWorkspace, requireWorkspaceAccess, (req,res)=>{
  try {
    const state=getVendorSummaryState(req.workspace);
    const plans=buildWasteRescuePlans({inventory:state.inventory,recipes:state.recipes,sales:state.sales,now:new Date()});
    res.json({success:true,data:{plans,summary:buildWasteRescueSummary(plans)},workspace:req.workspace});
  } catch(error) { console.error('GET /api/intelligence/waste-rescue error:',error); res.status(500).json({success:false,message:'Failed to build waste rescue plans.'}); }
});

const handleActionOptimizer = (req, res) => {
  try {
    const state=getVendorSummaryState(req.workspace);
    const moneyLeaks=buildMoneyLeaks({...state,now:new Date()});
    const rescue=buildWasteRescuePlans({inventory:state.inventory,recipes:state.recipes,sales:state.sales,now:new Date()});
    const data=buildActionOptimizer({...state,now:new Date(),moneyLeaks,wasteRescue:rescue});
    res.json({success:true,data,workspace:req.workspace});
  } catch(error) {
    console.error('Action Optimizer error:',error);
    res.status(500).json({success:false,message:'Failed to optimize actions.'});
  }
};

// GET is used by the dashboard intelligence-health check; POST remains the explicit optimizer action.
router.get('/action-optimizer', requireAuth, requireWorkspace, requireWorkspaceAccess, handleActionOptimizer);
router.post('/action-optimizer', requireAuth, requireWorkspace, requireWorkspaceAccess, handleActionOptimizer);

router.post('/action-optimizer/approve', requireAuth, requireWorkspace, requireWorkspaceAccess, (req,res)=>{
  try {
    const { action } = req.body || {};
    if (!action?.id || !action?.type) return res.status(400).json({success:false,message:'Action id and type are required.'});
    let result=null;
    if (action.type === 'reorder') {
      const target=action.target || {};
      if (!target.itemId || !target.quantity) return res.status(400).json({success:false,message:'Reorder action is missing item details.'});
      const created=createPurchaseOrders({...req.workspace,items:[{itemId:target.itemId,itemName:target.itemName,recommendedOrderQty:target.quantity,unit:target.unit,costPrice:target.costPrice,recommendedSupplier:target.supplier,leadTimeDays:target.leadTimeDays}]});
      result={type:'purchase_order',created};
    } else {
      const outcome=createRecommendationOutcome({...req.workspace,payload:{recommendationId:action.id,type:action.type,title:action.title,status:'approved',expectedImpact:action.expectedNetBenefit||action.estimatedBenefit||0,notes:`Approved from Action Optimizer. ${action.nextAction||''}`}});
      result={type:'recommendation',outcome};
    }
    res.json({success:true,data:result,workspace:req.workspace});
  } catch(error) { console.error('POST /api/intelligence/action-optimizer/approve error:',error); res.status(400).json({success:false,message:error.message||'Failed to approve action.'}); }
});

router.get('/impact-ledger', requireAuth, requireWorkspace, requireWorkspaceAccess, (req,res)=>{
  try { res.json({success:true,data:buildImpactLedger(req.workspace),workspace:req.workspace}); }
  catch(error) { console.error('GET /api/intelligence/impact-ledger error:',error); res.status(500).json({success:false,message:'Failed to build impact ledger.'}); }
});

router.get('/decision-center', requireAuth, requireWorkspace, requireWorkspaceAccess, (req,res)=>{
  try {
    const state=getVendorSummaryState(req.workspace);
    const moneyLeaks=buildMoneyLeaks({...state,now:new Date()});
    const rescue=buildWasteRescuePlans({inventory:state.inventory,recipes:state.recipes,sales:state.sales,now:new Date()});
    const optimizer=buildActionOptimizer({...state,now:new Date(),moneyLeaks,wasteRescue:rescue});
    const ledger=buildImpactLedger(req.workspace);
    const actions=(optimizer.actions||[]).slice(0,5);
    const kpis={revenueAtRisk:Number(moneyLeaks?.summary?.totalValue||moneyLeaks?.summary?.estimatedValue||0),critical:Number(optimizer.summary?.critical||0),expectedBenefit:Number(optimizer.summary?.estimatedNetBenefit||0)};
    res.json({success:true,data:{generatedAt:new Date().toISOString(),question:'What should I do today?',actions,ledger,kpis,boardroom:{headline:actions[0]?.title||'Operations stable',topRisk:actions[0]?.reason||'No critical operational risk detected.',topAction:actions[0]?.nextAction||'Continue monitoring.',expectedValue:kpis.expectedBenefit,confidence:actions[0]?.confidence||'Medium'}} ,workspace:req.workspace});
  } catch(error) { console.error('GET /api/intelligence/decision-center error:',error); res.status(500).json({success:false,message:'Failed to build decision center.'}); }
});

router.get('/outcomes', requireAuth, requireWorkspace, requireWorkspaceAccess, (req,res)=>{
  try {
    res.json({success:true,data:listRecommendationOutcomes(req.workspace),workspace:req.workspace});
  } catch(error) {
    console.error('GET /api/intelligence/outcomes error:',error);
    res.status(500).json({success:false,message:'Failed to fetch recommendation outcomes.'});
  }
});

router.post('/outcomes', requireAuth, requireWorkspace, requireWorkspaceAccess, (req,res)=>{
  try {
    const outcome=createRecommendationOutcome({ ...req.workspace, payload:req.body || {} });
    res.status(201).json({success:true,data:outcome,workspace:req.workspace});
  } catch(error) {
    console.error('POST /api/intelligence/outcomes error:',error);
    res.status(500).json({success:false,message:'Failed to save recommendation outcome.'});
  }
});
export default router;

// Operations Control Tower: one prioritized operational view over existing intelligence.
router.get('/control-tower', requireAuth, requireWorkspace, requireWorkspaceAccess, (req,res)=>{
  try { res.json({success:true,data:buildControlTower(req.workspace),workspace:req.workspace}); }
  catch(error) { console.error('GET /api/intelligence/control-tower error:',error); res.status(500).json({success:false,message:'Failed to build control tower.'}); }
});
router.post('/control-tower/actions/state', requireAuth, requireWorkspace, requireWorkspaceAccess, (req,res)=>{
  try { const action=updateControlTowerAction({...req.workspace,actionKey:req.body?.actionKey,state:req.body?.state}); res.json({success:true,data:action,workspace:req.workspace}); }
  catch(error) { res.status(400).json({success:false,message:error.message||'Failed to update action.'}); }
});
