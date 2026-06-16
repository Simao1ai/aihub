import { Router, type IRouter } from "express";
import { db, workspacesTable, usersTable, organizationsTable, orgMembershipsTable } from "@workspace/db";
import { eq, asc } from "drizzle-orm";
import bcrypt from "bcryptjs";
import rateLimit from "express-rate-limit";
import { createSession, createPreAuthSession, destroySession, validateSession, validatePreAuthSession } from "../lib/session";

const router: IRouter = Router();

const loginLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: "Too many login attempts. Please wait a minute." },
});

// ── GET /api/auth/workspaces — public list for login picker ──────────────────
router.get("/workspaces", async (_req, res) => {
  try {
    const rows = await db
      .select()
      .from(workspacesTable)
      .where(eq(workspacesTable.isActive, true))
      .orderBy(asc(workspacesTable.sortOrder), asc(workspacesTable.createdAt));
    res.json(rows.map(w => ({
      id: w.id, slug: w.slug, name: w.name, description: w.description,
      emoji: w.emoji, color: w.color, businessTag: w.slug,
    })));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/auth/signup — create new user + personal org ───────────────────
router.post("/signup", loginLimiter, async (req, res) => {
  const { email, name, password } = req.body as { email?: string; name?: string; password?: string };

  if (!email || !name || !password) {
    return res.status(400).json({ success: false, error: "email, name, and password are required" });
  }
  if (password.length < 8) {
    return res.status(400).json({ success: false, error: "Password must be at least 8 characters" });
  }

  const emailLower = email.trim().toLowerCase();

  try {
    const [existing] = await db.select().from(usersTable).where(eq(usersTable.email, emailLower));
    if (existing) {
      return res.status(400).json({ success: false, error: "An account with this email already exists" });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const [user] = await db.insert(usersTable).values({
      email: emailLower,
      name: name.trim(),
      passwordHash,
    }).returning();

    const rawSlug = emailLower.split("@")[0].replace(/[^a-z0-9]/g, "-").slice(0, 20);
    const orgSlug = `${rawSlug}-${user.id}`;
    const [org] = await db.insert(organizationsTable).values({
      name: `${name.trim()}'s Workspace`,
      slug: orgSlug,
      ownerId: user.id,
    }).returning();

    await db.insert(orgMembershipsTable).values({
      userId: user.id,
      orgId: org.id,
      role: "owner",
    });

    const wsPassword = await bcrypt.hash(password, 12);
    const wsSlug = `${orgSlug}-general`;
    const [ws] = await db.insert(workspacesTable).values({
      slug: wsSlug,
      name: "General",
      description: "Your main workspace",
      emoji: "⚡",
      color: "#6366f1",
      password: wsPassword,
      businessContext: "",
      isActive: true,
      sortOrder: 0,
      orgId: org.id,
    }).returning();

    const preToken = await createPreAuthSession(user.id);
    return res.status(201).json({
      success: true,
      type: "signup",
      preToken,
      user: { id: user.id, email: user.email, name: user.name },
      workspaces: [{
        id: ws.id, slug: ws.slug, name: ws.name, description: ws.description,
        emoji: ws.emoji, color: ws.color, businessTag: ws.slug,
      }],
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ── POST /api/auth/login — workspace password OR email+password ───────────────
router.post("/login", loginLimiter, async (req, res) => {
  const { workspace, password, email } = req.body as {
    workspace?: string; password?: string; email?: string;
  };

  if (!password) {
    return res.status(400).json({ success: false, error: "password is required" });
  }

  // ── Email login ──
  if (email) {
    const emailLower = email.trim().toLowerCase();
    try {
      const [user] = await db.select().from(usersTable).where(eq(usersTable.email, emailLower));
      if (!user) {
        return res.status(401).json({ success: false, error: "Invalid email or password" });
      }
      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) {
        return res.status(401).json({ success: false, error: "Invalid email or password" });
      }

      // Get workspaces via org membership
      const memberships = await db
        .select({ orgId: orgMembershipsTable.orgId })
        .from(orgMembershipsTable)
        .where(eq(orgMembershipsTable.userId, user.id));
      const orgIds = memberships.map(m => m.orgId);

      let accessibleWorkspaces: typeof workspacesTable.$inferSelect[] = [];
      if (orgIds.length > 0) {
        const allWs = await db.select().from(workspacesTable)
          .where(eq(workspacesTable.isActive, true))
          .orderBy(asc(workspacesTable.sortOrder), asc(workspacesTable.createdAt));
        accessibleWorkspaces = allWs.filter(w => w.orgId != null && orgIds.includes(w.orgId));
      }

      const preToken = await createPreAuthSession(user.id);
      return res.json({
        success: true,
        type: "email",
        preToken,
        user: { id: user.id, email: user.email, name: user.name },
        workspaces: accessibleWorkspaces.map(w => ({
          id: w.id, slug: w.slug, name: w.name, description: w.description,
          emoji: w.emoji, color: w.color, businessTag: w.slug,
        })),
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  // ── Workspace password login (legacy) ──
  if (!workspace) {
    return res.status(400).json({ success: false, error: "workspace or email is required" });
  }
  try {
    const [ws] = await db.select().from(workspacesTable).where(eq(workspacesTable.slug, workspace));
    if (!ws || !ws.isActive) {
      return res.status(400).json({ success: false, error: "Unknown workspace" });
    }
    if (!ws.password.startsWith("$2a$") && !ws.password.startsWith("$2b$")) {
      return res.status(401).json({ success: false, error: "Password not configured. Contact the administrator." });
    }
    const passwordValid = await bcrypt.compare(password, ws.password);
    if (!passwordValid) {
      return res.status(401).json({ success: false, error: "Incorrect password" });
    }
    const token = await createSession(ws.slug);
    return res.json({
      success: true,
      type: "workspace",
      token,
      workspace: ws.slug,
      displayName: ws.name,
      businessTag: ws.slug,
      color: ws.color,
      emoji: ws.emoji,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ── POST /api/auth/workspace-select — exchange preToken for workspace session ─
router.post("/workspace-select", async (req, res) => {
  const { preToken, workspaceSlug } = req.body as { preToken?: string; workspaceSlug?: string };
  if (!preToken || !workspaceSlug) {
    return res.status(400).json({ success: false, error: "preToken and workspaceSlug are required" });
  }
  try {
    const preAuth = await validatePreAuthSession(preToken);
    if (!preAuth) {
      return res.status(401).json({ success: false, error: "Invalid or expired pre-auth token" });
    }

    const memberships = await db
      .select({ orgId: orgMembershipsTable.orgId })
      .from(orgMembershipsTable)
      .where(eq(orgMembershipsTable.userId, preAuth.userId));
    const orgIds = memberships.map(m => m.orgId);

    const [ws] = await db.select().from(workspacesTable).where(eq(workspacesTable.slug, workspaceSlug));
    if (!ws || !ws.isActive) {
      return res.status(404).json({ success: false, error: "Workspace not found" });
    }
    if (ws.orgId == null || !orgIds.includes(ws.orgId)) {
      return res.status(403).json({ success: false, error: "You don't have access to this workspace" });
    }

    await destroySession(preToken);
    const token = await createSession(ws.slug, preAuth.userId);
    return res.json({
      success: true,
      token,
      workspace: ws.slug,
      displayName: ws.name,
      businessTag: ws.slug,
      color: ws.color,
      emoji: ws.emoji,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ── POST /api/auth/logout ────────────────────────────────────────────────────
router.post("/logout", async (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (token) await destroySession(token);
  res.json({ success: true });
});

// ── GET /api/auth/me ─────────────────────────────────────────────────────────
router.get("/me", async (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ success: false, error: "No token" });
  const workspace = await validateSession(token);
  if (!workspace) return res.status(401).json({ success: false, error: "Invalid or expired session" });
  try {
    const [ws] = await db.select().from(workspacesTable).where(eq(workspacesTable.slug, workspace));
    if (!ws) return res.status(401).json({ success: false, error: "Workspace not found" });
    return res.json({
      success: true,
      workspace: ws.slug,
      displayName: ws.name,
      businessTag: ws.slug,
      color: ws.color,
      emoji: ws.emoji,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ── GET /api/auth/verify ─────────────────────────────────────────────────────
router.get("/verify", async (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "") || (req.query.token as string) || "";
  if (!token) return res.status(401).json({ success: false, error: "No token" });
  const workspace = await validateSession(token);
  if (!workspace) return res.status(401).json({ success: false, error: "Invalid or expired session" });
  return res.json({ success: true, workspace });
});

export default router;
