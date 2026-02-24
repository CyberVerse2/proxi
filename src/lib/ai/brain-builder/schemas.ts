import { z } from 'zod';

/**
 * A z.array(z.string()) that tolerates the model returning a single string
 * instead of an array. Coerces strings into a one-element array.
 */
function flexibleStringArray(description: string) {
  return z.preprocess(
    (val) => {
      if (Array.isArray(val)) return val;
      if (typeof val === 'string') {
        // Model returned a single string — split on newlines or commas if it looks like a list
        const lines = val.split(/\n|,\s*/).map((s) => s.trim()).filter(Boolean);
        return lines.length > 1 ? lines : [val];
      }
      return val;
    },
    z.array(z.string()).default([])
  ).describe(description);
}

/**
 * A z.record(string, string) that tolerates the model returning an array
 * instead of an object. Arrays get coerced into records so downstream
 * code always sees Record<string, string>. No schema weakening.
 */
function flexibleRecord(description: string) {
  return z.preprocess(
    (val) => {
      // Already a plain object — pass through
      if (val && typeof val === 'object' && !Array.isArray(val)) return val;

      // Model returned an array — convert to Record<string, string>
      if (Array.isArray(val)) {
        const record: Record<string, string> = {};
        for (const item of val) {
          if (typeof item === 'string') {
            // "Topic: their stance" → split on first colon/dash
            const sep = item.indexOf(': ') !== -1 ? ': ' : item.indexOf(' - ') !== -1 ? ' - ' : null;
            if (sep) {
              const [key, ...rest] = item.split(sep);
              record[key.trim()] = rest.join(sep).trim();
            } else {
              record[`item_${Object.keys(record).length + 1}`] = item;
            }
          } else if (typeof item === 'object' && item !== null) {
            // [{topic: "X", stance: "Y"}] or similar key-value objects
            const keys = Object.keys(item);
            if (keys.length >= 2) {
              record[String(item[keys[0]])] = String(item[keys[1]]);
            }
          }
        }
        return record;
      }

      return val; // let Zod reject it if truly invalid
    },
    z.record(z.string(), z.string()).default({})
  ).describe(description);
}

export const topicClusterSchema = z.object({
  topic: z
    .string()
    .describe("Clear, descriptive topic name (e.g. 'AI & Technology', 'Crypto Markets')"),
  tweetIndices: z.array(z.number()).describe('Array of post indices that belong to this topic')
});

export const topicSummarySchema = z.object({
  beliefs: flexibleStringArray('3-8 core beliefs on this topic, each specific and testable'),
  opinions: flexibleRecord('Subtopic -> their specific stance, using their own words'),
  knowledge: flexibleStringArray('Key facts, insights, or expertise they demonstrate'),
  faq: z.array(z.object({
    question: z.string().describe('Likely question someone would ask about this topic'),
    answer: z.string().describe("How this person would answer IN THEIR VOICE — not generic")
  })).default([])
    .describe("2-5 likely questions and answers in this person's voice"),
  reasoningPatterns: flexibleStringArray('How they argue/persuade/explain on this topic'),
  emotionalReactions: flexibleRecord('Trigger -> how they react emotionally')
});

export const reasoningAnalysisSchema = z.object({
  reasoningStyle: z.string().default('')
    .describe('2-3 paragraph description of HOW this person reasons — first principles vs analogy, data vs intuition, hedging vs committing, etc.'),
  emotionalTriggers: flexibleRecord('Trigger category -> what provokes this reaction and how it shows in their writing'),
  blindSpots: flexibleStringArray('Topics they avoid, biases they display without awareness'),
  contradictions: flexibleStringArray('Tensions between their stated beliefs or behaviors'),
  vocabularyFingerprint: flexibleStringArray('Distinctive phrases, recurring metaphors, verbal tics unique to this person')
});

export const coreBrainSchema = z.object({
  beliefs: flexibleStringArray('8-15 core beliefs and values, synthesized across all topics'),
  opinions: flexibleRecord('topic/subtopic -> their specific stance'),
  topicMap: z.record(z.string(), z.array(z.string())).default({})
    .describe('category -> subtopics they frequently discuss'),
  faq: z.array(z.object({
    question: z.string(),
    answer: z.string().describe("How they'd answer in their exact voice")
  })).default([])
    .describe('8-15 FAQ entries spanning different topics'),
  personality: z.string().default('')
    .describe('2-3 paragraph personality summary — vivid, specific, like a character bible'),
  background: z.string().default('')
    .describe('Inferred background, expertise, and bio — grounded in evidence'),
  reasoningStyle: z.string().default('')
    .describe('2-3 paragraphs on HOW they think — argumentative approach, handling disagreement, weighing evidence'),
  emotionalTriggers: flexibleRecord('trigger_category -> what provokes this reaction and how it shows up'),
  blindSpots: flexibleStringArray('Topics they avoid, perspectives they never engage with, biases'),
  contradictions: flexibleStringArray('Specific tensions between stated beliefs or behaviors — human complexity'),
  vocabularyFingerprint: flexibleStringArray('5-15 distinctive phrases, metaphors, coined terms, verbal tics')
});

export type CoreBrain = z.infer<typeof coreBrainSchema>;
export type TopicSummary = z.infer<typeof topicSummarySchema>;
export type ReasoningAnalysis = z.infer<typeof reasoningAnalysisSchema>;
