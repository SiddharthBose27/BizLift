import assert from "node:assert/strict";
import { buildCopilotBrief, listCopilotActions, decideCopilotAction } from "../services/aiCopilotService.js";
import { readDb, writeDb } from "../utils/db.js";
import { hasPermission } from "../services/authService.js";

const scope = { organizationId: "org_techpark_demo", officeId: "techpark-one", vendorId: "snapeats" };
const original = readDb();
for (const key of ["aiCopilotRuns", "aiCopilotActions"]) delete original[key];
writeDb(original);

const brief = await buildCopilotBrief({ scope, userId: "user_snapeats_demo", intent: "daily_operations" });
assert.equal(brief.run.status, "ready");
assert.ok(brief.run.summary);
assert.ok(Array.isArray(brief.run.actions));
assert.ok(brief.run.actions.length >= 1);
assert.ok(hasPermission("manager", "copilot:read"));
assert.ok(hasPermission("analyst", "copilot:read"));
assert.ok(hasPermission("manager", "actions:approve"));

const actions = await listCopilotActions(scope, 10);
assert.equal(actions.length, brief.run.actions.length);
const action = actions[0];
const decision = await decideCopilotAction({ scope, actionId: action.id, decision: "dismissed", userId: "user_snapeats_demo" });
assert.equal(decision.status, "dismissed");

const db = readDb();
for (const key of ["aiCopilotRuns", "aiCopilotActions"]) delete db[key];
writeDb(db);
console.log("AI Copilot smoke test passed:", JSON.stringify({ actions: brief.run.actions.length, firstAction: action.actionType, decision: decision.status }));
