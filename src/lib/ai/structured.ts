/**
 * Robust structured output helper for AI SDK v6.
 *
 * `Output.object()` can fail when the model's response doesn't perfectly
 * match the schema (Anthropic uses a tool-call approach under the hood,
 * which is inherently more fragile than native JSON mode).
 *
 * This helper:
 *   1. Tries `Output.object()` first (ideal path).
 *   2. On failure, retries with plain `generateText` + explicit "output only JSON" instruction.
 *   3. Extracts JSON from the text, sanitizes common LLM JSON mistakes, and validates.
 *
 * The schema stays strict — we never weaken validation, we just give the
 * model a second chance to produce valid JSON.
 */

import { generateText, Output } from 'ai';
import { z } from 'zod';

/**
 * Format Zod errors into a human-readable summary showing exactly
 * which fields failed and why.
 */
function formatZodErrors(error: z.ZodError): string {
  return error.issues
    .map((issue) => {
      const path = issue.path.length > 0 ? issue.path.join('.') : '(root)';
      return `  - ${path}: ${issue.message} (${issue.code})`;
    })
    .join('\n');
}

/**
 * Attempt to parse JSON that may contain common LLM mistakes:
 *   - Trailing commas before } or ]
 *   - Single-line // comments
 *   - Unescaped control characters in strings
 */
function lenientJsonParse(raw: string): unknown {
  // First try strict parse
  try {
    return JSON.parse(raw);
  } catch {
    // no-op, try sanitized version
  }

  let sanitized = raw;

  // Remove single-line comments (// ...)
  sanitized = sanitized.replace(/\/\/[^\n]*/g, '');

  // Remove trailing commas before ] or }
  sanitized = sanitized.replace(/,\s*([}\]])/g, '$1');

  // Remove control characters that break JSON (except \n \r \t which are fine escaped)
  sanitized = sanitized.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, '');

  try {
    return JSON.parse(sanitized);
  } catch {
    // no-op
  }

  // Last resort: try to find balanced braces (the model may have added text after the JSON)
  const start = sanitized.indexOf('{');
  if (start === -1) throw new SyntaxError('No JSON object found in response');

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < sanitized.length; i++) {
    const ch = sanitized[i];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (ch === '\\') {
      escaped = true;
      continue;
    }

    if (ch === '"') {
      inString = !inString;
      continue;
    }

    if (inString) continue;

    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) {
        let slice = sanitized.slice(start, i + 1);
        // Clean trailing commas again on the slice
        slice = slice.replace(/,\s*([}\]])/g, '$1');
        return JSON.parse(slice);
      }
    }
  }

  throw new SyntaxError('Could not extract valid JSON. Text starts with: ' + raw.slice(0, 200));
}

export async function generateStructured<T extends z.ZodType>(opts: {
  model: Parameters<typeof generateText>[0]['model'];
  schema: T;
  maxOutputTokens: number;
  prompt: string;
}): Promise<z.infer<T>> {
  // Attempt 1: structured output via Output.object()
  try {
    const { output } = await generateText({
      model: opts.model,
      output: Output.object({ schema: opts.schema }),
      maxOutputTokens: opts.maxOutputTokens,
      prompt: opts.prompt
    });
    if (output) return output as z.infer<T>;
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.warn(`[structured] Output.object() failed: ${errMsg.slice(0, 200)}`);

    // If the error contains the raw response text, try to parse it directly
    if (err && typeof err === 'object' && 'text' in err) {
      const rawText = String((err as { text: unknown }).text);
      const jsonMatch = rawText.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
      if (jsonMatch) {
        try {
          const parsed = lenientJsonParse(jsonMatch[1]);
          const result = opts.schema.safeParse(parsed);
          if (result.success) {
            console.log('[structured] Raw text passes schema after sanitization — returning it.');
            return result.data;
          }
          console.warn(
            `[structured] Schema validation failures on raw response:\n${formatZodErrors(result.error)}`
          );
        } catch {
          // JSON parse failed even after sanitization, continue to attempt 2
        }
      }
    }
  }

  // Attempt 2: plain text → extract JSON → sanitize → validate with schema
  const { text } = await generateText({
    model: opts.model,
    maxOutputTokens: opts.maxOutputTokens,
    prompt:
      opts.prompt +
      '\n\nIMPORTANT: Output ONLY valid JSON. No preamble, no explanation, no markdown fences. Start with { or [.'
  });

  // Try to extract the outermost JSON object or array
  const jsonMatch = text.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
  if (!jsonMatch) {
    throw new Error('LLM returned no parseable JSON. Response starts with: ' + text.slice(0, 200));
  }

  const parsed = lenientJsonParse(jsonMatch[1]);
  const result = opts.schema.safeParse(parsed);

  if (!result.success) {
    console.error(
      `[structured] Fallback also failed schema validation:\n${formatZodErrors(result.error)}`
    );

    if (typeof parsed === 'object' && parsed !== null) {
      console.error(`[structured] Keys returned by model: ${Object.keys(parsed).join(', ')}`);
    }

    throw new Error(
      `Structured output failed after both attempts. Field errors:\n${formatZodErrors(result.error)}`
    );
  }

  return result.data;
}
