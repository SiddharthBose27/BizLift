import assert from "node:assert/strict";
import { buildDataOverview, runDataQualityChecks, recordAnalyticsEvent, listAnalyticsEvents } from "../services/dataPlatformService.js";

const scope = { organizationId: "org_techpark_demo", officeId: "techpark-one", vendorId: "snapeats" };
const overview = await buildDataOverview(scope);
assert.equal(overview.scope.vendorId, "snapeats");
assert.ok(overview.metricCount >= 10);
assert.ok(["postgresql", "json-demo"].includes(overview.source));

const quality = await runDataQualityChecks(scope);
assert.ok(quality.score >= 0 && quality.score <= 100);
assert.equal(quality.scope.vendorId, "snapeats");

const eventName = `batch15.test.${Date.now()}`;
const event = await recordAnalyticsEvent({ scope, userId: "user_snapeats_demo", eventName, entityType: "test", entityId: "batch15" });
assert.equal(event.eventName, eventName);

const events = await listAnalyticsEvents({ scope, limit: 10, eventName });
assert.equal(events.length, 1);
assert.equal(events[0].eventName, eventName);

console.log("Data platform smoke test passed:", JSON.stringify({ source: overview.source, metricCount: overview.metricCount, qualityScore: quality.score, events: events.length }));
