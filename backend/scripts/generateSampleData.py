import json, csv, random, math, os
from datetime import datetime, timedelta, timezone

BASE=os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
DATA=os.path.join(BASE,'backend','data')
SAMPLE=os.path.join(DATA,'sample')
os.makedirs(SAMPLE,exist_ok=True)
random.seed(20260914)

# Load the existing seed source by importing it is awkward; extract useful definitions from db.json.
db=json.load(open(os.path.join(DATA,'db.json')))
workspaces=db['workspaces']
keys=list(workspaces.keys())

# Build richer but realistic master data from existing items/recipes.
extra_menu = {
 'snapeats': [
  ('French Fries',100,[('Potato',0.2,'kg'),('Oil',0.05,'litres')]),
  ('Veg Burger',150,[('Burger Bun',1,'pieces'),('Potato',0.12,'kg')]),
  ('Paneer Roll',160,[('Paneer',0.12,'kg'),('Tortilla',1,'pieces')]),
  ('Masala Sandwich',110,[('Bread',1,'packs'),('Butter',0.03,'kg')]),
 ],
 'quench': [
  ('Iced Latte',150,[('Milk',0.25,'litres'),('Cold Coffee Mix',0.05,'packs')]),
  ('Chocolate Frappe',190,[('Milk',0.25,'litres'),('Chocolate Syrup',0.08,'bottles')]),
  ('Sweet Lassi',130,[('Milk',0.2,'litres'),('Sugar',0.02,'kg')]),
  ('Cold Cocoa',160,[('Milk',0.22,'litres'),('Chocolate Syrup',0.06,'bottles')]),
 ],
 'south-delights': [
  ('Masala Dosa',130,[('Idli Batter',0.2,'kg'),('Sambar Base',0.06,'litres')]),
  ('Idli Sambar',90,[('Idli Batter',0.22,'kg'),('Sambar Base',0.08,'litres')]),
  ('Curd Rice',100,[('Rice',0.18,'kg'),('Coconut Chutney',0.03,'litres')]),
  ('Ghee Idli',110,[('Idli Batter',0.22,'kg'),('Ghee',0.02,'kg')]),
 ]
}
# Campus/demo workspaces from previous pass if present
if 'bennett-campus::campus-cafe' not in workspaces:
    workspaces['bennett-campus::campus-cafe'] = {
      'officeId':'bennett-campus','vendorId':'campus-cafe','inventory':[], 'recipes':[], 'sales':[], 'transactions':[], 'inventoryTransactions':[], 'wasteEvents':[]
    }
    keys=list(workspaces.keys())

# Ensure each workspace has sensible master inventory and recipes.
for key,w in workspaces.items():
    vid=w.get('vendorId','vendor')
    if not w.get('inventory'):
        w['inventory']=[]
    names={i.get('itemName') for i in w['inventory']}
    candidates=[]
    if vid=='campus-cafe':
        candidates=[('Potato','Vegetables','kg',35,12,42,70,'VegSource'),('Oil','Cooking','litres',18,8,120,160,'MetroCash'),('Burger Bun','Bakery','pieces',45,20,12,25,'CityFoods'),('Cheese','Dairy','kg',8,3,320,420,'FreshFarm'),('Sauce','Condiments','bottles',10,4,90,130,'CityFoods')]
    elif vid in extra_menu:
        candidates=[('Potato','Vegetables','kg',45,15,32,60,'VegSource'),('Oil','Cooking','litres',22,8,115,155,'MetroCash'),('Burger Bun','Bakery','pieces',50,20,12,25,'CityFoods'),('Cheese','Dairy','kg',9,3,320,420,'FreshFarm')]
    for name,cat,unit,stock,thr,cost,sell,supplier in candidates:
        if name not in names:
            iid=max([int(i.get('id',0)) for i in w['inventory'] if str(i.get('id','')).isdigit()] or [0])+1
            w['inventory'].append({'id':iid,'itemName':name,'category':cat,'currentStock':stock,'unit':unit,'minThreshold':thr,'costPrice':cost,'sellingPrice':sell,'expiryDate':'','supplier':supplier,'lastUpdated':'2026-09-14','status':'In Stock'})
    # Add recipes
    existing={r.get('menuItemName') for r in w.get('recipes',[])}
    for name,price,ings in extra_menu.get(vid,[]):
        if name in existing: continue
        mapped=[]
        for iname,qty,unit in ings:
            item=next((x for x in w['inventory'] if x.get('itemName')==iname),None)
            if item: mapped.append({'inventoryItemId':item['id'],'itemName':iname,'quantity':qty,'unit':unit})
        if len(mapped)==len(ings):
            rid=max([int(r.get('id',0)) for r in w.get('recipes',[]) if str(r.get('id','')).isdigit()] or [0])+1
            w.setdefault('recipes',[]).append({'id':rid,'menuItemName':name,'sellingPrice':price,'ingredients':mapped,'createdAt':'2026-08-01T09:00:00.000Z','updatedAt':'2026-09-14T09:00:00.000Z'})
    # campus recipes
    if vid=='campus-cafe':
        for name,price,ings in [('French Fries',100,[('Potato',0.2,'kg'),('Oil',0.05,'litres')]),('Veg Burger',150,[('Burger Bun',1,'pieces'),('Potato',0.12,'kg')]),('Cheese Burger',190,[('Burger Bun',1,'pieces'),('Potato',0.08,'kg'),('Cheese',0.03,'kg')])]:
            if name not in existing:
                mapped=[]
                for iname,qty,unit in ings:
                    item=next((x for x in w['inventory'] if x.get('itemName')==iname),None)
                    if item: mapped.append({'inventoryItemId':item['id'],'itemName':iname,'quantity':qty,'unit':unit})
                if len(mapped)==len(ings):
                    rid=max([int(r.get('id',0)) for r in w.get('recipes',[]) if str(r.get('id','')).isdigit()] or [0])+1
                    w.setdefault('recipes',[]).append({'id':rid,'menuItemName':name,'sellingPrice':price,'ingredients':mapped,'createdAt':'2026-08-01T09:00:00.000Z','updatedAt':'2026-09-14T09:00:00.000Z'})

# Normalize master inventory: one unique item record per workspace.
# Event tables (sales/transactions/waste) may repeat item references by design.
for w in workspaces.values():
    inventory = w.get('inventory', [])
    seen = {}
    deduped = []
    id_map = {}
    for item in inventory:
        key = ' '.join(str(item.get('itemName', '')).strip().lower().split())
        if not key:
            continue
        if key in seen:
            id_map[item.get('id')] = seen[key].get('id')
            continue
        seen[key] = item
        deduped.append(item)
    w['inventory'] = deduped
    for recipe in w.get('recipes', []):
        for ing in recipe.get('ingredients', []):
            if ing.get('inventoryItemId') in id_map:
                ing['inventoryItemId'] = id_map[ing.get('inventoryItemId')]
    # Refresh expiry dates around the current demo date so the Expiry Monitor is useful.
    base_date = datetime(2026, 9, 14, tzinfo=timezone.utc)
    for idx, item in enumerate(w['inventory']):
        category = str(item.get('category', '')).lower()
        if any(word in category for word in ['dairy', 'bakery', 'vegetable', 'produce', 'cooking']):
            days = [2, 5, 9, 14, 21][idx % 5]
        else:
            days = [7, 15, 30, 45, 60][idx % 5]
        item['expiryDate'] = (base_date + timedelta(days=days)).date().isoformat()
        stock = float(item.get('currentStock', 0) or 0)
        threshold = float(item.get('minThreshold', 0) or 0)
        item['status'] = 'Out of Stock' if stock <= 0 else 'Low Stock' if stock <= threshold else 'In Stock'

# Export clean master/reference datasets separately from repeated event history.
master_inventory_rows = []
master_recipe_rows = []
for key, w in workspaces.items():
    for item in w.get('inventory', []):
        master_inventory_rows.append({
            'officeId': w['officeId'], 'vendorId': w['vendorId'], 'inventoryItemId': item.get('id'),
            'itemName': item.get('itemName'), 'category': item.get('category'), 'unit': item.get('unit'),
            'currentStock': item.get('currentStock'), 'minThreshold': item.get('minThreshold'),
            'costPrice': item.get('costPrice'), 'supplier': item.get('supplier'), 'expiryDate': item.get('expiryDate')
        })
    for recipe in w.get('recipes', []):
        master_recipe_rows.append({
            'officeId': w['officeId'], 'vendorId': w['vendorId'], 'recipeId': recipe.get('id'),
            'menuItemName': recipe.get('menuItemName'), 'sellingPrice': recipe.get('sellingPrice'),
            'ingredientCount': len(recipe.get('ingredients', []))
        })

# Clear old small event data in seed copy and generate coherent large event history.
for w in workspaces.values():
    w['sales']=[]; w['inventoryTransactions']=[]; w['transactions']=[]; w['wasteEvents']=[]; w['purchaseOrders']=[]; w['demandObservations']=[]; w['suppliers']=[]

wskeys=list(workspaces.keys())
start=datetime(2026,5,1,tzinfo=timezone.utc)
end=datetime(2026,9,13,23,59,tzinfo=timezone.utc)

def rand_dt():
    sec=random.randint(0,int((end-start).total_seconds()))
    return start+timedelta(seconds=sec)

def money(x): return round(float(x),2)

def csvwrite(path,rows,fields):
    with open(path,'w',newline='',encoding='utf-8') as f:
        wr=csv.DictWriter(f,fieldnames=fields); wr.writeheader(); wr.writerows(rows)

sales_rows=[]; tx_rows=[]; waste_rows=[]; po_rows=[]; demand_rows=[]; supplier_rows=[]

# Supplier directory: 2000 relationship records, 5-12 per workspace.
base_suppliers=['FreshFarm','CityFoods','VegSource','MetroCash','BeanHouse','CoolSupply','SouthFresh','CampusSupply','DailyHarvest','PrimeFoods']
for i in range(1,2001):
    key=random.choice(wskeys); w=workspaces[key]
    supplier=f"{random.choice(base_suppliers)}-{i:04d}"
    supplier_rows.append({'supplier_id':f'sup_{i:05d}','office_id':w['officeId'],'vendor_id':w['vendorId'],'supplier_name':supplier,'category':random.choice(['Produce','Dairy','Bakery','Pantry','Beverages','Packaging','Cooking Oil']),'rating':round(random.uniform(3.2,4.9),1),'lead_time_days':random.randint(1,7),'on_time_rate':round(random.uniform(0.82,0.99),3),'active':True})
    w['suppliers'].append(supplier_rows[-1])

# 2000 purchase orders / inbound stock events.
for i in range(1,2001):
    key=random.choice(wskeys); w=workspaces[key]; dt=rand_dt(); item=random.choice(w['inventory']) if w['inventory'] else None
    if not item: continue
    qty=round(random.uniform(max(1,float(item['minThreshold'] or 1)), max(2,float(item['minThreshold'] or 1)*4)),3)
    unit_cost=float(item.get('costPrice',50))
    total=money(qty*unit_cost)
    status=random.choices(['received','pending','cancelled'],weights=[0.86,0.11,0.03])[0]
    po={'id':f'po_{i:05d}','officeId':w['officeId'],'vendorId':w['vendorId'],'supplier':item.get('supplier','General Supplier'),'inventoryItemId':item['id'],'itemName':item['itemName'],'quantityOrdered':qty,'unit':item['unit'],'unitCost':unit_cost,'totalCost':total,'status':status,'orderedAt':dt.isoformat(),'expectedAt':(dt+timedelta(days=random.randint(1,5))).isoformat(),'receivedAt':(dt+timedelta(days=random.randint(0,4))).isoformat() if status=='received' else None}
    po_rows.append(po); w['purchaseOrders'].append(po)

# 2500 sales, each recipe consumption is fully represented inside sale record.
for i in range(1,2501):
    key=random.choice(wskeys); w=workspaces[key]
    recipes=w.get('recipes',[])
    if not recipes: continue
    r=random.choice(recipes); qty=random.choices([1,2,3,4,5,6],[35,25,18,12,7,3])[0]; dt=rand_dt()
    price=float(r.get('sellingPrice',100)); subtotal=money(price*qty); tax_rate=random.choice([0,5,5,5,12]); tax=money(subtotal*tax_rate/100); total=money(subtotal+tax)
    deductions=[]
    for ing in r.get('ingredients',[]):
        deductions.append({'inventoryItemId':ing.get('inventoryItemId'),'itemName':ing.get('itemName'),'deductedQuantity':round(float(ing.get('quantity',0))*qty,3),'unit':ing.get('unit','')})
    sale={'id':f'sale_{i:05d}','officeId':w['officeId'],'vendorId':w['vendorId'],'recipeId':r.get('id'),'recipeName':r.get('menuItemName'),'menuItemName':r.get('menuItemName'),'quantitySold':qty,'quantity':qty,'sellingPrice':price,'subtotal':subtotal,'taxRate':tax_rate,'taxAmount':tax,'totalAmount':total,'grandTotal':total,'paymentMethod':random.choice(['cash','upi','card','other']),'customerName':random.choice(['Walk-in Customer','Student','Faculty','Employee','Guest']),'channel':random.choice(['pos','counter','manual']),'receiptNumber':f'BL-{dt.strftime("%Y%m%d")}-{i:05d}','orderId':f'order_{i:05d}','deductions':deductions,'createdAt':dt.isoformat()}
    sales_rows.append(sale); w['sales'].append(sale)
    for d in deductions:
        tx={'id':f'txn_sale_{i:05d}_{d["inventoryItemId"]}','officeId':w['officeId'],'vendorId':w['vendorId'],'inventoryItemId':d['inventoryItemId'],'inventoryItemName':d['itemName'],'itemName':d['itemName'],'type':'sale_deduction','direction':'out','quantity':d['deductedQuantity'],'unit':d['unit'],'sourceType':'sale','sourceId':sale['id'],'recipeId':r.get('id'),'recipeName':r.get('menuItemName'),'createdAt':dt.isoformat(),'timestamp':dt.isoformat(),'meta':{'channel':sale['channel'],'paymentMethod':sale['paymentMethod']}}
        tx_rows.append(tx)
        w['inventoryTransactions'].append(tx); w['transactions'].append({'id':tx['id'],'itemId':tx['inventoryItemId'],'itemName':tx['itemName'],'type':'reduce','quantity':tx['quantity'],'reason':f'Auto deduction from sale: {r.get("menuItemName")} x {qty}','source':'sale','timestamp':dt.isoformat()})

# 2500 waste events.
reasons=['expired','spoiled','overproduction','damaged','preparation_waste','quality_issue']
for i in range(1,2501):
    key=random.choice(wskeys); w=workspaces[key]; item=random.choice(w['inventory']) if w['inventory'] else None
    if not item: continue
    dt=rand_dt(); qty=round(random.uniform(0.05,max(0.1,float(item.get('minThreshold',1))*0.45)),3); cost=float(item.get('costPrice',50)); before=round(random.uniform(qty,max(qty+0.1,float(item.get('minThreshold',1))*3)),3); after=round(before-qty,3); reason=random.choice(reasons)
    ev={'id':f'waste_{i:05d}','officeId':w['officeId'],'vendorId':w['vendorId'],'inventoryItemId':item['id'],'inventoryItemName':item['itemName'],'quantity':qty,'unit':item['unit'],'unitCost':cost,'wasteCost':money(qty*cost),'reason':reason,'notes':f'Sample {reason.replace("_"," ")} event','beforeStock':before,'afterStock':after,'createdAt':dt.isoformat()}
    waste_rows.append(ev); w['wasteEvents'].append(ev)

# 2500 demand observations: daily/periodic menu demand for forecasting.
for i in range(1,2501):
    key=random.choice(wskeys); w=workspaces[key]; recipes=w.get('recipes',[])
    if not recipes: continue
    r=random.choice(recipes); dt=rand_dt(); base=random.randint(2,35); weekday=dt.weekday(); multiplier=1.25 if weekday in (1,2,3) else 0.8 if weekday>=5 else 1.0; qty=max(0,int(round(base*multiplier*random.uniform(.75,1.3))))
    row={'id':f'demand_{i:05d}','office_id':w['officeId'],'vendor_id':w['vendorId'],'recipe_id':r.get('id'),'menu_item':r.get('menuItemName'),'date':dt.date().isoformat(),'hour':random.choice([9,10,11,12,13,14,15,16,17,18,19]),'units_sold':qty,'day_of_week':dt.strftime('%A'),'weather':random.choice(['clear','hot','rain','cloudy']),'campus_occupancy_pct':random.randint(35,98)}
    demand_rows.append(row); w['demandObservations'].append(row)

# Keep only 5000 inventory transactions, prioritising sales and waste-related movements, while preserving full sale deductions in sales.
# Add 1000 synthetic inbound/adjustment transactions to make the transaction ledger useful.
for i in range(1,1001):
    key=random.choice(wskeys); w=workspaces[key]; item=random.choice(w['inventory']); dt=rand_dt(); qty=round(random.uniform(1,max(2,float(item.get('minThreshold',1))*3)),3)
    tx={'id':f'txn_adj_{i:05d}','officeId':w['officeId'],'vendorId':w['vendorId'],'inventoryItemId':item['id'],'inventoryItemName':item['itemName'],'itemName':item['itemName'],'type':random.choice(['purchase_receipt','manual_adjustment','opening_balance']),'direction':'in','quantity':qty,'unit':item['unit'],'beforeStock':0,'afterStock':qty,'previousStock':0,'newStock':qty,'sourceType':'purchase','sourceId':f'po_{random.randint(1,2000):05d}','createdAt':dt.isoformat(),'timestamp':dt.isoformat(),'meta':{'sampleData':True}}
    tx_rows.append(tx); w['inventoryTransactions'].append(tx); w['transactions'].append({'id':tx['id'],'itemId':item['id'],'itemName':item['itemName'],'type':'increase','quantity':qty,'reason':'Sample purchase receipt','source':'purchase','timestamp':dt.isoformat()})
# Sort and trim exactly 5000 globally, then rebuild workspace transaction arrays from retained rows.
tx_rows.sort(key=lambda x:x['createdAt'])
tx_rows=tx_rows[-5000:]
for w in workspaces.values(): w['inventoryTransactions']=[]; w['transactions']=[]
for tx in tx_rows:
    key=f"{tx['officeId']}::{tx['vendorId']}"; w=workspaces.get(key)
    if w:
        w['inventoryTransactions'].append(tx); w['transactions'].append({'id':tx['id'],'itemId':tx['inventoryItemId'],'itemName':tx['itemName'],'type':'reduce' if tx['direction']=='out' else 'increase','quantity':tx['quantity'],'reason':'Sample transaction','source':tx['sourceType'],'timestamp':tx['createdAt']})

# Make all workspace IDs sequential-ish and add dataset metadata.
manifest={'generatedAt':'2026-09-14T00:00:00+05:30','generatorSeed':20260914,'notes':'Deterministic synthetic sample data for BizLift. Event data is intentionally large; master tables remain realistic and small.','datasets':{'inventory_master':len(master_inventory_rows),'recipes_master':len(master_recipe_rows),'sales':len(sales_rows),'inventory_transactions':len(tx_rows),'waste_events':len(waste_rows),'purchase_orders':len(po_rows),'demand_observations':len(demand_rows),'suppliers':len(supplier_rows)}}

fields={
'sales':['id','officeId','vendorId','recipeId','recipeName','menuItemName','quantitySold','sellingPrice','subtotal','taxRate','taxAmount','totalAmount','grandTotal','paymentMethod','customerName','channel','receiptNumber','orderId','createdAt'],
'inventory_transactions':['id','officeId','vendorId','inventoryItemId','inventoryItemName','type','direction','quantity','unit','sourceType','sourceId','recipeId','recipeName','createdAt'],
'waste_events':['id','officeId','vendorId','inventoryItemId','inventoryItemName','quantity','unit','unitCost','wasteCost','reason','beforeStock','afterStock','createdAt'],
'purchase_orders':['id','officeId','vendorId','supplier','inventoryItemId','itemName','quantityOrdered','unit','unitCost','totalCost','status','orderedAt','expectedAt','receivedAt'],
'demand_observations':['id','office_id','vendor_id','recipe_id','menu_item','date','hour','units_sold','day_of_week','weather','campus_occupancy_pct'],
'suppliers':['supplier_id','office_id','vendor_id','supplier_name','category','rating','lead_time_days','on_time_rate','active']}
# Master tables are intentionally unique; large event tables below contain historical repeats.
master_fields = {
 'inventory_master': ['officeId','vendorId','inventoryItemId','itemName','category','unit','currentStock','minThreshold','costPrice','supplier','expiryDate'],
 'recipes_master': ['officeId','vendorId','recipeId','menuItemName','sellingPrice','ingredientCount']
}
for name, rows in [('inventory_master', master_inventory_rows), ('recipes_master', master_recipe_rows)]:
    csvwrite(os.path.join(SAMPLE, f'{name}.csv'), rows, master_fields[name])

for name,rows in [('sales',sales_rows),('inventory_transactions',tx_rows),('waste_events',waste_rows),('purchase_orders',po_rows),('demand_observations',demand_rows),('suppliers',supplier_rows)]:
    # csv-safe nested-free projection
    out=[]
    for r in rows:
        out.append({k:r.get(k,'') for k in fields[name]})
    csvwrite(os.path.join(SAMPLE,f'{name}.csv'),out,fields[name])

with open(os.path.join(SAMPLE,'manifest.json'),'w') as f: json.dump(manifest,f,indent=2)
with open(os.path.join(DATA,'generatedWorkspaceData.json'),'w') as f: json.dump(workspaces,f,indent=2)
# Full generated database seed, retaining users/sessions from current db and replacing workspaces.
seed={'users':db.get('users',[]),'sessions':[],'workspaces':workspaces}
with open(os.path.join(DATA,'demoDb.json'),'w') as f: json.dump(seed,f,indent=2)
with open(os.path.join(DATA,'db.json'),'w') as f: json.dump(seed,f,indent=2)
print(json.dumps(manifest,indent=2))
print('workspaces',list(workspaces))
