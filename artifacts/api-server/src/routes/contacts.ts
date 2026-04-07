import { Router, type IRouter } from "express";
import { db, contactsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

router.get("/", async (req, res) => {
  try {
    const { businessTag, status } = req.query as Record<string, string>;
    let rows = await db.select().from(contactsTable).orderBy(contactsTable.createdAt);
    if (businessTag) rows = rows.filter(r => r.businessTag === businessTag);
    if (status) rows = rows.filter(r => r.status === status);
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const { name, company, email, phone, status, notes, businessTag } = req.body;
    if (!name || !businessTag) return res.status(400).json({ error: "name and businessTag required" });
    const [row] = await db.insert(contactsTable).values({
      name,
      company: company ?? "",
      email: email ?? "",
      phone: phone ?? "",
      status: status ?? "lead",
      notes: notes ?? "",
      businessTag,
    }).returning();
    res.status(201).json(row);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, company, email, phone, status, notes } = req.body;
    const updates: Record<string, unknown> = {};
    if (name !== undefined) updates.name = name;
    if (company !== undefined) updates.company = company;
    if (email !== undefined) updates.email = email;
    if (phone !== undefined) updates.phone = phone;
    if (status !== undefined) updates.status = status;
    if (notes !== undefined) updates.notes = notes;
    const [row] = await db.update(contactsTable).set(updates).where(eq(contactsTable.id, id)).returning();
    if (!row) return res.status(404).json({ error: "Contact not found" });
    res.json(row);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(contactsTable).where(eq(contactsTable.id, id));
    res.status(204).end();
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
