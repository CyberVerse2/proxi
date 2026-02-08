import { db } from "@/lib/db";
import { contentChunks } from "@/lib/db/schema";
import { eq, sql, desc } from "drizzle-orm";
import { embedText } from "./embeddings";

interface RagResult {
  text: string;
  score: number;
  contentType: string;
  priority: number;
}

export async function searchSimilarContent(
  proxyId: string,
  query: string,
  limit = 8,
  minScore = 0.3,
): Promise<RagResult[]> {
  const queryEmbedding = await embedText(query);
  const embeddingStr = `[${queryEmbedding.join(",")}]`;

  const results = await db.execute(sql`
    SELECT
      original_text,
      content_type,
      priority,
      1 - (embedding <=> ${embeddingStr}::vector) AS similarity
    FROM content_chunks
    WHERE proxy_id = ${proxyId}
      AND embedding IS NOT NULL
      AND 1 - (embedding <=> ${embeddingStr}::vector) > ${minScore}
    ORDER BY similarity DESC
    LIMIT ${limit}
  `);

  return (results as unknown as Array<{ original_text: string; content_type: string; priority: number; similarity: number }>).map((r) => ({
    text: r.original_text,
    score: r.similarity,
    contentType: r.content_type,
    priority: r.priority,
  }));
}

export async function getHighPriorityContent(proxyId: string, limit = 20): Promise<string[]> {
  const rows = await db
    .select({ text: contentChunks.originalText })
    .from(contentChunks)
    .where(eq(contentChunks.proxyId, proxyId))
    .orderBy(desc(contentChunks.priority))
    .limit(limit);

  return rows.map((r) => r.text);
}

export function isLowConfidence(results: RagResult[], threshold = 0.4): boolean {
  if (results.length === 0) return true;
  const avgScore = results.reduce((sum, r) => sum + r.score, 0) / results.length;
  return avgScore < threshold;
}
