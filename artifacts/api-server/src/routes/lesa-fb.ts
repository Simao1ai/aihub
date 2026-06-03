/**
 * LESA FB Agent admin routes.
 * Mounted at /api/agents/lesa-fb — protected by the global Bearer-token
 * middleware already in place on all /api/* routes.
 */
import { Router } from "express";
import { runCycle, startLesaFbSchedule, stopLesaFbSchedule } from "../lib/lesa-fb/agent";
import { loadState, saveState } from "../lib/lesa-fb/state";
import { generatePost, nextTheme } from "../lib/lesa-fb/contentEngine";
import { checkBrandSafety } from "../lib/lesa-fb/brandSafety";
import { tokenHealth, getValidPageToken } from "../lib/lesa-fb/tokenManager";

const router = Router();

// ── Status + recent history ──────────────────────────────────────────────────
router.get("/status", async (_req, res) => {
  try {
    const state = await loadState();
    res.json({
      enabled: state.enabled,
      postCount: state.postCount,
      lastError: state.lastError ?? null,
      recent: state.history.slice(-10).reverse(),
      mode: "soft_gate",
      schedule: process.env.LESA_FB_CRON ?? "15 9 * * 1,3,5 (Mon/Wed/Fri 9:15am ET)",
    });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// ── Kill-switch toggle ───────────────────────────────────────────────────────
router.post("/toggle", async (req, res) => {
  try {
    const state = await loadState();
    state.enabled = typeof req.body?.enabled === "boolean" ? req.body.enabled : !state.enabled;
    await saveState(state);
    res.json({ enabled: state.enabled });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// ── Dry-run preview (no save, no post) ──────────────────────────────────────
router.post("/preview", async (_req, res) => {
  try {
    const state = await loadState();
    const theme = nextTheme(state.postCount);
    const draft = await generatePost(theme);
    const safety = checkBrandSafety(draft.text);
    res.json({ theme, text: draft.text, safety, charCount: draft.text.length });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// ── Force a real cycle now ───────────────────────────────────────────────────
router.post("/run-now", async (_req, res) => {
  try {
    const outcome = await runCycle();
    res.json(outcome);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// ── Schedule control ─────────────────────────────────────────────────────────
router.post("/schedule/start", (_req, res) => {
  startLesaFbSchedule();
  res.json({ ok: true });
});

router.post("/schedule/stop", (_req, res) => {
  stopLesaFbSchedule();
  res.json({ ok: true });
});

// ── Token health ─────────────────────────────────────────────────────────────
router.get("/token-health", async (_req, res) => {
  try {
    res.json(await tokenHealth());
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// ── Force token bootstrap / refresh ──────────────────────────────────────────
router.post("/token-refresh", async (_req, res) => {
  try {
    await getValidPageToken();
    res.json({ ok: true, health: await tokenHealth() });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});

export default router;
