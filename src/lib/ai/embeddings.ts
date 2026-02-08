import { openai } from "@ai-sdk/openai";
import { embedMany, embed } from "ai";
import { db } from "@/lib/db";
import { contentChunks } from "@/lib/db/schema";

const embeddingModel = openai.embedding("text-embedding-3-small");

export async function embedText(text: string): Promise<number[]> {
  const { embedding } = await embed({ model: embeddingModel, value: text });
  return embedding;
}

export async function embedBatch(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  const batchSize = 100;
  const allEmbeddings: number[][] = [];
  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    const { embeddings } = await embedMany({ model: embeddingModel, values: batch });
    allEmbeddings.push(...embeddings);
  }
  return allEmbeddings;
}

/* ------------------------------------------------------------------ */
/*  Enriched embedding: prepend metadata context before embedding      */
/* ------------------------------------------------------------------ */

/**
 * Derive an engagement tier from public metrics.
 */
function engagementTier(qualityScore?: number): string {
  if (!qualityScore) return "unknown";
  if (qualityScore >= 50) return "high";
  if (qualityScore >= 25) return "medium";
  return "low";
}

/**
 * Build an enriched text for embedding by prepending metadata.
 * This makes vector search more targeted — a question about "AI opinions"
 * will match posts tagged with the AI topic even if the exact words differ.
 */
function enrichForEmbedding(chunk: {
  text: string;
  contentType: string;
  topic?: string;
  qualityScore?: number;
}): string {
  const parts: string[] = [];

  if (chunk.topic) parts.push(`[Topic: ${chunk.topic}]`);

  const typeLabel =
    chunk.contentType === "thread"
      ? "Thread"
      : chunk.contentType === "reply"
        ? "Reply"
        : "Original Post";
  parts.push(`[Type: ${typeLabel}]`);

  parts.push(`[Engagement: ${engagementTier(chunk.qualityScore)}]`);

  parts.push(chunk.text);

  return parts.join(" ");
}

export interface ChunkInput {
  text: string;
  contentType: "tweet" | "reply" | "thread" | "private_note";
  tweetId?: string;
  priority?: number;
  qualityScore?: number;
  topic?: string;
}

export async function embedAndStoreChunks(
  proxyId: string,
  chunks: ChunkInput[],
) {
  if (chunks.length === 0) return;

  // Enrich text with metadata before embedding
  const enrichedTexts = chunks.map((c) =>
    enrichForEmbedding({
      text: c.text,
      contentType: c.contentType,
      topic: c.topic,
      qualityScore: c.qualityScore,
    }),
  );

  const embeddings = await embedBatch(enrichedTexts);

  const rows = chunks.map((chunk, i) => ({
    proxyId,
    contentType: chunk.contentType,
    originalText: chunk.text,
    processedText: enrichedTexts[i],
    tweetId: chunk.tweetId,
    priority: chunk.priority ?? 0,
    qualityScore: chunk.qualityScore ?? 0,
    embedding: embeddings[i],
  }));

  // Insert in batches
  const insertBatchSize = 50;
  for (let i = 0; i < rows.length; i += insertBatchSize) {
    await db.insert(contentChunks).values(rows.slice(i, i + insertBatchSize));
  }

  return rows.length;
}
