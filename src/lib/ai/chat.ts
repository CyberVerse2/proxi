/**
 * Chat context builder.
 *
 * Constructs a rich system prompt using:
 *   1.   Identity & personality (narrative, not JSON)
 *   2.   Few-shot writing examples (P0 — "show, don't tell")
 *   3.   Voice profile as behavioral instructions
 *   4.   Beliefs & opinions in natural language
 *   4.5  How you think & react (reasoning style, emotional triggers, contradictions, blind spots)
 *   5.   Retrieved context (RAG + high-priority)
 *   6.   Strict behavioral rules
 */

import { searchSimilarContent, getHighPriorityContent, isLowConfidence } from './rag';
import type { Proxy } from '@/lib/db/schema';
import type { ChatContext } from './chat/types';
import { buildSystemPrompt } from './chat/prompt';

export async function getChatContext(
  proxy: Proxy,
  userMessage: string
): Promise<ChatContext> {
  // Retrieve relevant content via RAG
  const ragResults = await searchSimilarContent(proxy.id, userMessage, 8);
  const shouldFlag = isLowConfidence(ragResults);

  // Get high-priority content for context
  const topContent = await getHighPriorityContent(proxy.id, 10);

  const systemPrompt = buildSystemPrompt(proxy, ragResults, topContent, shouldFlag);

  return { systemPrompt, shouldFlag };
}
