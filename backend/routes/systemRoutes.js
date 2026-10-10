// server/routes/systemRoutes.js

import express from "express";
import { getPersistenceStatus } from "../services/db/persistenceService.js";

const router = express.Router();

router.get("/health", async (req, res) => {
  const persistence = await getPersistenceStatus();
  const healthy = !persistence.configured || persistence.connected || persistence.provider === "json-demo";
  return res.status(healthy ? 200 : 503).json({
    success: healthy,
    message: healthy ? "BizLift API healthy" : "BizLift API persistence unavailable",
    timestamp: new Date().toISOString(),
    persistence,
  });
});

export default router;
