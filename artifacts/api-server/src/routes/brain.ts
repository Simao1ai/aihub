import { Router, type IRouter } from "express";
import { db, brainDocumentsTable } from "@workspace/db";
import { eq, ilike } from "drizzle-orm";
import multer from "multer";
import { logger } from "../lib/logger";

const router: IRouter = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

function chunkText(text: string, chunkSize = 500): string[] {
  const words = text.split(/\s+/);
  const chunks: string[] = [];
  let current: string[] = [];
  for (const word of words) {
    current.push(word);
    if (current.length >= chunkSize) {
      chunks.push(current.join(" "));
      current = [];
    }
  }
  if (current.length > 0) chunks.push(current.join(" "));
  return chunks;
}

router.get("/documents", async (req, res) => {
  try {
    const { businessTag } = req.query;
    let query = db.select().from(brainDocumentsTable);
    if (businessTag && typeof businessTag === "string") {
      query = query.where(eq(brainDocumentsTable.businessTag, businessTag)) as typeof query;
    }
    const docs = await query.orderBy(brainDocumentsTable.createdAt);
    res.json(docs);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch documents" });
  }
});

router.post("/documents", async (req, res) => {
  try {
    const { title, type, content, url, businessTag } = req.body;
    let textContent = content || "";

    if (type === "url" && url) {
      const response = await fetch(url);
      const html = await response.text();
      textContent = html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 50000);
    }

    const chunks = chunkText(textContent);
    const insertedDocs = [];

    for (let i = 0; i < chunks.length; i++) {
      const [doc] = await db.insert(brainDocumentsTable).values({
        title: chunks.length > 1 ? `${title} (${i + 1}/${chunks.length})` : title,
        type,
        content: chunks[i],
        businessTag: businessTag || "general",
        metadata: { chunkIndex: i, totalChunks: chunks.length, sourceUrl: url || null },
      }).returning();
      insertedDocs.push(doc);
    }

    res.status(201).json(insertedDocs);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to create document" });
  }
});

router.post("/documents/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    const { title, businessTag } = req.body;

    let text = "";
    try {
      const pdfParse = (await import("pdf-parse")).default;
      const data = await pdfParse(req.file.buffer);
      text = data.text;
    } catch (pdfErr) {
      logger.error(pdfErr, "PDF parse error");
      return res.status(400).json({ error: "Failed to parse PDF" });
    }

    const chunks = chunkText(text);
    const insertedDocs = [];

    for (let i = 0; i < chunks.length; i++) {
      const [doc] = await db.insert(brainDocumentsTable).values({
        title: chunks.length > 1 ? `${title} (${i + 1}/${chunks.length})` : title,
        type: "pdf",
        content: chunks[i],
        businessTag: businessTag || "general",
        metadata: { chunkIndex: i, totalChunks: chunks.length, originalFilename: req.file.originalname },
      }).returning();
      insertedDocs.push(doc);
    }

    res.status(201).json(insertedDocs);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to upload document" });
  }
});

router.delete("/documents/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [deleted] = await db.delete(brainDocumentsTable).where(eq(brainDocumentsTable.id, id)).returning();
    if (!deleted) return res.status(404).json({ error: "Document not found" });
    res.status(204).end();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to delete document" });
  }
});

export async function getBrainContext(query: string): Promise<string> {
  try {
    const chunks = await db
      .select()
      .from(brainDocumentsTable)
      .where(ilike(brainDocumentsTable.content, `%${query.slice(0, 100)}%`))
      .limit(3);

    if (chunks.length === 0) return "";

    const contextText = chunks.map((c) => c.content).join("\n\n---\n\n");
    return `RELEVANT CONTEXT FROM YOUR KNOWLEDGE BASE:\n${contextText}`;
  } catch {
    return "";
  }
}

export default router;
