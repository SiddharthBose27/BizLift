import { send } from "../utils/controller.js";
import { buildCopilotBrief, listCopilotActions, decideCopilotAction } from "../services/aiCopilotService.js";

export const postCopilotBrief = async (req, res) => send(res, { data: await buildCopilotBrief({ scope: req.tenant || req.workspace, userId: req.auth.user.id, intent: req.body?.intent || "daily_operations" }), workspace: req.workspace }, "AI Copilot brief ready", 201);
export const getCopilotActions = async (req, res) => send(res, { data: await listCopilotActions(req.tenant || req.workspace, req.query?.limit), workspace: req.workspace }, "AI Copilot actions ready");
export const decideCopilot = async (req, res) => send(res, { data: await decideCopilotAction({ scope: req.tenant || req.workspace, actionId: req.params.id, decision: req.body?.decision, userId: req.auth.user.id }), workspace: req.workspace }, "AI Copilot action updated");
