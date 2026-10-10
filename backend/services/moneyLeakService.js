/** Ranked operational money-leak detector. Values are workspace-period estimates, not accounting claims. */
const n=v=>Number.isFinite(Number(v))?Number(v):0;
const round=v=>Number(n(v).toFixed(2));
const DAY=86400000;
export const buildMoneyLeaks=({inventory=[],recipes=[],sales=[],wasteEvents=[],purchaseOrders=[],now=new Date()})=>{
  const since=now.getTime()-30*DAY;
  const recentSales=sales.filter(s=>new Date(s.createdAt||0).getTime()>=since);
  const recentWaste=wasteEvents.filter(w=>new Date(w.createdAt||0).getTime()>=since);
  const itemMap=new Map(inventory.map(i=>[String(i.id),i]));
  const units=new Map();
  recentSales.forEach(s=>units.set(String(s.recipeId),(units.get(String(s.recipeId))||0)+n(s.quantitySold??s.quantity)));
  const leaks=[];
  for(const item of inventory){
    const stock=n(item.currentStock);
    if(stock<=0){
      const linked=recipes.filter(r=>(r.ingredients||[]).some(i=>String(i.inventoryItemId)===String(item.id)));
      const dailyRevenue=linked.reduce((sum,r)=>sum+(n(units.get(String(r.id)))/30)*n(r.sellingPrice),0);
      if(dailyRevenue>0) leaks.push({id:`stockout-${item.id}`,category:'Stockout',title:`${item.itemName} is blocking revenue`,reason:`Out of stock across ${linked.length} linked menu item(s).`,periodValue:round(dailyRevenue*7),action:'Reorder before the next demand peak.',severity:'Critical'});
    }
  }
  for(const w of recentWaste){
    const value=n(w.wasteCost??n(w.quantity)*n(w.unitCost));
    if(value>0) leaks.push({id:`waste-${w.id}`,category:'Waste',title:`Waste event: ${w.inventoryItemName||'ingredient'}`,reason:`${w.reason||'Unspecified'} caused an avoidable inventory loss.`,periodValue:round(value),action:'Investigate the waste reason and rescue usable stock.',severity:value>=500?'High':'Medium'});
  }
  for(const item of inventory){
    const days=item.expiryDate?Math.ceil((new Date(item.expiryDate)-now)/DAY):999;
    const value=n(item.currentStock)*n(item.costPrice);
    if(days>=0&&days<=3&&value>0) leaks.push({id:`expiry-${item.id}`,category:'Expiry',title:`${item.itemName} is nearing expiry`,reason:`${round(item.currentStock)} ${item.unit||'units'} worth about ₹${round(value)} is exposed.`,periodValue:round(value),action:'Rescue into linked menu items or reduce the next purchase.',severity:days<=1?'High':'Medium'});
  }
  for(const r of recipes){
    const cost=(r.ingredients||[]).reduce((s,i)=>s+n(i.quantity)*n(itemMap.get(String(i.inventoryItemId))?.costPrice),0);
    const price=n(r.sellingPrice), margin=price-cost;
    if(price>0&&margin/price<0.25&&units.get(String(r.id))>0){ leaks.push({id:`margin-${r.id}`,category:'Margin',title:`${r.menuItemName} has thin contribution margin`,reason:`Estimated recipe food cost is ₹${round(cost)} against ₹${round(price)} selling price (${round(margin/price*100)}% contribution before overhead).`,periodValue:round(margin*Math.max(1,units.get(String(r.id)))),action:'Review price, portion or recipe cost.',severity:'Medium'}); }
  }
  const pendingSpend=purchaseOrders.filter(p=>!['received','cancelled','completed'].includes(String(p.status||'').toLowerCase())).reduce((s,p)=>s+n(p.totalAmount??p.totalCost??p.amount),0);
  if(pendingSpend>0) leaks.push({id:'procurement-exposure',category:'Procurement',title:'Capital is tied up in open procurement',reason:`Open purchase orders represent about ₹${round(pendingSpend)} of committed spend.`,periodValue:round(pendingSpend),action:'Check overdue receipts and supplier reliability.',severity:'Low'});
  const cancellations=recentSales.filter(s=>String(s.status||'').toLowerCase()==='cancelled').reduce((s,x)=>s+n(x.subtotal??x.totalAmount),0);
  if(cancellations>0) leaks.push({id:'cancellations',category:'Cancellation',title:'Cancelled orders are leaking revenue',reason:`Recent cancelled sales total about ₹${round(cancellations)}.`,periodValue:round(cancellations),action:'Review cancellation reasons and fulfillment bottlenecks.',severity:'Medium'});
  const byCat={}; leaks.forEach(l=>byCat[l.category]=(byCat[l.category]||0)+l.periodValue);
  leaks.sort((a,b)=>b.periodValue-a.periodValue);
  return {periodDays:30,totalIdentifiedValue:round(leaks.reduce((s,l)=>s+l.periodValue,0)),leaks:leaks.slice(0,20),categoryTotals:Object.entries(byCat).map(([category,value])=>({category,value:round(value)})).sort((a,b)=>b.value-a.value),disclaimer:'These are operational estimates for prioritization, not audited accounting losses.'};
};
