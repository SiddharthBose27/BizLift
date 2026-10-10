import { publishRealtimeEvent, subscribeRealtime, getRealtimeSubscriberCount } from "../services/realtimeEventService.js";

const scope = { organizationId: "org_techpark_demo", officeId: "techpark-one", vendorId: "snapeats" };
const otherScope = { organizationId: "org_techpark_demo", officeId: "techpark-one", vendorId: "quench" };
const sparseScope = { officeId: "techpark-one", vendorId: "snapeats" };
let received = 0;
let otherReceived = 0;
let sparseScopeReceived = 0;
const unsubscribe = subscribeRealtime({ scope, listener: () => { received += 1; } });
const unsubscribeSparse = subscribeRealtime({ scope: sparseScope, listener: () => { sparseScopeReceived += 1; } });
const unsubscribeOther = subscribeRealtime({ scope: otherScope, listener: () => { otherReceived += 1; } });

publishRealtimeEvent({ scope, event: { id: "evt_test", eventName: "batch17.test" } });
publishRealtimeEvent({ scope: otherScope, event: { id: "evt_other", eventName: "batch17.other" } });
publishRealtimeEvent({ scope: sparseScope, event: { id: "evt_sparse", eventName: "batch17.sparse" } });

if (received !== 2) throw new Error(`Expected 2 events for the same outlet despite org metadata differences, received ${received}`);
if (otherReceived !== 1) throw new Error(`Expected 1 other-scope event, received ${otherReceived}`);
if (sparseScopeReceived !== 2) throw new Error(`Expected sparse org-metadata scope to receive event, received ${sparseScopeReceived}`);
if (getRealtimeSubscriberCount() !== 3) throw new Error("Expected three active subscribers during test");
unsubscribe();
unsubscribeOther();
unsubscribeSparse();
if (getRealtimeSubscriberCount() !== 0) throw new Error("Realtime subscribers were not cleaned up");
console.log("Real-time platform smoke test passed: outlet-scoped pub/sub, mixed org metadata, and cleanup");
