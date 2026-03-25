import { Router, type IRouter } from "express";
import healthRouter from "./health";
import agentsRouter from "./agents";
import anthropicRouter from "./anthropic";
import brainRouter from "./brain";
import automationsRouter from "./automations";
import connectionsRouter from "./connections";
import authRouter from "./auth";
import pipelinesRouter from "./pipelines";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/agents", agentsRouter);
router.use("/anthropic", anthropicRouter);
router.use("/brain", brainRouter);
router.use("/automations", automationsRouter);
router.use("/connections", connectionsRouter);
router.use("/pipelines", pipelinesRouter);

export default router;
