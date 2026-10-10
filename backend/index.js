import express from "express";
import cors from "cors";
import inventoryRoutes from "./routes/inventoryRoutes.js";
import recipeRoutes from "./routes/recipeRoutes.js";
import salesRoutes from "./routes/salesRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import wasteRoutes from "./routes/wasteRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import systemRoutes from "./routes/systemRoutes.js";
import intelligenceRoutes from "./routes/intelligenceRoutes.js";
import procurementRoutes from "./routes/procurementRoutes.js";
import { env } from "./config/env.js";
import { securityHeaders, requestRateLimit } from "./middleware/security.js";
import workspaceRoutes from "./routes/workspaceRoutes.js";
import reportRoutes from "./routes/reportRoutes.js";
import dataRoutes from "./routes/dataRoutes.js";
import mlRoutes from "./routes/mlRoutes.js";
import realtimeRoutes from "./routes/realtimeRoutes.js";
import aiCopilotRoutes from "./routes/aiCopilotRoutes.js";
import observabilityRoutes from "./routes/observabilityRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import orgAdminRoutes from "./routes/orgAdminRoutes.js";
import importRoutes from "./routes/importRoutes.js";
import { requestContext } from "./middleware/requestContext.js";
import { logRequest } from "./services/requestLogger.js";
import { notFoundHandler, errorHandler } from "./middleware/errorHandler.js";

const app = express();
const PORT = env.PORT;

app.set("trust proxy", 1);
app.use(securityHeaders);
app.use(requestContext);
app.use(logRequest);
app.use(cors({ origin: env.CORS_ORIGIN, credentials: false }));
app.use(express.json({ limit: env.BODY_LIMIT }));
app.use(requestRateLimit({ windowMs: 60_000, max: 240 }));
app.use("/api/auth", authRoutes);
app.use("/api/workspaces", workspaceRoutes);
app.use("/api/system", systemRoutes);

app.get("/", (req, res) => {
  res.send("BizLift backend is running");
});

app.use("/api/inventory", inventoryRoutes);
app.use("/api/recipes", recipeRoutes);
app.use("/api/sales", salesRoutes);
app.use("/api/waste", wasteRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/intelligence", intelligenceRoutes);
app.use("/api/procurement", procurementRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/data", dataRoutes);
app.use("/api/ml", mlRoutes);
app.use("/api/realtime", realtimeRoutes);
app.use("/api/copilot", aiCopilotRoutes);
app.use("/api/observability", observabilityRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/org-admin", orgAdminRoutes);
app.use("/api/imports", importRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
