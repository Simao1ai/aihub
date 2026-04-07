import { Router, type IRouter } from "express";
import healthRouter from "./health";
import agentsRouter from "./agents";
import anthropicRouter from "./anthropic";
import brainRouter from "./brain";
import automationsRouter from "./automations";
import connectionsRouter from "./connections";
import authRouter from "./auth";
import pipelinesRouter from "./pipelines";
import workspacesRouter from "./workspaces";
import tasksRouter from "./tasks";
import contactsRouter from "./contacts";
import kpisRouter from "./kpis";
import powerUpsRouter from "./power-ups";
import socialPostsRouter from "./social-posts";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/agents", agentsRouter);
router.use("/anthropic", anthropicRouter);
router.use("/brain", brainRouter);
router.use("/automations", automationsRouter);
router.use("/connections", connectionsRouter);
router.use("/pipelines", pipelinesRouter);
router.use("/workspaces", workspacesRouter);
router.use("/tasks", tasksRouter);
router.use("/contacts", contactsRouter);
router.use("/kpis", kpisRouter);
router.use("/power-ups", powerUpsRouter);
router.use("/social-posts", socialPostsRouter);

export default router;
