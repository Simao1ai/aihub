---
name: pgvector + Drizzle ORM setup
description: How to add pgvector to this project's PostgreSQL + Drizzle schema and query with cosine similarity
---

## Pattern for adding vector column in Drizzle

Use `customType` from `drizzle-orm/pg-core` — no native pgvector support in Drizzle:

```typescript
import { customType } from "drizzle-orm/pg-core";

const vector = customType<{
  data: number[];
  config: { dimensions: number };
  configRequired: true;
  driverData: string;
}>({
  dataType(config) { return `vector(${config.dimensions})`; },
  toDriver(value) { return `[${value.join(",")}]`; },
  fromDriver(value) { return (value as string).slice(1, -1).split(",").map(Number); },
});

// In table definition:
embedding: vector("embedding", { dimensions: 1536 }),
```

## Apply schema changes via raw SQL (not drizzle push)

`drizzle push` has interactive prompts for new columns that can't be automated:
```bash
psql "$DATABASE_URL" -c "CREATE EXTENSION IF NOT EXISTS vector;"
psql "$DATABASE_URL" -c "ALTER TABLE brain_documents ADD COLUMN IF NOT EXISTS embedding vector(1536);"
psql "$DATABASE_URL" -c "CREATE INDEX IF NOT EXISTS ... USING ivfflat (embedding vector_cosine_ops) WITH (lists = 50);"
```

## Cosine similarity query

Use `sql` tagged template in `.orderBy()` — the `<=>` operator is pgvector-specific:

```typescript
import { sql, and, inArray, isNotNull } from "drizzle-orm";

const results = await db
  .select()
  .from(table)
  .where(and(inArray(table.businessTag, tags), isNotNull(table.embedding)))
  .orderBy(sql`embedding <=> ${embeddingLiteral}::vector`)
  .limit(4);
```

`embeddingLiteral` = `[0.1,0.2,...,0.n]` string — Drizzle parameterizes it as `$1::vector`.

## Embeddings provider

OpenAI `text-embedding-3-small` (1536 dims) via `@workspace/integrations-openai-ai-server`:
```typescript
import { openai } from "@workspace/integrations-openai-ai-server";
const response = await openai.embeddings.create({ model: "text-embedding-3-small", input: text.slice(0, 8000) });
return response.data[0].embedding;
```

**Why:** Anthropic has no embeddings API; OpenAI integration is already wired up in this project.
**How to apply:** Any time you need vector search in this codebase, follow this exact pattern.
