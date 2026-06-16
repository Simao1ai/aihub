import { Router, type IRouter } from "express";
import { db, contactsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router: IRouter = Router();

router.get("/", async (req, res) => {
  try {
    const ws = (req as any).sessionWorkspace as string;
    const { status } = req.query as Record<string, string>;
    const conditions: ReturnType<typeof eq>[] = [eq(contactsTable.businessTag, ws)];
    if (status) conditions.push(eq(contactsTable.status, status));
    const rows = await db.select().from(contactsTable).where(and(...conditions)).orderBy(contactsTable.createdAt);
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const ws = (req as any).sessionWorkspace as string;
    const { name, company, email, phone, status, notes } = req.body;
    if (!name) return res.status(400).json({ error: "name is required" });
    const [row] = await db.insert(contactsTable).values({
      name,
      company: company ?? "",
      email: email ?? "",
      phone: phone ?? "",
      status: status ?? "lead",
      notes: notes ?? "",
      businessTag: ws,
    }).returning();
    res.status(201).json(row);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const ws = (req as any).sessionWorkspace as string;
    const id = parseInt(req.params.id);
    const { name, company, email, phone, status, notes } = req.body;
    const updates: Record<string, unknown> = {};
    if (name !== undefined) updates.name = name;
    if (company !== undefined) updates.company = company;
    if (email !== undefined) updates.email = email;
    if (phone !== undefined) updates.phone = phone;
    if (status !== undefined) updates.status = status;
    if (notes !== undefined) updates.notes = notes;
    const [row] = await db.update(contactsTable).set(updates)
      .where(and(eq(contactsTable.id, id), eq(contactsTable.businessTag, ws)))
      .returning();
    if (!row) return res.status(404).json({ error: "Contact not found" });
    res.json(row);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const ws = (req as any).sessionWorkspace as string;
    const id = parseInt(req.params.id);
    await db.delete(contactsTable).where(and(eq(contactsTable.id, id), eq(contactsTable.businessTag, ws)));
    res.status(204).end();
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
