import { Router, type IRouter } from "express";

const router: IRouter = Router();

const WORKSPACES = [
  {
    id: 'general',
    displayName: 'General',
    businessTag: 'general',
    envVar: 'GENERAL_PASSWORD',
    defaultPassword: 'aihub2024',
  },
  {
    id: 'equifind',
    displayName: 'Equifind Recovery',
    businessTag: 'equifind',
    envVar: 'EQUIFIND_PASSWORD',
    defaultPassword: 'aihub2024',
  },
  {
    id: 'home_inspection',
    displayName: 'Home Inspections',
    businessTag: 'home_inspection',
    envVar: 'HOME_INSPECTION_PASSWORD',
    defaultPassword: 'aihub2024',
  },
] as const;

// GET /api/auth/workspaces — list available workspaces (no auth required)
router.get("/workspaces", (_req, res) => {
  res.json(WORKSPACES.map(w => ({
    id: w.id,
    displayName: w.displayName,
    businessTag: w.businessTag,
  })));
});

// POST /api/auth/login — authenticate with workspace + password
router.post("/login", (req, res) => {
  const { workspace, password } = req.body as { workspace?: string; password?: string };

  if (!workspace || !password) {
    return res.status(400).json({ success: false, error: "workspace and password are required" });
  }

  const ws = WORKSPACES.find(w => w.id === workspace);
  if (!ws) {
    return res.status(400).json({ success: false, error: "Unknown workspace" });
  }

  const expected = process.env[ws.envVar] || ws.defaultPassword;
  if (password !== expected) {
    return res.status(401).json({ success: false, error: "Incorrect password" });
  }

  return res.json({
    success: true,
    workspace: ws.id,
    displayName: ws.displayName,
    businessTag: ws.businessTag,
  });
});

// Legacy GET /api/auth/verify — kept for backward compat
router.get("/verify", (req, res) => {
  const password = req.query.password as string || req.headers.authorization?.replace("Bearer ", "") || "";
  const appPassword = process.env.APP_PASSWORD || process.env.GENERAL_PASSWORD || "aihub2024";
  if (password === appPassword) {
    res.json({ success: true });
  } else {
    res.status(401).json({ success: false, error: "Invalid password" });
  }
});

export default router;
