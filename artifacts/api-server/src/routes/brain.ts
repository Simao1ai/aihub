import { Router, type IRouter } from "express";
import { db, brainDocumentsTable } from "@workspace/db";
import { and, eq, ilike, or, inArray, isNotNull, sql } from "drizzle-orm";
import multer from "multer";
import { logger } from "../lib/logger";
import { openai } from "@workspace/integrations-openai-ai-server";

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

// ── Generate OpenAI embedding for a text string ───────────────────────────────
async function generateEmbedding(text: string): Promise<number[] | null> {
  try {
    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: text.slice(0, 8000),
    });
    return response.data[0].embedding;
  } catch (err) {
    logger.warn({ err }, "Embedding generation failed — will skip vector indexing");
    return null;
  }
}

// ── Generate embeddings for inserted docs in background (fire-and-forget) ────
async function backfillEmbeddings(docIds: number[]): Promise<void> {
  for (const id of docIds) {
    try {
      const [doc] = await db
        .select({ id: brainDocumentsTable.id, content: brainDocumentsTable.content, title: brainDocumentsTable.title })
        .from(brainDocumentsTable)
        .where(eq(brainDocumentsTable.id, id));
      if (!doc) continue;
      const embedding = await generateEmbedding(`${doc.title}\n\n${doc.content}`);
      if (embedding) {
        await db
          .update(brainDocumentsTable)
          .set({ embedding })
          .where(eq(brainDocumentsTable.id, id));
      }
    } catch (err) {
      logger.warn({ err, docId: id }, "Failed to backfill embedding for doc");
    }
  }
}

router.get("/documents", async (req, res) => {
  try {
    const ws = (req as any).sessionWorkspace as string;
    const docs = await db.select().from(brainDocumentsTable)
      .where(eq(brainDocumentsTable.businessTag, ws))
      .orderBy(brainDocumentsTable.createdAt);
    res.json(docs);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch documents" });
  }
});

router.post("/documents", async (req, res) => {
  try {
    const ws = (req as any).sessionWorkspace as string;
    const { title, type, content, url } = req.body;
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
        businessTag: ws,
        metadata: { chunkIndex: i, totalChunks: chunks.length, sourceUrl: url || null },
      }).returning();
      insertedDocs.push(doc);
    }

    res.status(201).json(insertedDocs);

    // Generate embeddings in background — don't block the response
    backfillEmbeddings(insertedDocs.map(d => d.id)).catch(err =>
      logger.warn({ err }, "Background embedding generation failed")
    );
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to create document" });
  }
});

router.post("/documents/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    const ws = (req as any).sessionWorkspace as string;
    const { title } = req.body;

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
        businessTag: ws,
        metadata: { chunkIndex: i, totalChunks: chunks.length, originalFilename: req.file.originalname },
      }).returning();
      insertedDocs.push(doc);
    }

    res.status(201).json(insertedDocs);

    // Generate embeddings in background — don't block the response
    backfillEmbeddings(insertedDocs.map(d => d.id)).catch(err =>
      logger.warn({ err }, "Background embedding generation for PDF failed")
    );
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to upload document" });
  }
});

router.patch("/documents/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { title, content, category } = req.body as Record<string, string>;
    const updates: Record<string, string> = {};
    if (title !== undefined) updates.title = title;
    if (content !== undefined) updates.content = content;
    if (category !== undefined) updates.category = category;
    if (Object.keys(updates).length === 0) return res.status(400).json({ error: "Nothing to update" });
    const [updated] = await db.update(brainDocumentsTable).set(updates).where(eq(brainDocumentsTable.id, id)).returning();
    if (!updated) return res.status(404).json({ error: "Document not found" });

    // Re-generate embedding if content changed
    if (content !== undefined) {
      backfillEmbeddings([id]).catch(() => {});
    }

    res.json(updated);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to update document" });
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

// ── getBrainContext — semantic (cosine similarity) with keyword fallback ──────
export async function getBrainContext(query: string, businessTag = "general"): Promise<string> {
  try {
    const tags = businessTag === "general" ? ["general"] : [businessTag, "general"];

    // ── Attempt vector similarity search first ────────────────────────────────
    try {
      const queryEmbedding = await generateEmbedding(query);
      if (queryEmbedding) {
        const embeddingLiteral = `[${queryEmbedding.join(",")}]`;
        const vectorResults = await db
          .select()
          .from(brainDocumentsTable)
          .where(
            and(
              inArray(brainDocumentsTable.businessTag, tags),
              isNotNull(brainDocumentsTable.embedding)
            )
          )
          .orderBy(sql`embedding <=> ${embeddingLiteral}::vector`)
          .limit(4);

        if (vectorResults.length > 0) {
          const contextText = vectorResults
            .map(c => `[${c.title}]\n${c.content}`)
            .join("\n\n---\n\n");
          return `RELEVANT CONTEXT FROM YOUR KNOWLEDGE BASE:\n${contextText}`;
        }
      }
    } catch (vecErr) {
      logger.warn({ vecErr }, "Vector search failed — falling back to keyword search");
    }

    // ── Keyword fallback ──────────────────────────────────────────────────────
    const STOPWORDS = new Set(["the","and","for","are","was","you","your","that","this","with","have","from","they","will","what","when","how","can","need","want","about","just","also"]);
    const keywords = [...new Set(
      query.toLowerCase()
        .replace(/[^\w\s]/g, " ")
        .split(/\s+/)
        .filter(w => w.length >= 3 && !STOPWORDS.has(w))
    )].slice(0, 8);

    let chunks: typeof brainDocumentsTable.$inferSelect[] = [];

    if (keywords.length > 0) {
      const keywordConditions = keywords.flatMap(kw => [
        ilike(brainDocumentsTable.content, `%${kw}%`),
        ilike(brainDocumentsTable.title, `%${kw}%`),
      ]);
      chunks = await db
        .select()
        .from(brainDocumentsTable)
        .where(or(...keywordConditions))
        .limit(20);

      chunks = chunks.filter(c => tags.includes(c.businessTag));

      const scored = chunks.map(c => {
        const text = (c.title + " " + c.content).toLowerCase();
        const titleText = c.title.toLowerCase();
        const score = keywords.reduce((s, kw) => {
          if (titleText.includes(kw)) return s + 2;
          if (text.includes(kw)) return s + 1;
          return s;
        }, 0);
        return { chunk: c, score };
      });
      scored.sort((a, b) => b.score - a.score);
      chunks = scored.slice(0, 4).map(s => s.chunk);
    }

    if (chunks.length === 0) {
      chunks = await db
        .select()
        .from(brainDocumentsTable)
        .where(inArray(brainDocumentsTable.businessTag, tags))
        .limit(3);
    }

    if (chunks.length === 0) return "";

    const contextText = chunks
      .map(c => `[${c.title}]\n${c.content}`)
      .join("\n\n---\n\n");
    return `RELEVANT CONTEXT FROM YOUR KNOWLEDGE BASE:\n${contextText}`;
  } catch {
    return "";
  }
}

export default router;
