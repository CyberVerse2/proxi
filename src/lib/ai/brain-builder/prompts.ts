export const CLUSTER_PROMPT = `You are grouping a person's posts by topic. Read all the posts and assign each post index to one of 6–12 topic clusters.

<posts>
{POSTS}
</posts>

Rules:
- Use clear, descriptive topic names (e.g. "AI & Technology", "Crypto Markets", "Personal Life").
- Aim for 6–12 clusters. Fewer is fine if the person has a narrow focus. Merge tiny clusters (<3 posts) into "General / Miscellaneous" rather than forcing a category.
- Every post index from 0 to the last post MUST appear in exactly one cluster. Do NOT skip any index.
- After building your clusters, mentally verify no index is missing or duplicated.`;

export const TOPIC_SUMMARY_PROMPT = `You are building a detailed summary of a person's beliefs, opinions, knowledge, and reasoning on a specific topic. Only extract what is clearly expressed or strongly implied in the posts — do NOT fill in gaps with assumptions.

Topic: {TOPIC}

Their posts on this topic:
<posts>
{POSTS}
</posts>

Rules:
- Beliefs must be specific. NOT "they care about technology." YES "they believe open-source AI will outperform closed models within 5 years."
- FAQ answers should sound like the person wrote them, not like an encyclopedia.
- reasoningPatterns: look for posts where they're arguing, explaining, or defending a position. How do they build their case? What evidence do they reach for? Only include patterns clearly visible in the posts.
- emotionalReactions: look for posts with strong emotional valence — excitement, frustration, sarcasm, dismissiveness. What triggers each reaction?
- Include 2-5 items per field. Quality over quantity.`;

export const SYNTHESIS_PROMPT = `You are synthesizing a comprehensive "Core Brain" for an AI clone. This brain will be used to make an AI respond as this specific person. It must be vivid, specific, and deeply faithful to the source material.

The clone must not only know WHAT this person thinks, but HOW they think, WHAT triggers them emotionally, WHERE their blind spots are, and WHERE they contradict themselves. A clone that's too internally consistent feels robotic — real people are messy.

<voice_profile>
{VOICE}
</voice_profile>

<topic_summaries>
{SUMMARIES}
</topic_summaries>

<reasoning_analysis>
{REASONING}
</reasoning_analysis>

Hard constraints (MUST follow):
- opinions MUST include at least one entry per topic summary provided above. Do not skip smaller topics.
- beliefs MUST be specific and testable. BAD: "values hard work." GOOD: "believes that shipping fast and iterating beats planning for months."
- background MUST be inferred from evidence in the posts, not invented.
- reasoningStyle MUST describe process, not conclusions. Two people can hold the same belief but arrive there differently.
- contradictions MUST be genuine tensions found in the source material, not invented for color.

Soft constraints (SHOULD follow):
- personality should read like a character bible for an actor — vivid, specific, full of "this person would" and "this person never." BAD: "They are passionate about technology." GOOD: "They treat every new AI model release like a sporting event, live-tweeting their benchmarks with the energy of a commentator calling a championship game."
- faq should have 8-15 entries spanning different topics. Answers should sound like the person wrote them — match their tone, length, and vocabulary from the voice profile.
- emotionalTriggers should have 3-6 entries. Each should feel like a cheat sheet for an actor: "when X happens, they do Y."
- blindSpots and contradictions are features, not bugs. Include 2-5 each if the evidence supports it. If not, include fewer — don't fabricate.
- vocabularyFingerprint should be 5-15 items. Only include language distinctive enough to identify this person in a blind lineup.

After generating the output, mentally verify that every topic from the summaries is represented in the opinions field.`;

export const REASONING_PROMPT = `You are analyzing how a specific person THINKS — not what they think, but HOW they think. Focus on their reasoning patterns, emotional wiring, contradictions, and blind spots.

<posts>
{POSTS}
</posts>

These posts were selected because they contain argumentation, explanation, debate, or strong emotional reactions. Analyze them to extract the person's cognitive and emotional fingerprint.

Rules:
- Everything must be grounded in evidence from the posts. Quote or paraphrase specific examples where possible.
- reasoningStyle should capture their PROCESS, not their conclusions. Two people can believe the same thing but arrive there completely differently.
- contradictions are NOT a flaw to fix — they make the clone feel human. Include them without judgment.
- blindSpots: look for conspicuous absences. If someone tweets about tech daily but never mentions ethics, that's a blind spot.
- vocabularyFingerprint: be selective. Only include phrases that are genuinely distinctive. "Let's go" is not distinctive. "The alpha is in the delta" is.
- If a field has no clear evidence, use an empty array or a short honest statement like "not enough evidence in posts to determine."`;
