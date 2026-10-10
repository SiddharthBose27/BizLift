# BizLift

BizLift is a food-business operations platform for **office cafeterias, college/university campuses, canteens and food courts**.

The core business model is recipe-driven inventory management:

`Customer order -> Menu item -> Recipe -> Ingredients -> Inventory deduction -> Billing -> Transactions -> Analytics/Intelligence`

## Current sample data

The project ships with a large deterministic synthetic dataset. See [`docs/SAMPLE_DATA.md`](docs/SAMPLE_DATA.md).

- 2,500 sales
- 5,000 inventory transactions
- 2,500 waste events
- 2,000 purchase orders
- 2,500 demand observations
- 2,000 supplier records

## Persistence

Operational changes are stored in `backend/data/db.json`. Creating/editing recipes, inventory and sales therefore updates the project database rather than only frontend state.

## Run

### Backend

```bash
cd backend
npm install
npm run dev
```

### Frontend

```bash
cd client
npm install
npm run dev
```

### Validate sample datasets

```bash
cd backend
npm run seed:sample
```

### Reset to the clean demo baseline

```bash
cd backend
npm run bootstrap:demo
```

## Demo accounts

Existing TechPark demo accounts remain available. A campus demo was also added:

- `campuscafe@bennett.edu` / `Campus@123`
- `campusadmin@bennett.edu` / `Campus@123`

## Batch 15 — Data Platform

The backend now exposes a workspace-scoped data platform layer for operational metrics, analytics events, metric snapshots and data-quality checks.

### Data APIs

- `GET /api/data/overview` — canonical operational metrics for the authenticated workspace.
- `GET /api/data/quality` — data-quality score and checks.
- `GET /api/data/events` — tenant-scoped analytics event history.
- `POST /api/data/events` — records an analytics event.
- `POST /api/data/snapshots` — persists a point-in-time metric snapshot.

PostgreSQL mode stores analytics events in `analytics_events` and metric snapshots in `data_metric_snapshots`. JSON demo mode remains supported for compatibility.

### Batch 15 validation

```bash
cd backend
npm run test:data
npm run prisma:generate
npm run prisma:migrate
```

`npm run prisma:migrate` applies the Batch 15 `data_metric_snapshots` migration when PostgreSQL mode is enabled.

## Development principle

Keep the existing frontend/backend structure. Prefer connecting and repairing existing services over rewriting working modules. All major changes should be added to the audit log before packaging a new project ZIP.

## Audit log

### 2026-09-14 — Large sample dataset pass

- Added 2,500 synthetic sales records.
- Added 5,000 inventory transaction records.
- Added 2,500 waste events.
- Added 2,000 purchase orders.
- Added 2,500 demand observations for future forecasting.
- Added 2,000 supplier relationship records.
- Added generated workspace data to the reset/seed baseline.
- Added CSV copies under `backend/data/sample/` for analysis/testing.
- Added sample-data validation command.
- Added purchase orders, demand observations and suppliers to the workspace persistence structure.
- Added Bennett campus demo credentials to use the generated campus workspace.
- Kept master inventory and recipe tables intentionally compact and realistic instead of generating thousands of duplicate reference rows.
- Maintained the existing frontend/backend folder structure.

### 2026-09-14 — Persistence/seed reliability follow-up

- Reset/seed now uses the generated large dataset rather than the old tiny event seed.
- Added explicit `transactions` collection to empty and seeded workspace stores to prevent first-use transaction errors.
- Workspace reset now persists the reset state to `backend/data/db.json`.
- Added `backend/scripts/generateSampleData.py` so the synthetic dataset can be regenerated deterministically with seed `20260914`.

### 2026-09-14 — Unique master data + novel decision features
- Added `inventory_master.csv` and `recipes_master.csv` as clean reference datasets with one master record per item/recipe within each workspace.
- Clarified the data model: repeated Bread/Potato/etc. rows in sales and transaction history are legitimate events, not duplicate inventory products.
- Added master-data duplicate validation to `npm run seed:sample`.
- Refreshed sample expiry dates around the demo date so Expiry Monitor produces meaningful current/future/expired states.
- Replaced the Dashboard Inventory placeholder with a live master inventory view and recipe-linked inventory visibility.
- Added Smart Ops Lab novelty layer: menu profitability, ingredient bottlenecks, recoverable waste value and a demand-based prep signal.
- Added menu-level promotion/monitor decisions based on margin and ingredient availability.

### 2026-09-14 — AI dashboard and sample-data visibility fix
- Fixed the vendor AI health endpoint to use the logged-in workspace instead of legacy global demo arrays.
- Removed the broken reference to the deleted `getSupplierRiskLevel` helper.
- Fixed dashboard health scoring to recognize the actual seeded status values (`Low Stock`, `Out of Stock`).
- Preserved the generated workspace dataset; SnapEats now loads its seeded inventory, recipes, sales, transactions, waste, procurement, demand, and supplier records from the persistent workspace data.
- Added explicit error logging/response details for AI health failures.

- 2026-09-14 — Login access hardening: Vendor ID is no longer required for authentication; workspace identity is resolved from the authenticated account, while legacy vendorId hints remain supported. Fixed South Delights workspace ID normalization and updated login copy for offices, campuses, canteens, and food courts.

### 2026-09-14 Phase 3 + Phase 4 — Demand Intelligence + Menu Intelligence
- Added workspace-aware demand sensing from observed sales history: 30-day velocity, recent trend, peak hours, 7-day menu forecasts and confidence levels.
- Added forecast-driven ingredient coverage analysis so menu demand is translated into projected ingredient usage and stock risk.
- Added menu intelligence combining recipe food cost, selling price, contribution margin, demand and ingredient availability.
- Added explainable menu decisions: Promote, Maintain, Test demand, Review price/cost, and Protect stock.
- Added pricing signals without inventing elasticity measurements; recommendations are based on observable cost, margin, demand and availability data.
- Added `/api/intelligence/demand-menu-intelligence` and documented the architecture in `docs/DEMAND_MENU_INTELLIGENCE.md`.
- Kept the existing navigation, styling and page structure; the new intelligence is additive inside Decision Intelligence.
- Validation: backend service and route syntax checks passed; direct demand/menu intelligence smoke tests completed against seeded workspace data.

## Audit Log
### 2026-09-14 Phase 1 + Phase 2 Completion Pass — Smart Procurement + Inventory/Sales Control Loop
- Added supplier-aware procurement intelligence with recommended supplier, reliability score, lead time, stockout exposure, purchase decision, and estimated spend.
- Added smart purchase-order creation and receiving APIs. Receiving updates inventory and records an inventory transaction, preserving the operational audit trail.
- Added compact Smart Procurement controls to Reorder Suggestions and supplier reliability visibility to Suppliers.
- Strengthened the sales-to-recipe-to-inventory audit with a usage-integrity summary showing theoretical usage, recorded POS deductions, variance items, and reconciliation status.
- Kept the existing visual system and navigation structure; changes are additive and minimal.
- Added `docs/PROCUREMENT_INTELLIGENCE.md`.
- Validation: backend syntax checks passed; procurement intelligence and purchase-order create/receive smoke test passed; generated test mutation was restored before packaging. Frontend production build could not be completed in the constrained container because `npm ci` timed out and Vite dependencies were unavailable.

### 2026-09-14 Waste Intelligence Runtime Audit — FIXED
- Fixed the remaining `waste` intelligence module failure by restoring the missing controller imports for `buildWasteSummary`, `buildWasteByItem`, and `buildWasteByReason`.
- The endpoint `/api/inventory/waste-analytics` now resolves the workspace waste analytics service correctly instead of throwing a runtime `ReferenceError`.
- Verified backend JavaScript syntax after the fix.
 — 2026-09-14 Production Intelligence Foundation
- Fixed workspace-aware Waste Analytics: analytics now reads the active workspace's `wasteEvents` and inventory instead of legacy global datasets.
- Fixed workspace-aware Reorder Suggestions and Procurement Plan; eliminated undefined metric crashes and normalized urgency/quantity/cost fields.
- Fixed workspace-aware Demand Forecast and EOQ Analytics; removed legacy global-data dependency from these intelligence endpoints.
- Updated Dashboard intelligence loading to fetch and reconcile the canonical analytics endpoints rather than relying only on truncated dashboard highlights.
- Added compatibility fields for existing UI charts while retaining the current visual design.
- Established the foundation for a unified decision-intelligence architecture: sales → recipes → ingredient consumption → inventory → demand/waste/expiry → procurement/recommendations.

 — 2026-09-14 Decision Intelligence Architecture
- Added canonical `decisionIntelligence` service and `/api/intelligence/decision` endpoint.
- Added ingredient-to-menu dependency analysis and estimated stockout revenue exposure.
- Added expiry rescue recommendations that connect expiring ingredients to affected menu items.
- Added menu profitability, menu-engineering classification (Star/Puzzle/Plowhorse/Dog), and promotion/protect/reprice recommendations.
- Added prep planning signals using recent menu velocity plus an explicit operating buffer.
- Added a demand +20% what-if scenario with projected revenue, incremental ingredient cost, and inventory risk count.
- Added actual-vs-theoretical ingredient usage analysis from recipe demand and recorded sale deductions.
- Added supplier dependency/operational scoring from the active workspace inventory.
- Added a compact Decision Intelligence panel to the existing Overview page; existing visual language and navigation remain intact.
- Updated the dashboard loader to fetch canonical intelligence endpoints so analytics pages no longer depend on truncated dashboard highlight payloads.
- Fixed legacy global-data usage in Waste Analytics, Demand Forecast, Procurement Plan, EOQ Analytics, and Workspace Health.
- Fixed reorder metric compatibility and enriched reorder records with estimated cost, forecast coverage, and recommended quantity.
- Normalized legacy vendor IDs during authentication/workspace authorization so `southdelights` and `south-delights` resolve to the same workspace.

 — 2026-09-14 Control Tower Reliability + Next Intelligence Set
- Fixed Recharts responsive sizing warnings by enforcing safe minimum chart dimensions so charts remain renderable during responsive/layout transitions.
- Added per-module intelligence health diagnostics; failures now identify the exact endpoint/module instead of only showing a generic warning.
- Removed an accidental duplicate Decision Intelligence panel on the Overview page.
- Added recipe-level menu availability / “86” detection based on whether current ingredient stock can support another menu unit.
- Added Smart Reorder Optimizer using demand velocity, stock coverage and supplier lead-time assumptions to distinguish `order_now`, `order_soon`, and `monitor`.
- Expanded the What-If engine to precompute +10%, +20% and +50% demand scenarios with projected revenue, incremental ingredient cost and at-risk inventory counts.
- Added the new Control Tower metrics and tables to the existing Decision Intelligence page without changing the overall visual language.
- Kept master inventory deduplicated while preserving repeated historical event rows as legitimate operational history.

 — 2026-09-14 — Runtime Error Fix + Control Tower Expansion
- Fixed the `renderIntelligenceHealthNotice is not defined` React runtime crash by restoring the missing dashboard health renderer.
- Kept partial intelligence available when one API module fails; the notice now identifies the failed module and provides a retry action.
- Hardened all Recharts `ResponsiveContainer` instances with explicit 220px chart height to prevent `width(-1)` / `height(-1)` rendering warnings when cards temporarily have no measurable height.
- Added a Stockout Impact Simulator to Decision Intelligence using ingredient dependency and daily revenue exposure. Users can stress-test +10%, +20% and +50% demand conditions without changing operational data.
- Kept the existing visual language and navigation; the new control-tower layer is additive rather than a UI rewrite.
- Verified backend JavaScript syntax and decision-intelligence outputs against the seeded workspaces. A full Vite build could not be run in this packaging environment because frontend dependencies were not available locally; run `npm install` then `npm run build` in `client` for local production-build verification.


 — 2026-09-14 Phase 2 Intelligence & Stability
- Fixed the remaining Waste Intelligence runtime failure by wiring the workspace waste analytics controller to the workspace-aware waste aggregation service.
- Hardened waste analytics with item, reason, category, trend and root-cause outputs.
- Added persistent Recommendation Outcomes so managers can record when an intelligence recommendation was acted on.
- Added outcome API endpoints under `/api/intelligence/outcomes`.
- Added a lightweight Recommendation Outcomes panel to Decision Intelligence without changing the existing visual language.
- Added richer waste root-cause metadata (event count and share) for explainable operations decisions.
- Preserved the existing master-data/event-data separation and existing sample dataset volumes.


### 2026-09-14 Phase 5 + Phase 6 — Operations Control Tower + Real Business Workflows
- Added a unified workspace-aware Operations Control Tower at `/api/intelligence/control-tower`, combining stock, expiry, revenue-risk, forecast, menu-86, waste and supplier signals into prioritized actions with explicit reason, next step and measurable impact.
- Added persistent Control Tower action lifecycle states: active, reviewed, snoozed, dismissed and completed.
- Added POS-derived menu availability / 86 indicators from live recipe ingredient stock.
- Added POS order history and stock-safe order cancellation; cancellation reverses every recipe deduction and records inventory reversal transactions.
- Added operational workflow documentation in `docs/CONTROL_TOWER_AND_WORKFLOWS.md`.
- Kept the existing folder structure, navigation and visual language; changes are additive/minimal.
- Validation: backend syntax checks and direct Control Tower smoke tests completed across all four seeded workspaces.

**2026-09-14 Phase 7 + 8 — Security + Multi-location:** Added security headers, configurable CORS/body limits, global and login rate limiting, session activity tracking, authenticated workspace directory, office-admin multi-workspace discovery, vendor-scoped workspace access, minimal workspace switcher, and fixed the undefined `smartSuppliers` Dashboard crash.

### Audit log — 2026-09-14 Phase 9 + 10
- Added workspace-scoped Operations Reports API and Reports UI with CSV export.
- Added final production audit documentation.
- Fixed Dashboard Decision Intelligence `demandMenu` runtime binding and exposed Reports through existing navigation.

## BizLift 2.0 Audit Log — 14 Sep 2026
- Phase 1: Added workspace-aware Digital Twin scenario simulation at `/api/intelligence/digital-twin` with demand stress testing, projected revenue, ingredient consumption, stockout impact, procurement cost, profit proxy, comparison scenarios, warnings, and explainability. Simulations do not mutate operational data.
- Phase 2: Added Money Leak Detector at `/api/intelligence/money-leaks`, ranking stockout exposure, waste, expiry, thin-margin menus, procurement exposure, and cancellations using workspace data.
- Dashboard: Added Digital Twin and Money Leak Detector sections inside Decision Intelligence with +10%/+20%/+50% simulation controls and ranked leak visibility.


### 2026-09-14 BizLift 2.0 Phase 3 + 4 — Action Optimization + Waste Rescue
- Added Action Optimizer at `/api/intelligence/action-optimizer` to rank reorder, waste-rescue and margin-review actions by estimated benefit, action cost, net benefit, priority and confidence.
- Added human-in-the-loop approval at `/api/intelligence/action-optimizer/approve`; reorder approvals create real purchase orders through the existing procurement workflow, while recommendation approvals are persisted as outcomes.
- Added Waste Rescue Engine at `/api/intelligence/waste-rescue`, connecting near-expiry ingredients to linked menu recipes and estimating recoverable inventory value and revenue opportunity.
- Added Action Optimizer and Waste Rescue sections to the existing Decision Intelligence UI without changing the navigation structure.
- Preserved operational safety: rescue recommendations do not fabricate sales or silently mutate inventory; actual consumption remains POS-driven.
- Added `docs/BIZLIFT_2_0_PHASE3_4.md`.
- Backend syntax and seeded-workspace service smoke tests passed.

## BizLift 2.0 — Phases 5–6 Audit Log (2026-09-14)
- Added Impact Ledger / Learning Loop with expected vs realized recommendation value, prediction accuracy and success rate.
- Added Decision Center API combining highest-value actions, operational risk, expected benefit and closed-loop impact.
- Added embedded Boardroom Brief to the existing Decision Intelligence dashboard; no separate dashboard architecture introduced.
- Recommendation outcomes now support measurement source and measured timestamp.

- 2026-09-14 — Added **Boardroom Mode** below Settings in the dashboard sidebar: executive decision brief, operational exposure, top action, money leaks, operational pulse, and closed-loop learning metrics.

### 2026-09-27 — Final Hardening + Focus Area 4 BI Variance
- Froze the BizLift feature set for final hackathon polishing; no unrelated feature expansion planned.
- Added workspace-aware `GET /api/intelligence/bi-variance?days=N` for enterprise-style Plan vs Actual variance analysis across Revenue, Procurement Spend and Waste Cost.
- Added explicit baseline/reconciliation metadata so the report distinguishes an analytical operating baseline from audited accounting budgets.
- Added Plan vs Actual Variance to the existing Operations Reports page instead of introducing another navigation-heavy module.
- Confirmed Boardroom Mode remains directly below Settings in the sidebar.
- Backend syntax validation passed and the new BI variance service was smoke-tested across all four seeded workspaces.
- Full frontend production build remains a local validation step because this packaging environment could not complete dependency installation.
- Added `docs/FINAL_HARDENING_AND_FOCUS4.md`.

---

## Frontend Upgrade — Batch 02

Batch 02 introduces the responsive authenticated application shell and local API proxy architecture. See `CHANGELOG_BATCH_02.md` for the exact changes and validation status.


## Frontend Upgrade — Batch 03

Batch 03 adds the landing-page motion layer and hardens authentication UX. The landing page now uses viewport-triggered reveal animations, smooth anchor scrolling, reduced-motion support, and staged hero/section transitions without changing the existing visual language. Authentication now accepts a vendor ID as an additional workspace hint, returns clearer API errors, and `/login` correctly renders the vendor login screen instead of redirecting to the portal.

### Demo access
For the seeded SnapEats workspace, use `snapeats@techparkone.com` with the seeded demo password `snapeats123`. The optional Vendor ID is `snapeats`.


## Batch 03 Fix 01
Login now uses the Vite-proxied `/api/auth/login` endpoint, removes manual Vendor ID entry, resolves workspace identity from the authenticated account, and restores `npm start` for the backend.

## Batch 04 — Visual Depth + Home Experience (2026-09-29)
- Preserved the existing authenticated Dashboard sidebar and top navigation by removing the duplicate AppShell wrapper.
- Preserved the established green/dark visual language used by the existing dashboard and operational pages.
- Kept Batch 03 authentication fixes intact.
- Upgraded the public home page with a restrained CSS 3D operations-core hero, floating intelligence cards, and a concise capability snapshot.
- No new sidebar, no second top navigation, and no dashboard redesign.


## Batch 05 — Dashboard + Recharts Polish
- Preserved the existing sidebar, top navigation and theme.
- Kept dashboard top controls in one horizontal row.
- Added restrained card interaction polish and Recharts sizing hardening.
- POS, Inventory, Reports, vendor selection and login flows remain unchanged.
See `docs/BATCH_05_TEST_GUIDE.md`.

## Batch 06 — Operations Workflows
Batch 06 improves operational reliability and dashboard presentation while preserving the existing BizLift product identity. See `CHANGELOG_BATCH_06.md` and `docs/BATCH_06_TEST_GUIDE.md`.


## Batch 07 + 08 — Business Intelligence + Analytics
See `CHANGELOG_BATCH_07_08.md` and `docs/BATCH_07_08_TEST_GUIDE.md`.

## Batch 09 — Advanced UI/UX

Batch 09 applies a site-wide frontend polish pass: ambient depth, premium card interactions, improved focus states, chart hover polish, responsive scrollbars and a cleaner full-viewport shell. Existing BizLift navigation, theme, authentication, workspace selection, dashboard workflows, POS and Inventory behavior are preserved. See `CHANGELOG_BATCH_09.md` and `docs/BATCH_09_TEST_GUIDE.md`.


## Batch 09 — Real Advanced Frontend Experience
See `CHANGELOG_BATCH_09_REAL_EXPERIENCE.md` and `docs/BATCH_09_TEST_GUIDE.md`. This pass wires Three.js/R3F, GSAP, Lenis, Motion and Radix primitives into the frontend rather than relying only on CSS.

## Batch 10 — Final QA + Production Hardening
- Runtime error recovery boundary and 404 route
- Route-aware document titles and scroll reset
- Reduced-motion handling for Lenis
- Dependency-resolution hardening with `enhanced-resolve@5.26.0`
- Final preservation pass across existing BizLift flows
- See `CHANGELOG_BATCH_10.md` and `docs_BATCH_10_TEST_GUIDE.md`

## Batch 11 — Database Foundation

BizLift now includes a PostgreSQL + Prisma production data foundation while preserving the existing JSON-backed demo mode. The relational model is tenancy-ready (`Organization → Office → Vendor`) and covers operational, procurement, forecasting and analytics entities. See `docs/BATCH_11_TEST_GUIDE.md` and `backend/prisma/schema.prisma` for setup and migration details.

## Batch 12 — Authentication + RBAC

Batch 12 connects authentication to the Batch 11 PostgreSQL foundation while preserving the JSON demo fallback. PostgreSQL sessions persist only SHA-256 token hashes, support expiry/revocation, and expose sanitized role/permission claims. RBAC definitions now cover owner, admin, office admin, manager, vendor, inventory manager, cashier, analyst, and viewer. Reusable role/permission middleware is available for subsequent route hardening.

## Batch 14 — Backend Architecture

Batch 14 introduces the backend architecture foundation without replacing the working domain services. Requests now receive correlation IDs, API errors use a centralized operational-error contract, and structured request telemetry records tenant scope and latency. Shared controller and validation helpers establish a consistent route → controller → service → repository boundary. See `backend/services/README_ARCHITECTURE.md` and `docs_BATCH_14_TEST_GUIDE.md`.


## Batch 16 — ML Platform

Batch 16 adds a tenant-scoped ML lifecycle for demand forecasting: model registry/versioning, training runs, predictions with confidence bounds, readiness checks, and drift monitoring. The baseline model uses a moving-average + recent-trend algorithm so the platform works without adding a heavyweight ML runtime.

### ML APIs
- `GET /api/ml/readiness`
- `GET /api/ml/runs`
- `GET /api/ml/predict?itemKey=<key>&horizon=7&lookbackDays=30`
- `POST /api/ml/train`
- `POST /api/ml/drift`

PostgreSQL adds `ml_models`, `ml_training_runs`, `ml_predictions`, and `ml_drift_checks`. JSON demo mode remains supported.

## Batch 17 — Real-Time Platform

Batch 17 adds tenant-scoped Server-Sent Events (SSE) for operational updates. The durable replay source is the existing analytics event stream, while an in-process publisher delivers low-latency events to active subscribers. Real-time access is protected by the `realtime:read` permission and the existing authentication + tenant boundary.

Endpoints:
- `GET /api/realtime/health`
- `GET /api/realtime/stream?replay=25`

The stream supports replay of recent analytics events, live delivery, connection heartbeats, and automatic subscriber cleanup.

## Batch 18 — Procurement Intelligence

Batch 18 adds a tenant-scoped procurement cockpit, supplier scorecards, procurement permissions, transactional PostgreSQL purchase-order creation, approval workflow, and procurement analytics events.

Key endpoints: `GET /api/procurement/cockpit`, `POST /api/procurement/orders`, `POST /api/procurement/orders/:id/approve`.

## Batch 19 — AI Copilot

BizLift now includes a tenant-scoped AI Copilot decision layer. The Copilot synthesizes canonical data, procurement signals, and ML readiness into explainable proposed actions. Operational changes remain human-approved and auditable.

## Batch 20 — Security + Observability

BizLift now includes tenant-scoped audit/security events, operational health and metrics endpoints, request correlation, rate-limit telemetry, and a Security & Observability panel inside the existing Settings experience.


## Batch 21 — Testing + DevOps

Batch 21 adds repeatable regression orchestration, environment diagnostics, a backend smoke test, and GitHub Actions CI for backend and frontend validation. Existing product behavior and the Batch 20 security/observability layer are preserved. See `CHANGELOG_BATCH_21.md` and `docs_BATCH_21_TEST_GUIDE.md`.

# BizLift Unified Engineering & Operations Guide

> This README consolidates the project's batch changelogs, batch test guides, and component-level README documents. Feature-specific architecture documents under `docs/` remain available as focused references.

## Run BizLift locally

### 1. Backend (Terminal 1)

From the extracted project root:

```bash
cd backend
npm install
npm run prisma:generate
npm run prisma:deploy
npm run db:seed
npm run dev
```

The backend loads `backend/.env` through the package scripts. Ensure PostgreSQL is running and `DATABASE_URL` points to your local `bizlift` database. If you are intentionally using JSON demo mode, follow the environment configuration documented in `backend/.env.example` and do not run database commands unless PostgreSQL is configured. Keep this terminal open.

### 2. Frontend (Terminal 2)

From the project root in a second terminal:

```bash
cd client
npm install
npm run dev
```

Open the local URL printed by Vite, usually `http://localhost:5173`. The backend should remain running in Terminal 1. If the login page loads but API requests fail, check the backend terminal, `client` API base URL configuration, CORS settings, and `backend/.env`.

### 3. Validation commands

```bash
# In backend/
npm run doctor
npm run smoke
npm run test:auth-credentials
npm run test:architecture
npm run test:tenant
npm run test:data
npm run test:ml
npm run test:realtime
npm run test:procurement
npm run test:copilot
npm run test:observability
npm run test:all

# In client/
npm run build
```

Do not run `db:seed` against a production database unless you have reviewed the seed script and explicitly intend to seed demo data. Never use demo credentials or `.env` secrets in production.

## SnapEats development login

- Email: `snapeats@techparkone.com`
- Password: `snapeats123`

These are demo credentials only. Change/remove them before exposing a deployment publicly.

## Release status and limitations

A packaged ZIP or a successful syntax check does not by itself establish production readiness. Verify the frontend production build, Prisma migration deployment, backend regression suite, tenant-isolation tests, data-import flow, and the end-to-end restaurant onboarding journey in the target environment. Forecasting metrics must be presented with their validation split, units, sample size, and data-readiness context; do not claim a generic accuracy percentage without evidence.

## Consolidated batch history and test guides



---

## Source document: `backend/CHANGELOG_BATCH_16.md`

# Batch 16 — ML Platform

## Added
- ML model registry with versioned demand models.
- Training-run tracking with dataset/train/validation row counts and MAE/RMSE/MAPE.
- Demand prediction persistence with confidence intervals.
- Model drift checks comparing baseline and recent demand.
- ML readiness endpoint.
- Tenant-scoped ML APIs and permissions (`ml:read`, `ml:write`).
- PostgreSQL migration for `ml_models`, `ml_training_runs`, `ml_predictions`, and `ml_drift_checks`.
- JSON-demo fallback for local compatibility.

## Model
- Baseline algorithm: moving-average + recent trend.
- This batch establishes the lifecycle platform; heavier model families can be plugged in later without changing API contracts.


---

## Source document: `backend/docs_BATCH_16_TEST_GUIDE.md`

# Batch 16 — ML Platform Test Guide

## Backend

```bash
cd backend
npm install
# recreate backend/.env locally if needed
npm run prisma:generate
npm run prisma:deploy
npm run db:seed
npm run test:ml
```

## API

With the backend running, authenticated users can use:

- `GET /api/ml/readiness`
- `GET /api/ml/runs`
- `GET /api/ml/predict?itemKey=<key>&horizon=7`
- `POST /api/ml/train` with `{ "itemKey": "<key>", "lookbackDays": 30, "horizon": 7 }`
- `POST /api/ml/drift` with `{ "itemKey": "<key>" }`

All endpoints require the existing tenant workspace context and ML permissions.


---

## Source document: `backend/README.md`

# BizLift Backend

## Run locally

1. Install dependencies

```bash
npm install
```

2. Bootstrap demo data (optional)

```bash
npm run bootstrap:demo
```

3. Start development server

```bash
npm run dev
```

The backend will run on `http://localhost:5002`.

## Batch 11 — PostgreSQL + Prisma

The backend now contains a production PostgreSQL foundation under `prisma/`.

### Demo mode (default)

```bash
npm install
npm run dev
```

The existing JSON-backed persistence remains active when `BIZLIFT_DB_MODE=json` (or when the variable is omitted).

### PostgreSQL mode

1. Copy `.env.example` to `.env`.
2. Set `BIZLIFT_DB_MODE=postgres`.
3. Set a valid `DATABASE_URL`.
4. Run:

```bash
npm install
npm run prisma:generate
npm run prisma:migrate
npm run db:seed
npm run dev
```

`GET /api/system/health` reports the active persistence provider and connection status.

The PostgreSQL schema is intentionally introduced before the application domains are switched over. This lets later batches move authentication, inventory, sales, procurement and analytics behind repositories without breaking the working SnapEats demo.

## Batch 12 — Authentication + RBAC

Authentication now uses the PostgreSQL `users` and `sessions` tables whenever `BIZLIFT_DB_MODE=postgres`. Session bearer tokens are never persisted directly in PostgreSQL; only their SHA-256 hashes are stored. Sessions can expire or be revoked, including a revoke-all operation.

RBAC permissions are centralized in `services/authService.js`, with reusable enforcement middleware in `middleware/requireRole.js`. Legacy `vendor` and `office_admin` roles remain supported while the permission catalog introduces owner, admin, manager, inventory manager, cashier, analyst, and viewer roles for the next batches.

### Auth endpoints

- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/auth/permissions`
- `POST /api/auth/logout`
- `POST /api/auth/logout-all`


## Batch 15 — Data Platform

### Purpose

Batch 15 introduces a canonical data layer above operational services without replacing the existing JSON compatibility path.

### Endpoints

- `GET /api/data/overview`
- `GET /api/data/quality`
- `GET /api/data/events`
- `POST /api/data/events`
- `POST /api/data/snapshots`

All endpoints are authenticated and workspace/tenant scoped. Analytics reads use `analytics:read`; event and snapshot writes use `analytics:write`.

### PostgreSQL migration

The Prisma schema adds `DataMetricSnapshot` mapped to `data_metric_snapshots`. Run `npm run prisma:generate` and `npm run prisma:migrate` from the backend when PostgreSQL is available.

## Batch 16 — ML Platform

The backend now exposes a tenant-scoped ML lifecycle under `/api/ml` for demand forecasting. It includes model readiness, versioned training runs, persisted predictions, and drift checks. The baseline algorithm is a moving-average + recent-trend model designed as a lightweight platform reference; future model families can implement the same lifecycle contracts.

## Batch 20 Observability

Operational endpoints are exposed under `/api/observability`. Health is public/lightweight; metrics, audit, and security endpoints require authenticated tenant-scoped access and permissions.


---

## Source document: `backend/services/README_ARCHITECTURE.md`

# BizLift Backend Architecture — Batch 14

## Request flow

`HTTP → middleware → route → controller → service → repository → data source`

Cross-cutting concerns are handled before business logic:

- `requestContext` — stable request correlation ID
- `requireAuth` — authenticated identity
- `requireWorkspace` + `requireWorkspaceAccess` — tenant boundary
- `requirePermission` — RBAC
- `errorHandler` — consistent API errors
- `requestLogger` — structured request telemetry

## Layers

### Routes
Declare HTTP paths and middleware only. Avoid business calculations here.

### Controllers
Translate HTTP input into service calls and shape responses. `utils/controller.js` contains shared tenant-scope and response helpers.

### Services
Own business rules and domain calculations. Existing intelligence, inventory, sales, procurement and analytics services remain reusable.

### Repositories
Own persistence/state access. PostgreSQL repositories can be introduced incrementally without forcing a rewrite of JSON compatibility mode.

### Utilities
`appError.js` and `validate.js` provide typed operational errors and small input validators.

## Error contract

Operational failures return:

```json
{
  "success": false,
  "code": "FORBIDDEN",
  "message": "Access denied.",
  "requestId": "..."
}
```

Unknown failures return `INTERNAL_ERROR` without exposing stack traces to clients.

## Tenant rule

Controllers and services should consume the authenticated tenant scope (`req.tenant`) instead of trusting arbitrary organization/vendor IDs from the client.


---

## Source document: `CHANGELOG_AUTH_HOTFIX_2026-10-09.md`

# SnapEats Authentication Hotfix — 2026-10-09

## Fixed
- Synchronized the SnapEats demo password hash across PostgreSQL seed data and JSON fallback data.
- Added `test:auth-credentials` to verify `snapeats@techparkone.com` / `snapeats123`.
- Preserved the Batch 19 AI Copilot project unchanged apart from this authentication consistency fix.

## Credentials
- Email: `snapeats@techparkone.com`
- Password: `snapeats123`
- Vendor: `snapeats`
- Office: `techpark-one`

## Fresh setup
```bash
cd backend
npm install
npm run prisma:generate
npm run prisma:deploy
npm run db:seed
npm run test:auth-credentials
npm run dev
```


---

## Source document: `CHANGELOG_BATCH_02.md`

# BizLift — Batch 02

## Frontend shell + API connectivity hardening

### Added
- New responsive authenticated application shell.
- Desktop collapsible sidebar navigation.
- Mobile drawer navigation.
- Workspace identity in the top bar.
- Theme toggle persistence.
- Logout flow with local auth cleanup.
- Initial Settings route placeholder for the next UX phases.
- Structured navigation groups for Workspace, Operations, and Intelligence.

### Fixed
- Replaced browser-side hardcoded `http://localhost:5002/api` URLs with same-origin `/api` paths.
- Added Vite development proxy from `/api` to `http://localhost:5002`.
- Login now uses the shared `apiFetch` client and bypasses workspace query parameters for authentication.
- This removes the localhost/127.0.0.1 CORS mismatch as a source of browser `Failed to fetch` errors during local development.
- Preserved the existing backend API and authentication contract.

### Preserved
- Existing backend routes and data logic.
- Existing dashboard, POS, inventory and reporting functionality.
- Existing authentication/session storage behavior.

### Validation
- JavaScript syntax checks passed for the changed backend/config/API files.
- Full Vite build could not be run because the local `node_modules` installation in the packaging environment was incomplete; the project package manifests were not altered to work around this.

## Local run

Terminal 1:

```bash
cd backend
npm install
npm run dev
```

Terminal 2:

```bash
cd client
npm install
npm run dev
```

Open the Vite URL shown by the client terminal. The frontend now calls `/api/...`, and Vite forwards those requests to the backend on port 5002.


---

## Source document: `CHANGELOG_BATCH_03.md`

# BizLift Batch 03 — Landing Motion + Login Hardening

## Included
- Added dependency-free landing-page motion primitives using IntersectionObserver and GPU-friendly transforms.
- Added smooth in-page anchor scrolling with reduced-motion accessibility handling.
- Added staged reveal treatment for hero, About, visual dashboard, and How It Works sections.
- Fixed `/login` so it renders the actual `LoginPage` rather than the workspace portal.
- Hardened login payload handling and API error reporting.
- Added optional Vendor ID support to the login form and backend lookup, while preserving email-based authentication.
- Normalized vendor ID matching for legacy hyphenated IDs.
- Preserved workspace resolution, token storage, and automatic dashboard navigation.

## Validation
- Backend auth route and service passed `node --check`.
- Source-level verification completed against the Batch 02 ZIP.
- Full Vite production build could not be completed because frontend dependencies are not installed in the packaging environment. Run `npm install` and `npm run build` inside `client` locally.


---

## Source document: `CHANGELOG_BATCH_03_FIX_01.md`

# Batch 03 Fix 01 — Login Route + Automatic Vendor Resolution

## Fixed
- LoginPage now calls `/api/auth/login` so Vite proxies the request to the backend on port 5002.
- Removed the Vendor ID input from the login UI.
- Login sends only business email and password; backend resolves the account vendor and office automatically.
- Added `npm start` script to backend package.json.
- Updated AppShell logout to use `/api/auth/logout`.

## Demo credentials
- Email: `snapeats@techparkone.com`
- Password: `snapeats123`
- Vendor and office are resolved from the authenticated account.


---

## Source document: `CHANGELOG_BATCH_04.md`

# BizLift Batch 04 — Visual Depth + Home Experience

## UI preservation
- Removed the duplicate `AppShell` wrapper from authenticated routes. Existing pages such as `DashboardPage` already own their established sidebar and top navigation.
- No authenticated shell redesign.
- Restored the established green/black visual language rather than introducing a new accent.

## Home page
- Added a CSS 3D operations-core hero with subtle orbiting depth and floating KPI cards.
- Added a four-card home snapshot describing the platform value.
- Kept the existing food hero image, public navbar, About/How It Works sections, and theme behavior.
- Motion respects `prefers-reduced-motion`.

## Authentication
- Batch 03 login remains email + password only.
- Vendor and office are resolved automatically by the authenticated account.


---

## Source document: `CHANGELOG_BATCH_05.md`

# BizLift Batch 05 — Dashboard + Recharts Polish

## Preserved
- Existing BizLift dark/light theme and green accent.
- Existing dashboard sidebar and top navigation structure.
- Existing POS, Inventory, Reports, vendor selection, login and landing-page flows.

## Changes
- Dashboard top controls are now a single non-wrapping horizontal row.
- Workspace selector, date controls, Download Report, POS, Inventory and theme controls no longer wrap underneath one another.
- POS and Inventory controls retain the existing visual language.
- Added restrained hover polish to dashboard cards without changing the theme.
- Hardened Recharts responsive containers for flexible dashboard cards to reduce negative-width sizing warnings.
- No new navigation/sidebar was introduced.

## Plan position
Batch 05 of 10: Dashboard + Recharts polish.


---

## Source document: `CHANGELOG_BATCH_06.md`

# BizLift Batch 06 — Operations Workflows

## Focus
Batch 06 strengthens the existing operational flow without changing the BizLift identity or navigation.

## Changes
- Removed the TechPark One / SnapEats workspace selector from the authenticated dashboard top bar after login. The logged-in workspace remains session-scoped and workspace switching is still available through the existing application flow.
- Rebalanced the remaining top-bar controls so Light/Dark, Download Report, POS & Billing, and Inventory remain fully visible in one horizontal row with compact spacing and horizontal overflow instead of clipping.
- Reduced the dashboard's overly box-heavy feel by flattening analytics containers, reducing nested borders, and giving charts more visual height.
- Made dashboard charts more visually prominent by increasing their rendered height and removing unnecessary inner chart-card framing.
- Hardened Action Center lifecycle updates so failed review/snooze/dismiss requests surface an error instead of silently refreshing.
- Hardened POS cart quantity changes so users cannot increment an item beyond recipe ingredient availability before checkout.
- Preserved POS checkout → inventory deduction and order cancellation → stock restoration behavior.
- Preserved login, vendor selection, workspace context, existing sidebar, theme, homepage, reports, inventory, and all existing routes.

## Identity constraint
No new sidebar, top navigation, theme, or application shell was introduced.


---

## Source document: `CHANGELOG_BATCH_07_08.md`

# BizLift Batch 07 + 08 — Business Intelligence + Analytics & Reporting

- Added richer operations reporting: daily revenue momentum, demand by hour, and revenue by category.
- Kept the existing API/workspace/auth architecture intact.
- Expanded report payload with `hourlyDemand` and `revenueByCategory`.
- Refined dashboard chart presentation: larger plotting area, less nested framing, and more breathing room.
- Preserved the existing sidebar, top navigation, theme, landing/login/vendor selection, POS, inventory and routes.
- Added a combined BI/analytics test guide.


---

## Source document: `CHANGELOG_BATCH_09.md`

# BizLift Batch 09 — Advanced UI/UX

## Goal
A site-wide frontend polish pass focused on premium interaction, depth, readability, responsiveness and visual consistency while preserving the established BizLift identity.

## Changes
- Added a shared Batch 09 advanced visual layer across public, authentication, selection, workflow, dashboard and analytics pages.
- Preserved the existing black/white foundation and `#9ad17b` green accent.
- Removed the stale Vite starter `#root` max-width/padding so the application can use the viewport correctly.
- Added subtle ambient radial lighting and a restrained grid texture to advanced pages.
- Added premium hover depth, border response and soft elevation to feature cards, KPI cards and workflow cards.
- Improved login and workspace selection focus states with accessible green focus rings.
- Added responsive premium scrollbars and mobile-safe interaction behavior.
- Added chart hover brightness polish without replacing the existing Recharts implementation.
- Extended the visual treatment to Landing, Portal, Vendor Selection, Login, POS, Inventory, Reports and Dashboard.
- Kept the existing dashboard sidebar and top navigation intact; no duplicate application shell was introduced.
- Kept POS, Inventory, workspace selection, authentication and existing routes intact.
- Added reduced-motion fallbacks for the new interaction layer.

## Validation
- Source-level JSX/JavaScript syntax checks should be run before release.
- A full frontend production build must be run in an environment where npm install/build can complete; Batch 07+08 previously timed out during the frontend build, so this batch does not claim a completed production build without rerunning it.


---

## Source document: `CHANGELOG_BATCH_09_REAL_EXPERIENCE.md`

# Batch 09 — Real Advanced Frontend Experience

This is the implementation pass that actually wires the requested frontend libraries into BizLift.

## Added
- Three.js + React Three Fiber + Drei 3D operations visual
- GSAP + @gsap/react entrance animation system
- Lenis smooth scrolling at the application level
- Motion-powered micro-interactions
- Radix Tooltip primitive for contextual UI
- Site-wide ambient visual system, live intelligence ribbons, depth, glow, motion and responsive treatment
- Enhanced landing, login, workspace selection, dashboard, reports, POS, inventory and settings surfaces

## Preserved
- Existing BizLift green/black/white identity
- Existing dashboard sidebar and top navigation
- Existing login API and credentials flow
- Existing vendor selection and workspace flow
- Existing POS and inventory business logic
- Existing Recharts analytics

## Validation
- Source was inspected after edits. A full dependency install/build could not be completed in the isolated build environment because npm network/package resolution timed out; run `npm install` and `npm run build` locally.


---

## Source document: `CHANGELOG_BATCH_10.md`

# Batch 10 — Final QA + Production Hardening

## What changed
- Added a global React error boundary with a recovery/reload experience.
- Added a safe catch-all 404 route instead of rendering a blank page for unknown URLs.
- Added route-aware document titles for core BizLift surfaces.
- Added automatic scroll reset on route changes.
- Disabled Lenis when the user has `prefers-reduced-motion` enabled.
- Pinned `enhanced-resolve` to published `5.26.0` to prevent the ETARGET dependency-resolution issue encountered during installation.
- Preserved the existing BizLift navigation, theme, routes, backend APIs, POS, inventory, analytics, 3D experience and animation system.

## Validation
- Backend JavaScript syntax checks passed for `backend/index.js` and `backend/services/reportingService.js`.
- ZIP integrity check passed.
- Full frontend `npm install` / Vite production build could not be completed in the isolated build environment because npm dependency installation timed out; no successful production-build claim is made.


---

## Source document: `CHANGELOG_BATCH_11.md`

# BizLift Batch 11 — Database Foundation

## Added
- PostgreSQL data model using Prisma.
- Organization → Office → Vendor tenancy-ready hierarchy.
- Relational models for users, sessions, inventory, recipes, sales, inventory transactions, waste, suppliers, purchase orders, demand observations, forecast runs, recommendation outcomes and analytics events.
- Explicit indexes for operational and analytical query paths.
- PostgreSQL baseline migration.
- PostgreSQL demo seed script for the existing TechPark One/SnapEats ecosystem.
- Persistence health reporting.
- Environment template for switching between JSON demo mode and PostgreSQL mode.

## Compatibility
- Existing JSON-backed demo mode remains the default.
- Existing frontend routes and working demo workflows are preserved.
- PostgreSQL is opt-in in this batch so the working application is not broken by an infrastructure change.

## Next
Batch 12 will build production authentication and RBAC on top of this foundation.


---

## Source document: `CHANGELOG_BATCH_12.md`

# Batch 12 — Authentication + RBAC

## Implemented

- PostgreSQL-backed login when `BIZLIFT_DB_MODE=postgres` is enabled.
- JSON-backed login remains available as a compatibility fallback.
- Session tokens are random bearer tokens; only SHA-256 token hashes are persisted in PostgreSQL.
- PostgreSQL sessions support expiry and revocation.
- `/api/auth/me` returns sanitized identity plus permissions.
- `/api/auth/permissions` exposes the authenticated role/permission set.
- `/api/auth/logout` revokes the active PostgreSQL session.
- `/api/auth/logout-all` revokes every active session for the user.
- Added RBAC permission definitions for owner, admin, office admin, manager, vendor, inventory manager, cashier, analyst, and viewer.
- Added reusable `requireRole()` and `requirePermission()` middleware.
- Existing vendor and office-admin roles remain compatible with the current application.
- Frontend auth helpers now understand permission claims and clear workspace state on authentication failure.

## Compatibility

- Existing login form remains Business Email + Password.
- Existing dashboard/sidebar/top navigation is preserved.
- Existing JSON demo workflow remains intact.


---

## Source document: `CHANGELOG_BATCH_13.md`

# Batch 13 — True Multi-Tenancy

## Summary

Batch 13 turns the existing Organization → Office → Vendor hierarchy into an enforced tenant boundary. Browser-supplied workspace IDs are treated as requests; the backend resolves and authorizes the actual organization, office and vendor relationship.

## Security

- PostgreSQL validates vendor → office → organization ownership before workspace access.
- Owner/admin users can access workspaces inside their organization.
- Office admins can access vendors inside their assigned office.
- Vendor-scoped users remain restricted to their assigned vendor.
- Cross-organization access returns `403`.
- Unknown workspace IDs return `404`.
- JSON demo mode retains the same workspace isolation behavior.

## API

- `GET /api/auth/context`
- `GET /api/workspaces`
- `GET /api/workspaces/:officeId/:vendorId`

## Frontend compatibility

- Existing visual theme, navigation and product workflows are preserved.
- Operational components no longer fall back to hardcoded `techpark-one` / `snapeats` workspace IDs.
- Existing session-selected workspace remains the normal frontend context.

## Validation

- All backend JavaScript files pass `node --check`.
- JSON tenant boundary regression test passes.
- ZIP integrity verified after packaging.
- Live PostgreSQL tenant test should be run in the user's local Batch 13 environment with `BIZLIFT_DB_MODE=postgres`.


---

## Source document: `CHANGELOG_BATCH_14.md`

# Batch 14 — Backend Architecture

## Added
- Request correlation IDs via `x-request-id`.
- Centralized `AppError` operational error type.
- Centralized 404 and API error handlers.
- Structured API request logging with duration and tenant scope.
- Shared controller helpers for response and tenant scope extraction.
- Small reusable input validation helpers.
- Backend architecture guide documenting route/controller/service/repository boundaries.

## Preserved
- Existing JSON demo mode.
- PostgreSQL/Prisma mode.
- Batch 12 authentication and RBAC.
- Batch 13 tenant isolation.
- Existing frontend navigation, theme and workflows.

## Validation
- Backend syntax audit.
- Existing tenant-boundary regression test.
- Route 404 and request-id behavior smoke-tested.


---

## Source document: `CHANGELOG_BATCH_15.md`

# Batch 15 — Data Platform

## Added
- Workspace-scoped data platform service with PostgreSQL and JSON compatibility paths.
- Canonical operational metric overview covering inventory, stock risk, sales, transactions, waste, procurement and suppliers.
- Data-quality endpoint with explicit checks and score.
- Tenant-scoped analytics event ingestion and retrieval.
- Point-in-time metric snapshot persistence.
- Prisma `DataMetricSnapshot` model and PostgreSQL migration.
- `analytics:read` and `analytics:write` permissions.
- `backend/scripts/testDataPlatform.js` smoke test.
- Frontend-neutral data API foundation for future dashboard/BI integration.

## Preserved
- Existing Batch 12 authentication/RBAC.
- Batch 13 tenant isolation.
- Batch 14 request/controller/error architecture.
- Existing frontend navigation and visual design.
- JSON demo mode.

## Validation
- JavaScript syntax audit passed.
- Architecture regression passed.
- Tenant boundary regression passed.
- Data platform JSON-mode smoke test passed: 12 metrics, quality score 100, analytics event round trip verified.
- PostgreSQL migration is included and should be applied locally with `npm run prisma:migrate`.
- Full frontend production build is not claimed as part of this packaging run.


---

## Source document: `CHANGELOG_BATCH_16.md`

## Correction — 2026-10-09
- Fixed missing closing brace in the Prisma `Office` model that caused P1012 schema validation at `model Vendor`.
- Updated backend `dev`, `start`, and `db:seed` scripts to load `.env` automatically using Node's `--env-file=.env`.


---

## Source document: `CHANGELOG_BATCH_17.md`

# Batch 17 — Real-Time Platform

- Added tenant-scoped SSE transport under `/api/realtime`.
- Added replay from durable `analytics_events` data.
- Added in-process scoped pub/sub for low-latency events.
- Analytics event writes now publish to active real-time subscribers.
- Added `realtime:read` RBAC permission.
- Added connection health and heartbeat behavior.
- Added real-time subscriber cleanup on disconnect.
- Added Batch 17 smoke test.
- Preserved existing navigation, API contracts, PostgreSQL, JSON fallback, authentication and tenant isolation.


---

## Source document: `CHANGELOG_BATCH_18.md`

# Batch 18 — Procurement Intelligence

## Added

- Procurement cockpit API with tenant-scoped recommendations and supplier scorecards.
- Procurement permissions: `procurement:read`, `procurement:write`.
- PostgreSQL procurement order creation using the existing `PurchaseOrder`, `PurchaseOrderItem`, and `Supplier` models.
- Transactional purchase-order creation with supplier resolution/creation.
- Purchase-order approval lifecycle (`draft/submitted -> approved`).
- Analytics events for procurement order creation and approval.
- JSON-demo compatibility for procurement cockpit and order creation.
- Procurement smoke test and Batch 18 test guide.

## Design

Order recommendations combine stock, threshold, recent usage, lead time and safety stock into an auditable buy quantity. Procurement remains tenant-scoped through the existing Batch 13 workspace boundary.


---

## Source document: `CHANGELOG_BATCH_19.md`

# Batch 19 — AI Copilot

- Added tenant-scoped AI Copilot brief and action APIs.
- Added auditable `ai_copilot_runs` and `ai_copilot_actions` PostgreSQL models/migration.
- Added explainable procurement, waste-review, and ML-readiness actions.
- Added `copilot:read` permission while preserving `actions:approve` for execution decisions.
- Added approval/dismissal workflow; procurement actions require human approval before PO creation.
- Added Decision Intelligence UI panel for generating and reviewing Copilot recommendations.
- Kept deterministic/local inference for this batch; external LLM credentials are not required.


---

## Source document: `CHANGELOG_BATCH_20.md`

# BizLift Batch 20 — Security + Observability

## Delivered

- Added tenant-scoped `AuditEvent` PostgreSQL model and migration.
- Added audit/security event persistence with JSON compatibility fallback.
- Added operational health endpoint: `GET /api/observability/health`.
- Added authenticated operational metrics endpoint: `GET /api/observability/metrics`.
- Added tenant-scoped audit endpoint: `GET /api/observability/audit`.
- Added tenant-scoped security-event endpoint: `GET /api/observability/security`.
- Added request correlation and operational request metrics to structured logging.
- Added rate-limit response headers and rate-limit telemetry.
- Added login success/failure security audit events.
- Added `audit:read`, `security:read`, and `observability:read` permissions for approved operational roles.
- Added Security & Observability panel to the existing Settings page without changing the existing navigation structure.
- Added Batch 20 smoke test and preserved all previous regression tests.

## APIs

```text
GET /api/observability/health
GET /api/observability/metrics
GET /api/observability/audit
GET /api/observability/security
```

`health` is intentionally lightweight and does not require an authenticated workspace. The remaining operational endpoints require authentication, workspace authorization, tenant isolation, and the relevant permission.

## Security behavior

- Audit records retain request IDs for correlation.
- Audit and security queries are restricted to the authenticated tenant/workspace.
- Login failures record the normalized email as metadata for operational diagnosis; passwords and session tokens are never persisted in audit metadata.
- Rate-limit responses expose `X-RateLimit-Limit`, `X-RateLimit-Remaining`, and `Retry-After` where applicable.

## Validation

Passed in the packaging environment:

- `test:observability`
- `test:architecture`
- `test:tenant`
- `test:procurement`
- `test:ml`
- `test:realtime`
- `test:data`
- `test:copilot`
- `test:auth-credentials`
- JavaScript syntax checks for new/modified backend files

Not verified in the packaging environment:

- Prisma CLI validation/generation/deployment, because installed `node_modules` are not bundled and the environment could not resolve a local Prisma binary within the validation timeout.
- Frontend Vite build, because frontend `node_modules` are not bundled.

Run the Prisma/frontend checks locally after `npm install` as described in the Batch 20 test guide.


---

## Source document: `CHANGELOG_BATCH_21.md`

# Batch 21 — Testing + DevOps

- Added a deterministic backend regression orchestrator covering authentication, architecture, tenant isolation, data, ML, realtime, procurement, Copilot, and observability.
- Added a backend environment/production-readiness doctor with PostgreSQL connectivity checks.
- Added a lightweight backend smoke test for environment configuration.
- Added GitHub Actions CI for backend regression checks and frontend production builds.
- Kept the existing application UI, navigation, authentication, tenant model, and domain services unchanged.
- Preserved the SnapEats demo credentials and Batch 20 security/observability capabilities.


---

## Source document: `CHANGELOG_BATCH_22.md`

# Batch 22 — Production Launch

## Added
- Production release gate via `npm run release:check`.
- Production environment template: `backend/.env.production.example`.
- Backend production Dockerfile.
- Frontend production Dockerfile with Nginx SPA fallback.
- `docker-compose.production.yml` deployment reference.
- Production launch, verification, and rollback runbook.

## Safety
- Production gate requires PostgreSQL mode.
- Production gate rejects localhost CORS origins.
- No destructive database reset or migration command was added.
- Real secrets are not required in the release artifact.

## Validation note
The packaging environment does not contain installed project dependencies, so full Prisma-backed integration and frontend build validation must be run on the target development/CI environment after `npm ci`.


---

## Source document: `CHANGELOG_FINAL_BATCH_01.md`

# Final Batch 01 — Audit and Dashboard Repair

## Changes
- Fixed Top Selling Menu Items chart data selection: it now renders from normalized backend top-menu results or falls back to locally aggregated sales data.
- Normalized common backend field variants for menu names and quantities and filtered invalid/non-numeric values.
- Reworked the top-selling chart into a readable horizontal ranked bar chart with gradient fill, rounded ends, compact labels, and responsive container sizing.
- Added INR currency formatting to the revenue KPI to avoid raw floating-point values and overflowing long decimals.
- Reduced KPI typography responsively to keep long formatted values within their cards.

## Verification status
- Source-level inspection confirmed the previous chart rendered only when `dashboardAI.demand.topItems` was non-empty and chart bars consumed `units`, even though the main sales aggregation used a separate data source. This mismatch explains a likely empty chart when the demand endpoint has no usable top-items array.
- The code has not been browser-tested in this environment because `client/node_modules` is not present. Run `npm ci && npm run build` in `client` and verify the chart with real API data before release.


---

## Source document: `client/README.md`

# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.


---

## Source document: `client/src/CHANGELOG_BATCH_13.md`

# Changelog — Batch 13: True Multi-Tenancy

## Added

- Central tenant-boundary service for organization → office → vendor authorization.
- PostgreSQL-backed workspace resolution and ownership verification.
- Authorized workspace directory filtering for owner/admin, office-admin and vendor users.
- `GET /api/auth/context` for the authenticated tenant scope.
- `GET /api/workspaces/:officeId/:vendorId` for secure workspace resolution.
- `npm run test:tenant` boundary regression test.

## Security behavior

- Browser-supplied workspace IDs are treated as requests, not proof of access.
- Cross-organization access is rejected with `403`.
- A vendor outside the requested office is rejected.
- Unknown workspaces return `404`.
- Vendor-scoped users cannot switch to another vendor in the same office.
- Organization administrators can operate across workspaces belonging to their organization.
- Office administrators can operate across vendors belonging to their assigned office.

## Frontend compatibility

Removed hardcoded `techpark-one` / `snapeats` fallback workspace identifiers from operational pages and inventory modals. The authenticated session/workspace selection remains the source of context.

## Preserved

- Existing BizLift visual theme and navigation.
- Existing Batch 12 authentication and RBAC.
- JSON demo mode.
- PostgreSQL/Prisma foundation.
- Existing POS, inventory, reporting and intelligence workflows.


---

## Source document: `client/src/docs_BATCH_13_TEST_GUIDE.md`

# Batch 13 Test Guide — True Multi-Tenancy

## 1. Static checks

```bash
cd backend
node --check services/tenantService.js
node --check middleware/requireWorkspace.js
node --check middleware/requireWorkspaceAccess.js
node --check routes/workspaceRoutes.js
node --check routes/authRoutes.js
node --check scripts/testTenantBoundary.js
```

## 2. JSON compatibility boundary

```bash
BIZLIFT_DB_MODE=json npm run test:tenant
```

Expected:

- same vendor workspace allowed
- cross vendor workspace blocked

## 3. PostgreSQL boundary

With a running PostgreSQL database and `.env` loaded:

```bash
npm run test:tenant
```

Expected:

- same vendor workspace allowed
- cross vendor workspace blocked
- unknown workspace blocked

## 4. API verification

Start the backend:

```bash
npm run dev
```

Authenticate and obtain the bearer token. Then verify:

```text
GET /api/auth/context
GET /api/workspaces
GET /api/workspaces/:officeId/:vendorId
```

A vendor user must not receive another vendor's workspace. An office admin may receive vendors from its office. An organization admin may receive vendors within its organization.

## 5. Regression

Verify existing:

- login
- dashboard
- POS
- inventory
- recipes
- reports
- intelligence
- logout

No visual redesign is expected in Batch 13; this batch strengthens the tenant boundary behind the existing product experience.


---

## Source document: `client/src/README.md`

## Batch 13 — True Multi-Tenancy

Workspace identifiers supplied by the browser are no longer trusted as an authorization boundary. The backend resolves the requested vendor through its office and organization before allowing access.

### Tenant hierarchy

`Organization → Office → Vendor → User → Session`

- PostgreSQL workspace access verifies that the vendor belongs to the requested office.
- The office is verified against the authenticated user's organization.
- Owner/admin roles can access workspaces inside their organization.
- Office admins can access vendors inside their assigned office.
- Vendor-scoped users remain restricted to their assigned vendor.
- Unknown workspaces return `404`; cross-tenant access returns `403`.
- `GET /api/workspaces` returns only workspaces authorized for the current user.
- `GET /api/workspaces/:officeId/:vendorId` resolves one authorized workspace.
- `GET /api/auth/context` exposes the authenticated organization/office/vendor scope.
- The JSON demo store keeps the same isolation rules for backward compatibility.

### Tenant boundary test

```bash
npm run test:tenant
```

For PostgreSQL mode, run it with the same environment variables used by the backend so the test validates the live organization/office/vendor relationships.


---

## Source document: `docs_BATCH_10_TEST_GUIDE.md`

# Batch 10 Test Guide

1. From `client`, run `npm install --no-audit --no-fund --legacy-peer-deps`.
2. Run `npm run build` and confirm Vite completes without errors.
3. Run `npm run dev`.
4. Test `/`, `/portal`, `/office/techpark-one`, `/login/snapeats`, `/login`, `/dashboard`, `/pos`, `/inventory`, `/reports`, and `/settings`.
5. Confirm invalid URLs show the BizLift 404 screen.
6. Confirm browser titles change with the active route.
7. Confirm navigation starts at the top of each route.
8. Confirm existing SnapEats login and dashboard session flow remains intact.
9. Confirm POS checkout/inventory updates still work.
10. Enable system reduced-motion accessibility and verify Lenis/ambient animation is reduced.
11. Resize to mobile/tablet widths and confirm no duplicate navigation or horizontal layout break is introduced.


---

## Source document: `docs_BATCH_12_TEST_GUIDE.md`

# Batch 12 Test Guide

## 1. PostgreSQL authentication

From `backend` with PostgreSQL running and `.env` configured:

```bash
npm run prisma:generate
npm run db:seed
npm run dev
```

In another terminal:

```bash
curl -i -X POST http://localhost:5002/api/auth/login \\
  -H 'Content-Type: application/json' \\
  -d '{"email":"snapeats@techparkone.com","password":"snapeats123"}'
```

Expected: `200`, a bearer token, user identity, role, and permissions.

## 2. Session verification

Copy the returned token:

```bash
curl -i http://localhost:5002/api/auth/me \\
  -H "Authorization: Bearer YOUR_TOKEN"
```

Expected: `200` with sanitized user identity and permissions.

## 3. Permission endpoint

```bash
curl -i http://localhost:5002/api/auth/permissions \\
  -H "Authorization: Bearer YOUR_TOKEN"
```

Expected: `200` with role and permissions.

## 4. Logout

```bash
curl -i -X POST http://localhost:5002/api/auth/logout \\
  -H "Authorization: Bearer YOUR_TOKEN"
```

Reuse the token against `/api/auth/me`; expected result is `401`.

## 5. Frontend regression

- Login with SnapEats credentials.
- Confirm dashboard opens automatically.
- Confirm selected office/vendor are populated from the authenticated user.
- Confirm existing sidebar and top navigation remain unchanged.
- Confirm an expired/revoked token clears local authentication state.

## Validation performed during Batch 12 packaging

- Backend JavaScript syntax checks passed for the changed authentication, middleware, role, and route files.
- JSON-mode end-to-end authentication passed: login, `/me`, permissions, logout, and revoked-token rejection.
- RBAC enforcement passed: an analyst account received `403 Permission denied: inventory:write` on an inventory write attempt.
- PostgreSQL schema and seed were already verified in Batch 11 on the local development machine.
- Frontend production build was not claimed in the packaging environment because the copied ZIP did not contain the Vite executable and a dependency installation attempt timed out. Run `npm install` followed by `npm run build` locally.


---

## Source document: `docs_BATCH_13_TEST_GUIDE.md`

# Batch 13 Test Guide — True Multi-Tenancy

## Backend static audit

```bash
cd backend
find . -name '*.js' -print0 | xargs -0 -n1 node --check
```

## JSON tenant test

```bash
BIZLIFT_DB_MODE=json npm run test:tenant
```

Expected:

```text
PASS — same vendor workspace allowed
PASS — cross vendor blocked
```

## PostgreSQL tenant test

Use the PostgreSQL environment from Batch 11/12:

```bash
cd backend
npm run test:tenant
```

Expected:

```text
PASS — same vendor workspace allowed
PASS — cross vendor blocked
PASS — unknown workspace blocked
```

## API checks

Start the backend:

```bash
npm run dev
```

After authenticating, verify:

```text
GET /api/auth/context
GET /api/workspaces
GET /api/workspaces/techpark-one/snapeats
```

A SnapEats vendor session must not be able to resolve `techpark-one/quench`.

## Regression checklist

- Login
- Dashboard
- POS
- Inventory
- Recipes
- Reports
- Intelligence modules
- Workspace switching for authorized users
- Logout

No major visual redesign is expected in this security/data-isolation batch.


---

## Source document: `docs_BATCH_14_TEST_GUIDE.md`

# Batch 14 Test Guide

## 1. Backend syntax

```bash
cd backend
node --check index.js
node --check middleware/errorHandler.js
node --check middleware/requestContext.js
node --check services/requestLogger.js
node --check utils/appError.js
node --check utils/controller.js
node --check utils/validate.js
```

## 2. Tenant regression

```bash
npm run test:tenant
```

## 3. Request correlation

Start the backend:

```bash
npm run dev
```

Then:

```bash
curl -i http://localhost:5002/does-not-exist
```

Confirm the response contains `x-request-id` and a JSON `requestId`.

## 4. Error contract

A missing route should return:

- HTTP `404`
- `success: false`
- `code: ROUTE_NOT_FOUND`
- `requestId`

## 5. Existing application flow

Verify login, dashboard, POS, inventory, reports and tenant selection remain unchanged.


---

## Source document: `docs_BATCH_15_TEST_GUIDE.md`

# Batch 15 Test Guide — Data Platform

## 1. Install and start

```bash
cd backend
npm install
npm run dev
```

## 2. JSON-mode smoke test

```bash
cd backend
npm run test:data
```

Expected:

```text
Data platform smoke test passed
```

## 3. PostgreSQL migration

With PostgreSQL running and `backend/.env` configured:

```bash
cd backend
npm run prisma:generate
npm run prisma:migrate
```

Confirm the new table:

```bash
psql -d bizlift
\dt
\d data_metric_snapshots
\q
```

## 4. API verification

Login first and use the returned bearer token. Request the authenticated SnapEats workspace through the existing workspace context mechanism.

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:5002/api/data/overview?officeId=techpark-one&vendorId=snapeats"

curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:5002/api/data/quality?officeId=techpark-one&vendorId=snapeats"

curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:5002/api/data/events?officeId=techpark-one&vendorId=snapeats&limit=20"
```

Record an event:

```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"eventName":"dashboard.opened","entityType":"dashboard","entityId":"overview","payload":{"source":"manual-test"}}' \
  "http://localhost:5002/api/data/events?officeId=techpark-one&vendorId=snapeats"
```

Capture a metric snapshot:

```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"dimension":{"period":"current"}}' \
  "http://localhost:5002/api/data/snapshots?officeId=techpark-one&vendorId=snapeats"
```

## 5. Tenant isolation

Attempt to request `quench` while authenticated as a SnapEats vendor. The request must be rejected by the existing Batch 13 tenant boundary.

## 6. Frontend

Batch 15 does not require a visual redesign. Existing pages continue to use their current UI and can consume the new data APIs in later dashboard/BI batches.


---

## Source document: `docs_BATCH_16_TEST_GUIDE.md`

## Batch 16 correction
The Batch 16 Prisma schema includes the complete `Office` model closure before `Vendor`.
The backend scripts also load `.env` automatically via Node's `--env-file=.env`, so `db:seed`, `dev`, and `start` do not require `source .env` first.


---

## Source document: `docs_BATCH_17_TEST_GUIDE.md`

# Batch 17 Test Guide

From `backend/`:

```bash
npm install
npm run prisma:generate
npm run prisma:deploy
npm run db:seed
npm run test:realtime
npm run test:architecture
npm run test:tenant
npm run test:data
npm run test:ml
npm run dev
```

The real-time smoke test verifies scoped publish/subscribe behavior and subscriber cleanup. For an authenticated workspace, `GET /api/realtime/health` reports SSE transport and subscriber count. `GET /api/realtime/stream?replay=25` returns an SSE stream with a connection event, recent analytics-event replay, live events, and 15-second heartbeats.


---

## Source document: `docs_BATCH_18_TEST_GUIDE.md`

# Batch 18 Test Guide — Procurement Intelligence

From `backend/`:

```bash
npm install
npm run prisma:generate
npm run prisma:deploy
npm run db:seed
npm run test:procurement
npm run test:architecture
npm run test:tenant
npm run test:data
npm run test:ml
npm run test:realtime
npm run dev
```

Procurement endpoints (authenticated workspace):

- `GET /api/procurement/cockpit`
- `POST /api/procurement/orders`
- `POST /api/procurement/orders/:id/approve`

Permissions:

- `procurement:read`
- `procurement:write`

Expected smoke test output begins with:

```text
Procurement platform smoke test passed
```


---

## Source document: `docs_BATCH_19_TEST_GUIDE.md`

# Batch 19 Test Guide — AI Copilot

## Backend

```bash
cd backend
npm install
npm run prisma:generate
npm run prisma:deploy
npm run db:seed
npm run test:copilot
npm run test:architecture
npm run test:tenant
npm run test:procurement
npm run test:ml
npm run test:realtime
npm run test:data
npm run dev
```

Expected Copilot smoke test:

```text
AI Copilot smoke test passed
```

## Frontend

```bash
cd client
npm install
npm run dev
```

Login with the existing SnapEats demo account and open **Decision Intelligence**. Use **Generate Copilot Brief** to populate explainable actions. Approval requires an authorized role; dismissal records the decision without changing operational data.

## API

- `POST /api/copilot/brief`
- `GET /api/copilot/actions`
- `POST /api/copilot/actions/:id/decision`

All endpoints are authenticated and workspace/tenant scoped. Copilot reads use `copilot:read`; action decisions use `actions:approve`.


---

## Source document: `docs_BATCH_20_TEST_GUIDE.md`

# Batch 20 Test Guide — Security + Observability

## 1. Backend setup

```bash
cd backend
npm install
npm run prisma:generate
npm run prisma:deploy
npm run db:seed
```

`prisma:deploy` should apply the Batch 20 migration:

```text
20261009010000_batch20_security_observability
```

## 2. Batch 20 smoke test

```bash
npm run test:observability
```

Expected shape:

```text
{"health":"healthy","scopedAuditEvents":1,"auditEvents":2,"permissions":"passed"}
```

## 3. Regression suite

```bash
npm run test:auth-credentials
npm run test:architecture
npm run test:tenant
npm run test:procurement
npm run test:ml
npm run test:realtime
npm run test:data
npm run test:copilot
```

## 4. Start backend

```bash
npm run dev
```

Health endpoint:

```bash
curl -i http://localhost:5002/api/observability/health
```

It should return a healthy/degraded operational status and an `x-request-id` response header.

## 5. Authenticated observability

Log into SnapEats first:

```text
Email:    snapeats@techparkone.com
Password: snapeats123
```

Then open the existing **Settings** page. The **Security & Observability** panel should show:

- API health
- request count
- average latency
- audit-event count
- security events
- recent audit trail
- rate-limit bucket telemetry

Use **Refresh telemetry** to reload the panel.

## 6. Tenant isolation check

The audit/security endpoints must remain scoped to the authenticated workspace. A user must not be able to retrieve another vendor's audit records by changing `officeId`/`vendorId` in the URL.

## 7. Frontend validation

```bash
cd ../client
npm install
npm run build
```

No duplicate sidebar or top navigation should appear. Existing Settings navigation remains the entry point.


---

## Source document: `docs_BATCH_21_TEST_GUIDE.md`

# Batch 21 Test Guide

## Backend

```bash
cd backend
npm install
npm run prisma:generate
npm run prisma:deploy
npm run db:seed
npm run smoke
npm run doctor
npm run test:all
```

`test:all` runs the existing regression tests in a deterministic sequence and fails the process if any test fails.

## Frontend

```bash
cd client
npm install
npm run build
```

## CI

GitHub Actions is defined in `.github/workflows/ci.yml`. Backend CI runs the smoke test and complete regression suite. Frontend CI runs the production build.

## SnapEats

Email: `snapeats@techparkone.com`

Password: `snapeats123`


---

## Source document: `docs_BATCH_22_TEST_GUIDE.md`

# Batch 22 Test & Release Guide

## Backend

```bash
cd backend
npm ci
npm run prisma:generate
npm run prisma:deploy
npm run doctor
npm run test:all
```

For a production configuration, export the values from `.env.production.example` through your hosting platform and run:

```bash
npm run release:check
```

Expected result:

```text
"status": "release-ready"
```

## Frontend

```bash
cd client
npm ci
npm run build
```

## Container smoke test

With production environment variables available:

```bash
docker compose -f docker-compose.production.yml build
docker compose -f docker-compose.production.yml up
```

Then verify the frontend and backend health endpoint.

## Important

Do not run `prisma migrate reset` against production. Use `prisma migrate deploy` only.


---

## Source document: `docs_FINAL_BATCH_01_TEST_GUIDE.md`

# Final Batch 01 — Test Guide

## Frontend build
```bash
cd client
npm ci
npm run build
```

## Dashboard visual regression
1. Start PostgreSQL and the backend using the existing Batch 22 instructions.
2. Start the frontend with `npm run dev`.
3. Sign in to the SnapEats demo account.
4. Open Demand Forecasting and verify the Top Selling Menu Items horizontal bar chart shows item labels and non-zero quantities when sales exist.
5. Change the menu-item filter and verify the chart updates or displays an explicit empty state.
6. Verify revenue is displayed as a readable INR value, e.g. `₹2,01,869.70`, rather than a long floating-point number.
7. Resize the browser and verify cards/charts do not overflow horizontally.

## Important
This batch includes a source-level repair but has not been validated in a live browser in the packaging environment. Do not mark visual QA as passed until the above checks are run locally.


---

## Reference document: `docs/BATCH_03_TEST_GUIDE.md`

# Batch 03 Test Guide

## Backend
```bash
cd backend
npm install
npm run bootstrap:demo
npm start
```

The backend listens on `http://localhost:5002`.

## Frontend
```bash
cd client
npm install
npm run dev
```

The frontend runs on Vite's default `http://localhost:5173`.

## SnapEats login
- Email: `snapeats@techparkone.com`
- Password: `snapeats123`
- Vendor ID: `snapeats` (optional)

Expected flow:
1. Open `/login/snapeats` or `/login`.
2. Submit credentials.
3. The browser stores `bizlift_token` and `bizlift_user`.
4. The app navigates to `/dashboard` without a manual refresh.
5. Dashboard workspace context is `techpark-one / snapeats`.

If the credentials are invalid, the login card now displays the server's actual response instead of the generic `Login failed` message.


---

## Reference document: `docs/BATCH_04_TEST_GUIDE.md`

# Batch 04 Test Guide

## Backend
```bash
cd backend
npm install
npm run bootstrap:demo
npm start
```

## Frontend
```bash
cd client
npm install
npm run dev
```

Open `http://localhost:5173/`.

## Verify
1. Home page keeps the established dark/green BizLift visual language.
2. Home page shows the new 3D operations-core visual and snapshot cards.
3. Login contains only Business Email and Password.
4. Sign in with `snapeats@techparkone.com` / `snapeats123`.
5. Dashboard opens automatically.
6. Dashboard has one existing sidebar and one existing top navigation — no duplicate shell.
7. Existing dashboard colors/layout remain unchanged.


---

## Reference document: `docs/BATCH_05_TEST_GUIDE.md`

# Batch 05 Test Guide

1. Start backend:
   `cd backend && npm install && npm run bootstrap:demo && npm start`
2. Start frontend in a second terminal:
   `cd client && npm install && npm run dev`
3. Test landing page: `/`
4. Test office/vendor selection: `/portal` → TechPark One → SnapEats / Quench / South Delights
5. Test login: business email + password; no Vendor ID field.
6. After login, confirm the dashboard has exactly one sidebar and one top navigation.
7. Confirm the dashboard top controls stay side-by-side and do not drop below the workspace selector.
8. Open POS and create/cancel a test order.
9. Open Inventory and confirm inventory/recipe/sales views load.
10. Switch between SnapEats and Quench from the dashboard workspace selector and confirm the dashboard reloads the selected workspace.
11. Open Reports and confirm charts/data render.


---

## Reference document: `docs/BATCH_06_TEST_GUIDE.md`

# Batch 06 Test Guide

## 1. Start backend
```bash
cd backend
npm install
npm run bootstrap:demo
npm start
```

## 2. Start frontend
```bash
cd client
npm install
npm run dev
```

## 3. Regression flow
1. Open `/` and verify the existing BizLift landing page.
2. Open `/portal` and select TechPark One → SnapEats, Quench, or South Delights.
3. Login with Business Email + Password only.
4. On `/dashboard`, verify there is exactly one sidebar and one top bar.
5. Verify TechPark One / SnapEats is no longer repeated in the top bar after login.
6. Verify Download Report, Open POS & Billing, Go to Inventory, and Light/Dark are fully visible side-by-side; the theme control must not be clipped or wrapped under the row.
7. Verify dashboard charts have visible chart area without an unnecessary nested bordered chart box.

## 4. POS → Inventory workflow
1. Open POS & Billing.
2. Add a menu item.
3. Increase quantity until the ingredient stock limit is reached.
4. Attempt one more increment; the cart should stay at the allowed quantity and show a stock message.
5. Checkout.
6. Verify the bill is created and inventory decreases automatically.
7. Cancel the created order and verify deducted stock is restored.

## 5. Action Center workflow
1. Open Action Center.
2. Review an action, snooze an action, and dismiss an action.
3. Verify the queue refreshes after each successful operation.
4. If an API failure is simulated, verify an error is surfaced instead of silently reporting success.

## 6. Procurement / Inventory regression
1. Open Reorder Suggestions.
2. Create smart purchase orders when recommendations exist.
3. Receive an open purchase order.
4. Verify inventory updates and the queue refreshes.


---

## Reference document: `docs/BATCH_07_08_TEST_GUIDE.md`

# Batch 07 + 08 Test Guide

1. Start backend with `npm install && npm run bootstrap:demo && npm start`.
2. Start frontend with `npm install && npm run dev`.
3. Login with SnapEats business email/password.
4. Confirm the dashboard has one sidebar and one top navigation row.
5. Open Reports and test 7/30/60/90 day selectors.
6. Confirm Revenue Momentum, Demand by Hour and Revenue by Category render.
7. Export CSV and confirm the download contains KPI rows.
8. Open POS, create/cancel a test order, then confirm Inventory still loads.
9. Switch SnapEats/Quench/South Delights and confirm report/dashboard data follows workspace.
10. Confirm no new navigation shell or theme replacement was introduced.


---

## Reference document: `docs/BATCH_09_TEST_GUIDE.md`

# Batch 09 Test Guide — Advanced UI/UX

## 1. Public flow
1. Start frontend and backend.
2. Open `/` and confirm the existing hero, navigation, CTA links and 3D visual remain present.
3. Scroll through the landing page and confirm feature cards have subtle elevation/hover response.
4. Confirm the black/white + green BizLift theme is unchanged.

## 2. Workspace flow
1. Open `/portal`.
2. Search for an office and open a workspace.
3. Open `/office/techpark-one` and verify SnapEats, Quench and South Delights remain available.
4. Confirm cards respond on hover without changing their destination.

## 3. Authentication
1. Open `/login` or a vendor login route.
2. Use Business Email + Password.
3. Confirm focus rings appear on email/password fields.
4. Confirm successful login navigates directly to `/dashboard`.

## 4. Dashboard
1. Confirm there is exactly one sidebar and one top navigation.
2. Confirm Day / Month / Year, Download Report, POS, Inventory and theme controls remain side-by-side.
3. Hover dashboard KPI/chart cards and confirm only subtle depth/brightness changes occur.
4. Switch dashboard sections and confirm existing workflows still render.
5. Open Reports from the dashboard and confirm charts load.

## 5. POS
1. Open `/pos`.
2. Add menu items, change quantities and checkout.
3. Confirm inventory checks and cancellation behavior remain functional.
4. Confirm menu cards and cart shell have the new visual depth without layout breakage.

## 6. Inventory
1. Open `/inventory`.
2. Verify summary, filters, recipes, sales and stock update controls.
3. Open the existing modals and confirm no overlay/layout regression.

## 7. Reports
1. Open `/reports`.
2. Switch 7/30/60/90 days.
3. Confirm Revenue, Demand by Hour, Revenue by Category and Plan vs Actual sections render.
4. Export CSV and confirm it still downloads.

## 8. Responsive / accessibility
- Test desktop and a narrow browser width.
- Confirm horizontal navigation controls do not wrap into a broken second row.
- Enable reduced motion at OS/browser level and confirm new hover transitions are disabled.
- Check that focused inputs remain visibly identifiable.


---

## Reference document: `docs/BATCH_11_TEST_GUIDE.md`

# BizLift Batch 11 — Database Foundation Test Guide

## Goal
Verify that the production PostgreSQL foundation is present without breaking the existing demo JSON mode.

## 1. Existing demo mode
From `backend/`:

```bash
npm install
npm run dev
```

Expected:
- server starts on port 5002
- `/api/system/health` reports `provider: json-demo`
- existing SnapEats login/dashboard/POS/inventory flows continue to work

## 2. Prisma client generation
```bash
npm run prisma:generate
```

Expected:
- Prisma client is generated successfully
- no application source changes are required to use demo mode

## 3. PostgreSQL setup
Create a PostgreSQL database and set:

```bash
BIZLIFT_DB_MODE=postgres
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/bizlift?schema=public
```

Then run:

```bash
npm run prisma:migrate
npm run db:seed
```

Expected:
- organizations, offices, vendors and demo users are seeded
- migration completes without destructive reset

## 4. PostgreSQL health
Start the API with PostgreSQL mode enabled and request:

```bash
GET /api/system/health
```

Expected:
- `provider` is `postgresql`
- `configured` is `true`
- `connected` is `true`

## 5. Safety rule
Do not enable PostgreSQL mode against production data until a backup and migration review have been completed. Batch 11 intentionally leaves the existing JSON demo path intact; later batches will move individual domains behind repositories before the final cutover.


---

## Reference document: `docs/BIZLIFT_2_0_PHASE1_2.md`

# BizLift 2.0 — Phases 1 & 2

## Phase 1 — Digital Twin / Scenario Simulator
BizLift now supports a deterministic, workspace-aware operational simulation layer.

### What it answers
- What happens if demand rises by 10%, 20%, or 50%?
- Which ingredients become stockouts?
- Which menu items become blocked?
- What revenue can be realized?
- What ingredient/procurement cost is implied?
- What is the simulated profit proxy and net impact versus the current 30-day baseline?

### Safety model
The Digital Twin is **simulation-only**. It does not mutate inventory, sales, purchase orders, prices, or recipes. A future approval phase can deliberately convert a selected scenario into an operational action.

Endpoint: `POST /api/intelligence/digital-twin`

## Phase 2 — Money Leak Detector
BizLift now ranks operational value leakage from:
- stockouts and revenue exposure
- waste events
- near-expiry inventory
- thin-margin menu items
- open procurement exposure
- cancelled orders

Values are clearly presented as operational estimates for prioritization, not audited accounting losses.

Endpoint: `GET /api/intelligence/money-leaks`

## Architecture direction
These phases move BizLift from **analytics → decision simulation → prioritized value recovery**.

Target six-phase 2.0 roadmap:
1. Digital Twin / Scenario Simulator
2. Money Leak Detector
3. Action Optimizer + human approval
4. Waste Rescue Engine
5. Impact Ledger / learning loop
6. BizLift Decision Center + Boardroom Mode


---

## Reference document: `docs/BIZLIFT_2_0_PHASE3_4.md`

# BizLift 2.0 — Phase 3 + 4

## Phase 3 — Action Optimizer + Human Approval

BizLift now converts existing intelligence into a ranked operational action plan. The optimizer combines current inventory, recipe dependencies, recent sales velocity, supplier lead time, waste-rescue opportunities and menu margin signals.

Each action includes:
- priority
- reason
- next action
- estimated action cost
- estimated benefit
- estimated net benefit
- confidence
- target data needed for execution

The `POST /api/intelligence/action-optimizer/approve` endpoint provides human-in-the-loop approval. Reorder approvals create a real purchase order through the existing procurement workflow. Other recommendations are recorded as approved recommendation outcomes. The system does not silently change prices or create fake sales.

## Phase 4 — Waste Rescue Engine

The Waste Rescue Engine identifies inventory that is within five days of expiry and connects it to recipes that can consume it.

For each actionable item it estimates:
- inventory value at risk
- menu units that can consume the ingredient
- recommended menu quantity
- linked menu item
- estimated value saved
- revenue opportunity
- time remaining before expiry

Rescue approval does not fabricate a sale or directly decrement stock. Actual consumption remains tied to the POS transaction flow.

## Operational loop

```text
Observe → Detect → Rank → Explain → Simulate → Human Approves → Execute → Measure
```

## New endpoints

- `POST /api/intelligence/action-optimizer`
- `POST /api/intelligence/action-optimizer/approve`
- `GET /api/intelligence/waste-rescue`

## Safety principle

BizLift remains human-in-the-loop for consequential operations. Intelligence produces recommendations and quantified estimates; execution requires an explicit action or an existing business workflow such as POS or purchase-order receiving.


---

## Reference document: `docs/BIZLIFT_2_0_PHASE5_6.md`

# BizLift 2.0 — Phases 5 & 6

## Phase 5 — Impact Ledger / Learning Loop
BizLift now tracks recommendation lifecycle value: expected impact, realized impact, measurement status, prediction accuracy, value delta and success rate. The ledger is derived from persisted recommendation outcomes and never invents realized results.

API:
- `GET /api/intelligence/impact-ledger`
- `POST /api/intelligence/outcomes`

## Phase 6 — Decision Center / Boardroom Mode
The Decision Center consolidates the top five optimized actions with expected net benefit, risk, next action and confidence. A compact Boardroom Brief summarizes the headline, top risk, recommended action and expected value.

API:
- `GET /api/intelligence/decision-center`

The UI is embedded into the existing Decision Intelligence section to preserve BizLift's current navigation and visual structure.

## Closed-loop model
Observe → Understand → Predict → Simulate → Detect Leaks → Optimize → Human Approval → Execute → Measure → Learn.


---

## Reference document: `docs/BIZLIFT_BOARDROOM_MODE.md`

# BizLift Boardroom Mode

## Purpose
Boardroom Mode is the executive, decision-first view of BizLift. It is available directly below Settings in the dashboard sidebar.

## What it surfaces
- BizLift health score
- Revenue at risk
- Waste exposure
- Critical operational issues
- Expected benefit from recommended actions
- #1 recommended decision with reason, next action, confidence, and expected net benefit
- Executive headline, top risk, and recommended move
- Money-leak categories
- Operational pulse
- Recommendation measurement and realized value

## Design principle
The page is intentionally read-only. Operational actions remain in the existing Action Center / Decision Intelligence workflows, so management can review the situation without accidentally mutating business data.


---

## Reference document: `docs/CONTROL_TOWER_AND_WORKFLOWS.md`

# Operations Control Tower + Business Workflows

## Phase 5 — Operations Control Tower

BizLift now exposes `/api/intelligence/control-tower` as a unified operational layer over the existing inventory, expiry, demand, menu, procurement and supplier intelligence.

It answers:
- **What happened:** current sales/waste footprint and detected issues.
- **Why:** the dependency, expiry, stock, forecast or supplier reason behind each action.
- **What next:** an explicit operational next step.
- **Impact:** estimated revenue exposure, waste cost or procurement exposure where measurable.

Control Tower actions have persistent lifecycle states: `active`, `reviewed`, `snoozed`, `dismissed`, and `completed`.

## Phase 6 — Real Business Workflows

### POS
- Menu cards show derived `Available` / `86` status from recipe ingredient stock.
- Orders remain recipe-driven and atomically validate ingredient availability before deduction.
- POS now exposes recent order history.
- Cancelling an order restores every recorded recipe deduction and writes reversal transactions.

### Auditability
Sales, cancellations, receiving and waste all write workspace-scoped operational records with timestamps and source references.

### Safety
Order cancellation refuses missing inventory mappings and duplicate cancellation. It never creates negative inventory.


---

## Reference document: `docs/DECISION_INTELLIGENCE.md`

# BizLift Decision Intelligence Architecture

BizLift is intentionally positioned as an operational intelligence layer for food businesses rather than a POS clone.

## Canonical flow

Sales / POS -> Recipes -> Ingredient Consumption -> Inventory -> Demand / Waste / Expiry -> Procurement -> Explainable Recommendation -> Manager Action -> Outcome.

## Current decision modules

- Ingredient dependency graph: identifies menu items sharing constrained ingredients.
- Stockout revenue impact: estimates daily revenue exposed by ingredient shortages.
- Expiry rescue: links near-expiry stock to recipes that can consume it.
- Menu profitability: estimates ingredient food cost, revenue, contribution margin and margin percentage.
- Menu engineering: classifies menu items as Star, Puzzle, Plowhorse or Dog.
- Smart promotion: promotes high-margin available dishes and protects dishes constrained by stock.
- Prep planner: converts demand velocity into suggested preparation quantities.
- What-if simulator: provides a baseline +20% demand scenario and impact estimates.
- Actual vs theoretical usage: compares recipe-implied ingredient use with recorded POS deductions.
- Supplier intelligence: ranks supplier dependency pressure using linked inventory risk.

## Data principles

### Master data is unique

Inventory items, recipes, menu definitions, vendors and other reference entities should have one canonical record per workspace.

### Event data may repeat

Sales, inventory movements, waste events, purchase orders, demand observations and recommendation events are historical facts. Repeated ingredient names in these tables are expected and must not be deduplicated away.

## Product differentiation

BizLift should not attempt to reproduce the entire restaurant-management stack of established platforms. The differentiation is the cross-module decision layer that explains what action should be taken, why it should be taken, and what financial/operational impact is expected.

## Phase 2: Sales-to-Inventory Control Loop

POS sales continue to consume recipe-defined ingredient quantities atomically. Decision Intelligence now exposes a usage-integrity summary comparing recipe-implied theoretical consumption with recorded POS deductions. This makes the operational chain auditable instead of treating sales and inventory as separate reports.

The current demo data is intentionally reconciled, so the default status is `Reconciled`. When a material variance appears, the variance table identifies the affected ingredient and percentage difference for investigation.


---

## Reference document: `docs/DEMAND_MENU_INTELLIGENCE.md`

# Demand & Menu Intelligence

BizLift Phase 3 and Phase 4 extend the decision layer without changing the core UI architecture.

## Phase 3 — Demand Intelligence

The demand-sensing service uses observed sales from the active workspace to calculate:
- 30-day observed menu demand
- recent 7-day versus prior 7-day trend
- peak selling hours
- short-horizon 7-day menu forecast
- forecast confidence based on observed activity
- suggested daily prep quantity
- ingredient-level forecast usage and stock coverage
- high/medium/low inventory demand risk

The forecast is intentionally explainable and does not claim external demand data that BizLift has not collected.

## Phase 4 — Menu Intelligence

Menu intelligence connects recipe cost, selling price, observed demand and current ingredient availability to produce:
- food cost per menu unit
- contribution margin and margin percentage
- pricing signals
- promote / maintain / test demand / review price-cost / protect stock decisions
- stock-constrained menu visibility

This creates the operational chain:

`Sales → Demand Signal → Menu Forecast → Recipe → Ingredient Need → Inventory Coverage → Menu Decision`

The existing Decision Intelligence screen surfaces these outputs with minimal UI change.


---

## Reference document: `docs/FINAL_HARDENING_AND_FOCUS4.md`

# BizLift Final Hardening + Focus Area 4 Alignment

## Release intent

This release freezes the BizLift feature set for the Microsoft hackathon. The priority is reliability, explainability, and a stronger match to **Focus Area 4 — Dashboards with BI (and the Modern Data Stack)** rather than adding unrelated features.

## Final BI addition: Plan vs Actual Variance

Endpoint: `GET /api/intelligence/bi-variance?days=30`

The report compares:
- Revenue
- Procurement Spend
- Waste Cost

against a normalized prior-period operating baseline and reports:
- plan
- actual
- absolute variance
- percentage variance
- favorable / unfavorable status
- source-record reconciliation counts

The baseline is explicitly labelled as an **analytical BI baseline, not an audited accounting budget**. This avoids inventing financial budgets while demonstrating the core Budget-vs-Actual / variance-analysis pattern required by the challenge.

The feature is surfaced in the existing **Operations Reports** page, so it strengthens the BI story without creating another navigation-heavy feature.

## Reliability hardening

- Backend JavaScript syntax checked across the project.
- New BI variance service imported successfully.
- New BI variance service smoke-tested against all four seeded workspaces.
- Existing Boardroom Mode remains below Settings.
- No new database mutation is introduced by the variance report.
- No existing operational workflow is changed by the variance report.
- Temporary route artifact `intelligenceRoutes.js.tmp` removed from the release package.

## Validation limitation

A full dependency-backed Vite production build was attempted, but this packaging environment did not have the frontend dependencies available and dependency installation timed out. Therefore the release must still be verified locally with:

```bash
cd backend
npm install
npm start

cd ../client
npm install
npm run build
npm run dev
```

The backend source itself passes `node --check` syntax validation.

## Recommended final demo story

**Observe → Understand → Predict → Simulate → Recommend → Human Approval → Execute → Measure → Learn**

The BI variance layer adds:

**Plan → Actual → Variance → Explain → Decide**

This makes BizLift a stronger demonstration of dashboard-driven business intelligence while preserving the existing decision-intelligence architecture.


---

## Reference document: `docs/PROCUREMENT_INTELLIGENCE.md`

# Smart Procurement Intelligence

BizLift Phase 1 adds a supplier-aware procurement layer on top of the existing inventory/reorder engine.

## Decision flow

`Inventory pressure -> demand velocity -> recommended quantity -> supplier reliability -> lead time -> stockout exposure -> purchase decision -> purchase order -> receiving -> inventory transaction`

## Features

- Supplier-aware purchase recommendations
- Recommended quantity based on threshold + 14-day usage coverage
- Supplier reliability score using purchase-order delivery history and master supplier data
- Lead-time visibility
- Stockout exposure before expected delivery
- Buy now / Buy soon / Monitor decision labels
- Bulk creation of smart purchase orders
- Purchase-order receiving workflow
- Receiving automatically increases inventory and writes an inventory transaction
- Procurement spend and supplier-risk visibility

## API

- `GET /api/intelligence/procurement-intelligence`
- `POST /api/intelligence/procurement-orders`
- `POST /api/intelligence/procurement-orders/:id/receive`

## Design principle

The procurement layer does not replace the existing reorder engine. It consumes its operational signals and adds supplier and execution context, keeping the UI compact while making the decision chain actionable.


---

## Reference document: `docs/PRODUCTION_LAUNCH.md`

# BizLift Production Launch Runbook

## 1. Configure secrets

Create production environment variables in the hosting platform. Do not commit real credentials.

Required backend values:
- `NODE_ENV=production`
- `BIZLIFT_DB_MODE=postgres`
- `DATABASE_URL=<managed PostgreSQL connection string>`
- `CORS_ORIGIN=https://<your-frontend-domain>`
- `SESSION_TTL_HOURS=24` (or your approved value)
- `BODY_LIMIT=1mb`

Use `backend/.env.production.example` as the template.

## 2. Database release

From `backend/`:

```bash
npm ci
npm run prisma:generate
npm run prisma:deploy
npm run doctor
npm run test:all
```

Never run `prisma migrate reset` against production.

## 3. Release gate

Set production variables and run:

```bash
npm run release:check
```

The command must return `release-ready` before deployment.

## 4. Start backend

```bash
npm start
```

Verify:
- `GET /` returns the BizLift backend status.
- `GET /api/observability/health` reports healthy status.
- `GET /api/observability/metrics` is available to an authorized account.

## 5. Frontend deployment

```bash
cd client
npm ci
npm run build
```

For container deployment, use `client/Dockerfile`. Nginx is configured for React/Vite history fallback.

## 6. Smoke test

1. Open the deployed frontend.
2. Sign in with a valid account.
3. Verify the dashboard loads.
4. Verify Decision Intelligence and AI Copilot load.
5. Verify Settings → Security & Observability loads for an authorized role.
6. Confirm an invalid login creates a security event.
7. Confirm tenant-scoped audit data does not cross workspaces.

## 7. Rollback

Rollback the application container/release to the previous known-good artifact. Do not reset or delete the database. If a database migration is incompatible, stop rollout and restore from the managed PostgreSQL provider's backup/point-in-time recovery process according to its operational policy.

## 8. Production safety

- Keep secrets in the deployment platform, not Git.
- Use HTTPS at the public edge.
- Restrict PostgreSQL network access to the backend.
- Set `CORS_ORIGIN` to the exact frontend origin.
- Rotate demo credentials before exposing the application publicly.
- Do not expose unrestricted observability endpoints to anonymous users.


---

## Reference document: `docs/REPORTING_AND_FINAL_AUDIT.md`

# Reporting & Final Audit

## Phase 9 — Analytics & Reporting
- Added authenticated workspace-scoped operations reporting at `GET /api/reports/operations`.
- Supports 7–90 day reporting windows.
- Reports revenue, orders, units, AOV, waste cost, procurement spend, inventory value, stock exposure, cancellations and transaction activity.
- Adds daily performance, top menu items, waste-by-reason and intelligence summary.
- Added CSV export from the Reports page.

## Phase 10 — Final Production Audit
- Fixed the Decision Intelligence runtime regression where `demandMenu` was referenced without a local binding.
- Confirmed `smartSuppliers` is derived from procurement intelligence inside the Suppliers renderer.
- Preserved workspace authorization, POS/recipe/inventory flow, procurement receiving and recommendation tracking.
- Added Reports to the existing Dashboard navigation with minimal UI change.
- Added `/reports` as a protected route.
- Backend syntax checks passed for reporting service, report route and server bootstrap.

## Final acceptance checklist
- Authentication required for reporting and intelligence APIs.
- Workspace context required and access-checked server-side.
- Reporting window bounded to 7–90 days.
- No external data source required for operational reporting.
- Existing seeded demo workspaces remain supported.


---

## Reference document: `docs/SAMPLE_DATA.md`

# BizLift Sample Dataset

## Purpose

BizLift now ships with a deterministic, synthetic dataset so the dashboard, sales analytics, inventory intelligence, waste analytics and future forecasting features have enough history to behave like a real food-business system.

The data is synthetic and contains no real customer or business information.

## Dataset sizes

| Dataset | Rows | Role |
|---|---:|---|
| `inventory_master.csv` | 35 | Unique inventory reference records (no duplicate item per workspace) |
| `recipes_master.csv` | 21 | Unique menu/recipe reference records |
| `sales.csv` | 2,500 | POS orders, menu demand, revenue and billing history |
| `inventory_transactions.csv` | 5,000 | Stock movement ledger used by inventory analytics |
| `waste_events.csv` | 2,500 | Expiry, spoilage, overproduction and preparation waste |
| `purchase_orders.csv` | 2,000 | Supplier replenishment/order history |
| `demand_observations.csv` | 2,500 | Time-based demand observations for forecasting |
| `suppliers.csv` | 2,000 | Supplier relationship/performance records |

Master data such as recipes and inventory items intentionally remains much smaller because those are reference tables, not event histories. Event datasets can repeat the same item because each row represents a different sale, stock movement, waste event or purchase. The new `inventory_master.csv` and `recipes_master.csv` are the clean unique reference tables used to avoid treating repeated events as duplicate products.

## Storage model

`backend/data/db.json` is the live persistent demo database. Changes made through the application continue to be written there.

`backend/data/demoDb.json` is the clean reset/bootstrapping baseline.

`backend/data/generatedWorkspaceData.json` contains the large generated event collections used by workspace reset/seed logic.

`backend/data/sample/*.csv` contains analysis-friendly copies of the generated datasets.

## Reset behavior

`npm run bootstrap:demo` restores the clean seeded dataset from `demoDb.json`.

`npm run seed:sample` validates that every shipped dataset is present and has the expected row count.

## Data relationships

The sample data is keyed by:

`officeId + vendorId + inventoryItemId + recipeId + orderId + sourceId`

The intended business flow is:

`POS order -> recipe -> ingredient quantities -> inventory deduction -> transaction -> sales analytics`

and:

`purchase order -> stock receipt -> inventory -> future sales consumption`

and:

`expiry/spoilage/waste -> inventory deduction -> waste event -> waste analytics`

## Important

The dataset is deliberately synthetic. It is for development, demonstration, UI testing and analytics testing, not for production decisions.


---

## Reference document: `docs/SECURITY_AND_MULTILOCATION.md`

# Security & Multi-location

## Phase 7
- Security response headers
- Configurable CORS and JSON body limits
- Global and login rate limiting
- Session activity tracking
- Server-side workspace authorization

## Phase 8
- Authenticated `GET /api/workspaces` directory
- Office-admin multi-workspace discovery
- Vendor-scoped workspace access
- Minimal Dashboard workspace switcher

---

# Final improvement programme — Batch 2: Super Admin Portal

## Purpose
The platform administration layer lets a BizLift platform administrator review organization/outlet counts, list organizations, and create a new organization. It is intended for institutional customers such as universities, hotel groups, and food-court operators. Existing restaurant operations remain in the existing workspace.

## Super Admin access
Use the visible **Platform administration → Admin sign in** entry on `http://localhost:5173/portal` or the **Platform administration** link on an office page such as `http://localhost:5173/office/techpark-one`. These open `http://localhost:5173/admin/login`. After successful authentication, the account must have the `super_admin` or `platform_admin` role to enter `/admin`; regular vendor/office accounts are rejected and are not left signed in by the admin login screen. Public admin self-registration is intentionally disabled. A platform administrator must be provisioned securely by a deployment operator. The API rejects other roles. The endpoints require PostgreSQL mode; the portal does not silently write platform records to the demo JSON store.

## Platform administration API
- `GET /api/admin/overview` — counts of organizations, locations, outlets and users.
- `GET /api/admin/organizations` — organization registry with related counts.
- `POST /api/admin/organizations` — create an organization with `name` and optional unique `slug`.
- `POST /api/admin/organizations/:organizationId/outlets` — register a location/outlet and an inactive administrator account. Required fields: `locationName`, `outletName`, `adminEmail`; optional `adminName`.

All endpoints require a valid bearer session and platform-admin role. The outlet endpoint intentionally creates an inactive user and reports `invitationDelivery: not_configured`; it does not pretend to send an email. Secure invitation tokens, email delivery, first-login activation, organization-admin screens, and a full lifecycle/status workflow remain follow-up work before real external customers are onboarded.

## Test the new portal
1. Start PostgreSQL and configure `backend/.env` with `BIZLIFT_DB_MODE=postgres` and a valid `DATABASE_URL`.
2. Start backend and frontend using the standard local-development commands in this README.
3. Open `/portal` and use **Admin sign in**, or go directly to `/admin/login`.
4. Sign in using a platform-admin account provisioned securely by a developer/database administrator. Do not promote a public/demo account to platform admin in a production deployment.
5. Confirm successful sign-in redirects to `/admin`; check overview counts and create a test organization with a unique slug.
5. Verify a normal restaurant account receives HTTP 403 from `/api/admin/overview` and cannot access organization data.
6. Test outlet registration only in a development database; verify the administrator remains inactive until a secure activation workflow is implemented.

## Batch 2 validation record
- Passed: Node syntax checks for `backend/routes/adminRoutes.js` and `backend/index.js`.
- Passed: `backend/package.json` and `client/package.json` parse as JSON.
- Not verified in this packaging environment: Prisma/database integration tests and Vite production build (dependencies/database are not installed here).
- Security limitation: invitation email and account activation are not implemented in this batch; do not treat outlet registration as complete customer onboarding until that flow is built and tested.


## Final Batch 2.1 — Admin portal discoverability
- Added a visible Platform Administration panel and Admin sign in action to `/portal`.
- Added a contextual Platform administration link to office selection pages such as `/office/techpark-one`.
- Added a dedicated `/admin/login` screen that checks the returned account role before storing the session and opening `/admin`.
- Public admin registration is deliberately not provided; only securely provisioned `super_admin` and `platform_admin` accounts can use the platform portal.
- Verification in this patch: source-level checks and ZIP integrity; a Vite build and live browser/API integration were not run because frontend dependencies and a configured database are not installed in the packaging environment.

---

## Final Batch 3 — Organization Admin Portal

### Organization administrator experience
- Portal entry point: `/organization-admin/login` (also linked from `/portal`).
- Protected workspace: `/organization-admin`.
- Organization-scoped API: `/api/org-admin`.
- Overview metrics for the signed-in user's organization only.
- Locations and outlet directory, recent organization audit activity, and user access management.
- Administrators can activate/deactivate users and assign supported organization roles. Platform-wide roles cannot be assigned from this portal.
- API routes scope reads and writes using the authenticated user's `organizationId`; request-supplied organization IDs are not used to choose a tenant.

### Temporary local demo Super Admin credentials
- Email: `demo.admin@bizlift.local`
- Password: `BizLiftDemo!2026`
- Login: `http://localhost:5173/admin/login`

These credentials are created by an explicit local-development provisioning script; they are not silently seeded into every environment. From the `backend` directory, ensure PostgreSQL and `DATABASE_URL` are configured in `.env`, set `BIZLIFT_DB_MODE=postgres` and `BIZLIFT_ENABLE_DEMO_ADMIN=true`, then run:

```bash
npm run demo:admin
```

The script refuses to run unless the opt-in flag is set and refuses `NODE_ENV=production`. Remove `BIZLIFT_ENABLE_DEMO_ADMIN` after provisioning. This is a demo account using the project's existing password-hashing scheme; change/delete it before any shared or public deployment. Do not expose the `.local` demo credentials outside development.

### Batch 3 validation status
- Backend syntax checks and package JSON checks are run as part of packaging.
- Full Prisma/database integration, browser login, and frontend production build require the project's configured database and installed dependencies and are not claimed as verified in this packaging environment.
- Organization-admin account onboarding/activation and spreadsheet imports are planned for Final Batch 4.

For an isolated organization-admin demo login, run `npm run demo:org-admin` from `backend` with the same explicit `BIZLIFT_ENABLE_DEMO_ADMIN=true` opt-in. It provisions a demo tenant (`bizlift-demo`) and the following local-only account:
- Email: `demo.orgadmin@bizlift.local`
- Password: `BizLiftOrg!2026`
- Login: `http://localhost:5173/organization-admin/login`

This creates or reuses the demo organization; it does not grant access to other organizations. The demo credentials are for local testing only and must not be used on a public deployment.


---

## Final Batch 4 — Customer onboarding and spreadsheet imports

### Platform onboarding
- Added `POST /api/admin/onboarding`, restricted to the existing platform-admin gate.
- Creates the organization, first location, first outlet, inactive organization-admin user, and audit event in a single Prisma transaction.
- Super Admin UI includes an onboarding form at `/admin`.
- Organization administrator activation is explicitly pending. Invitation email delivery and account activation are not implemented, so the account cannot sign in until that workflow is configured. The API does not claim to have sent an email or expose a temporary password.

### Inventory CSV / Excel import
- Organization Admin UI at `/organization-admin` includes an outlet selector, CSV template, and `.csv` / `.xlsx` import controls.
- API: `POST /api/imports/inventory`; requires an authenticated organization admin or platform admin and PostgreSQL mode.
- Imports into an outlet only after checking that it belongs to the signed-in administrator's organization (platform admins may select any outlet).
- Supports first-sheet `.xlsx` workbooks and `.csv` files; requires `name` and `unit` headers. Optional columns: `category`, `current_stock`, `min_threshold`, `cost_price`, `selling_price`, `supplier_name`, `expiry_date`.
- Maximum 1,000 rows per import and 6 MB file size. Existing item names in the selected outlet are skipped to avoid duplicate inventory rows. Invalid rows are returned for review. Successful imports write an audit event.
- The request-body default was increased to 12 MB to accommodate base64-encoded spreadsheet uploads. Set `BODY_LIMIT` deliberately if overriding it in an environment.

### Batch 4 validation status
- Passed: Node syntax checks for new/modified backend JavaScript.
- Passed: CSV parser smoke test, including quoted commas.
- Passed: generated `.xlsx` workbook parser smoke test using a real workbook with shared strings.
- Passed: package manifest JSON checks and final ZIP integrity check.
- Not verified here: frontend Vite build, authenticated API/database integration, and browser interaction. These require installed project dependencies and a configured running PostgreSQL database.
- Keep invitation activation as a known limitation; do not send onboarding emails or represent pending accounts as active until secure activation is implemented.

## Final Batch 5 — Live Forecasting & Transaction Synchronization

### Operational data flow
- Completed POS sales and orders publish outlet-scoped realtime events (`sale.created`, `order.created`); order cancellations publish `order.cancelled` after restoring recipe ingredients.
- Inventory creation, edits, stock adjustments, and spreadsheet imports publish inventory events. Spreadsheet imports now mirror newly accepted inventory rows into the existing operational workspace store so POS and workspace analytics can see imported opening stock.
- The dashboard listens to the authenticated Server-Sent Events stream and refreshes persisted dashboard and AI data after relevant events. A 15-second inventory/sales refresh is retained as a fallback for deployments where in-memory realtime publishers are not shared across backend workers; AI intelligence also refreshes on its existing cadence and immediately after a transaction event.
- Where PostgreSQL organization inventory records exist, completed POS sales, cancellations, and manual inventory changes mirror current quantities and stock status back to those records. A mirror failure is logged and does not falsely report an already-saved POS transaction as failed.
- Realtime subscriptions are scoped by the office/outlet pair, so a change in one outlet is not broadcast to another outlet.

### Important architecture note
The current project still contains both a JSON-backed operational workspace engine and PostgreSQL organization/admin records. Batch 5 adds synchronization between those existing paths; it does not yet replace them with one fully transactional database repository. PostgreSQL mirror writes are best-effort and logged. Before a public multi-worker production launch, the operational inventory, sales, recipe, and transaction records should be consolidated into PostgreSQL transactions and realtime publication should use a shared broker/outbox (for example, PostgreSQL outbox + Redis/pub-sub). Do not describe this hybrid build as production-hardened until that migration and live integration testing are complete.

### Verification
- `node --check` passed for backend JavaScript files.
- `node backend/scripts/testRealtimePlatform.js` covers outlet-scoped event delivery, mixed organization metadata, and subscriber cleanup.
- ZIP integrity verified. Frontend production build and live PostgreSQL integration were not run in this packaging environment because dependency installations and a live database were unavailable.

## Final Batch 6 — Advanced Visual Analytics

### Reports experience
- Reworked `/reports` into a responsive operations analytics view with consistent chart spacing, subdued axes/gridlines, hover tooltips, subtle chart animation, ranked menu-item bars, a reporting-period selector, manual refresh, and CSV export.
- Adds honest zero-data states for revenue, demand, category, top-menu, and waste views. The UI does not fabricate activity when there are no saved records.
- Displays the last successful refresh time and realtime connection state.
- The reports page subscribes to the authenticated, workspace-scoped Server-Sent Events stream and refreshes after sale/order/cancellation, inventory/import, waste, procurement, and recipe events. A 15-second polling fallback remains active when realtime delivery is unavailable.
- Multiple events emitted by a single transaction are debounced into a single report refresh.
- Charts and KPIs continue to use the reports API response; the browser does not invent data locally.

### Batch 6 verification status
- Inspected realtime event payload format and aligned reports subscription with `event.eventName` as delivered by the existing SSE stream.
- Verified source files remain within the single-root-README project layout.
- Not verified in this packaging environment: Vite production build, browser rendering, or live PostgreSQL/API behavior because frontend dependencies and a configured database are not installed here. Run `npm install && npm run build` inside `client` and the relevant backend integration tests in your configured environment before treating this batch as release-ready.


## Final Batch 7 — End-to-end Integration & Security

### POS correctness and retry safety
- POS checkout sends an `Idempotency-Key`. The backend stores the original response in the workspace and returns it on a repeated request, preventing common network retries/double-clicks from creating a second order or a second inventory deduction. The key is scoped to the authenticated workspace state and the operation type; records are bounded to the 500 most recent keys. API clients should send stable keys for their own retryable writes as well.
- Multi-line orders now plan ingredient consumption against a shadow inventory, so two menu items that consume the same ingredient are validated cumulatively before stock changes are applied. Duplicate ingredient rows within a single recipe are also accounted for cumulatively.
- Order cancellation remains guarded against a second cancellation and restores recipe ingredients through reversal transactions.
- Realtime events continue to publish after the operational write, allowing the dashboard and reports to refresh from persisted data.

### Batch 7 verification
- `cd backend && npm run test:batch7` — idempotency behavior and cumulative recipe consumption regression checks.
- `cd backend && npm run test:realtime` — outlet-scoped pub/sub and cleanup.
- `cd backend && npm run test:tenant` — same-workspace access and cross-vendor denial.
- `cd backend && npm run test:architecture` and `npm run test:data` passed in the packaging environment.
- `npm run release:check` was run and correctly reported **BLOCKED** because this packaging environment is in development/JSON mode without a production database URL and production CORS origin.

### Remaining production blockers (must be resolved before real customers)
- Operational data is still backed by JSON while organization/admin records use PostgreSQL. Idempotency records and stock changes therefore are not protected by a single cross-process database transaction. A real multi-worker launch still requires moving operational sales, inventory, recipes and idempotency records into PostgreSQL transactions (or equivalent durable atomic storage).
- Realtime pub/sub currently uses process memory; use a shared broker or transactional outbox before horizontally scaling.
- The frontend production build, browser end-to-end checkout, and live PostgreSQL integration were not run in this packaging environment.
- Do not claim the project is production-ready until those blockers are addressed and the release check passes in the target deployment environment.

---

## Final Batch 8 — Release package, demo data, and acceptance testing

### Local demo accounts (development only)

These accounts are only available after you provision them against your configured local PostgreSQL database. They are not universal credentials and must never be used on a public deployment.

| Access | Login | Demo credentials |
|---|---|---|
| Platform Super Admin | `http://localhost:5173/admin/login` | `demo.admin@bizlift.local` / `BizLiftDemo!2026` |
| Organization Admin | `http://localhost:5173/organization-admin/login` | `demo.orgadmin@bizlift.local` / `BizLiftOrg!2026` |
| Existing SnapEats workspace | `http://localhost:5173/portal` then SnapEats sign-in | `snapeats@techparkone.com` / `snapeats123` (if this demo account exists in your current local data) |

To provision the two admin accounts, start PostgreSQL, configure `BIZLIFT_DB_MODE=postgres` and `DATABASE_URL` in `backend/.env`, then run from `backend`:

```bash
# Local development only; the scripts refuse NODE_ENV=production.
echo 'BIZLIFT_ENABLE_DEMO_ADMIN=true' >> .env
npm run demo:admin
npm run demo:org-admin
# Remove the opt-in flag after successful provisioning:
sed -i '' '/^BIZLIFT_ENABLE_DEMO_ADMIN=true$/d' .env
```

The organization-admin script creates/reuses a demo organization, a `Demo Campus` location, and a `Demo Restaurant` outlet so the spreadsheet importer has a target. The scripts print errors if PostgreSQL is not configured or accessible. Do not use these shared demo passwords in a deployed environment; rotate or delete the demo accounts before any external demo.

### Sample spreadsheet

- `sample-data/BizLift_Demo_Inventory.csv`
- `sample-data/BizLift_Demo_Inventory.xlsx`

Upload one of these from `/organization-admin` after selecting the `Demo Campus · Demo Restaurant` outlet. The spreadsheet creates ingredient/stock records; it does **not** create menu products or recipe mappings. To test a paneer-wrap sale, configure a menu item and recipe in the POS/recipe workflow using these ingredients, then complete a sale. The dashboard and reports should refresh from the transaction events and polling fallback. Re-importing the same names is expected to skip duplicates rather than overwrite quantities.

### End-to-end acceptance test

1. Provision the demo accounts and sign in as Organization Admin.
2. Import the sample inventory spreadsheet into the demo restaurant outlet.
3. Confirm imported stock appears in the inventory view and that low-stock indicators are based on the imported quantities.
4. Create a menu item and recipe using the imported ingredients (the inventory importer does not create recipes).
5. Complete one POS sale. Confirm the order is saved, recipe ingredients are deducted once, revenue/top-item metrics update, and open reports refresh without manually editing or re-uploading the spreadsheet.
6. Retry the same checkout request using the same idempotency key and confirm it does not create a second sale; cancel once and confirm stock reversal is applied only once.
7. Repeat with a second outlet/user to confirm tenant boundaries and live events remain scoped.

### Startup-readiness verdict

This final batch is a release-candidate package, **not a certification that BizLift is startup/production-ready**. The known blockers recorded in Batch 5/7 remain material: operational sales, inventory and recipes still use a JSON-backed workspace path alongside PostgreSQL organization/admin records; some mirror writes are best-effort; realtime pub/sub is process-local; and the frontend production build, browser E2E and live PostgreSQL checkout/import flow must be run in the target environment. Before onboarding real customers, consolidate operational writes into durable atomic database transactions, use shared realtime delivery (or an outbox), enforce production secrets/CORS, run the full test suite against PostgreSQL, and require `npm run release:check` to pass with production settings. Do not present the system as production-hardened until these gates pass.

### Final Batch 8 verification in the packaging environment

Source syntax and archive integrity checks are performed during packaging. A live database, production secrets, and browser session are not available in this packaging environment, so no claim is made that the complete sale-to-chart flow has been verified against your local installation.
