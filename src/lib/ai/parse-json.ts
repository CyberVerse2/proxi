/**
 * Robust JSON extraction from LLM outputs.
 *
 * LLMs sometimes wrap JSON in markdown fences, add preamble text, or include
 * trailing commentary. This utility handles all common failure modes so that
 * callers don't need to worry about fragile parsing.
 *
 * Based on: prompt-engineering-patterns skill — Error Recovery (Pattern 5)
 */

/**
 * Attempt to extract valid JSON from an LLM response string.
 * Tries multiple strategies in order of likelihood:
 *  1. Direct parse (response is already clean JSON)
 *  2. Strip markdown code fences
 *  3. Find the first JSON object or array in the text
 *  4. Throw with a descriptive error
 */
export function extractJSON<T>(raw: string): T {
  const trimmed = raw.trim();

  // Strategy 1: Direct parse
  try {
    return JSON.parse(trimmed) as T;
  } catch {
    // Continue to next strategy
  }

  // Strategy 2: Strip markdown code fences
  const fenceStripped = trimmed
    .replace(/^```(?:json)?\s*\n?/i, "")
    .replace(/\n?```\s*$/i, "")
    .trim();

  try {
    return JSON.parse(fenceStripped) as T;
  } catch {
    // Continue to next strategy
  }

  // Strategy 3: Find first JSON object {...} or array [...] in the text
  const jsonMatch = trimmed.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[1]) as T;
    } catch {
      // Continue to error
    }
  }

  throw new Error(
    `Failed to extract valid JSON from LLM response. ` +
    `Response starts with: "${trimmed.slice(0, 120)}..."`,
  );
}
