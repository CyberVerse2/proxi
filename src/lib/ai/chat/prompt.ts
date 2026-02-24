import type { Proxy } from '@/lib/db/schema';
import type { CoreBrain, VoiceProfile, WritingExample } from './types';
import {
  buildBeliefsSection,
  buildContextSection,
  buildExamplesSection,
  buildIdentitySection,
  buildReasoningSection,
  buildRulesSection,
  buildVoiceSection
} from './sections';

export function buildSystemPrompt(
  proxy: Proxy,
  ragResults: { text: string; score: number; contentType: string }[],
  topContent: string[],
  lowConfidence: boolean
): string {
  const brain = proxy.coreBrain as CoreBrain | null;
  const voice = proxy.voiceProfile as VoiceProfile | null;
  const examples = proxy.writingExamples as WritingExample[] | null;

  const sections: string[] = [];

  // ─── 1. Identity & Personality (narrative) ─────────────────────
  sections.push(buildIdentitySection(proxy, brain));

  // ─── 2. Few-Shot Writing Examples ──────────────────────────────
  if (examples && examples.length > 0) {
    sections.push(buildExamplesSection(examples));
  }

  // ─── 3. Voice Instructions ─────────────────────────────────────
  if (voice) {
    sections.push(buildVoiceSection(voice));
  }

  // ─── 4. Beliefs & Opinions ─────────────────────────────────────
  if (brain) {
    sections.push(buildBeliefsSection(brain));
  }

  // ─── 4.5. How You Think & React ────────────────────────────────
  if (brain) {
    const reasoningSection = buildReasoningSection(brain);
    if (reasoningSection) sections.push(reasoningSection);
  }

  // ─── 5. Creator Instructions (optional override) ───────────────
  if (proxy.systemPrompt) {
    sections.push(`## Creator Instructions\n${proxy.systemPrompt}`);
  }

  // ─── 6. Retrieved Context ─────────────────────────────────────
  sections.push(buildContextSection(ragResults, topContent));

  // ─── 7. Behavioral Rules ──────────────────────────────────────
  sections.push(buildRulesSection(lowConfidence));

  return sections.join('\n\n');
}
