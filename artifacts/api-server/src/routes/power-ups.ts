import { Router, type IRouter } from "express";
import { db, automationTemplatesTable, automationsTable, agentsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

// GET /api/power-ups — list all templates
router.get("/", async (_req, res) => {
  try {
    const templates = await db.select().from(automationTemplatesTable).orderBy(automationTemplatesTable.category, automationTemplatesTable.name);
    res.json(templates);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/power-ups/:id/activate — create an automation from a template
router.post("/:id/activate", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { businessTag } = req.body;

    const [template] = await db.select().from(automationTemplatesTable).where(eq(automationTemplatesTable.id, id));
    if (!template) return res.status(404).json({ error: "Template not found" });

    // Find the agent by slug
    const [agent] = await db.select().from(agentsTable).where(eq(agentsTable.slug, template.agentSlug));
    if (!agent) return res.status(400).json({ error: `Agent '${template.agentSlug}' not found` });

    // Create the automation
    const name = businessTag && businessTag !== "general"
      ? `${template.name} [${businessTag}]`
      : template.name;

    const [automation] = await db.insert(automationsTable).values({
      name,
      agentId: agent.id,
      scheduleCron: null,
      promptTemplate: template.promptTemplate,
      isActive: true,
      status: "idle",
    }).returning();

    res.status(201).json(automation);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/power-ups/:id/run — run a template instantly (creates + runs in one step)
router.post("/:id/run", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { businessTag } = req.body;

    const [template] = await db.select().from(automationTemplatesTable).where(eq(automationTemplatesTable.id, id));
    if (!template) return res.status(404).json({ error: "Template not found" });

    const [agent] = await db.select().from(agentsTable).where(eq(agentsTable.slug, template.agentSlug));
    if (!agent) return res.status(400).json({ error: `Agent '${template.agentSlug}' not found` });

    const name = `${template.name} (One-time)`;
    const [automation] = await db.insert(automationsTable).values({
      name,
      agentId: agent.id,
      scheduleCron: null,
      promptTemplate: template.promptTemplate,
      isActive: false,
      status: "running",
    }).returning();

    res.status(201).json({ automation, templateName: template.name });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
