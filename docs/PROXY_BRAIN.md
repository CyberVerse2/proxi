# How We Build the Brain of a Proxy

This document describes how we turn a person’s X/Twitter posts into the “brain” of their AI proxy: the data and prompts that make the clone sound like them and know what they think.

---

## Overview

The brain is built during **ingestion** (`runFullIngestion` in `src/lib/x/ingest.ts`). Raw tweets are turned into:

1. **Content selection** — Filter and score posts so we keep the best, topic-diverse set.
2. **Embeddings + RAG storage** — Chunks are embedded (OpenAI `text-embedding-3-small`, 1536-d) and stored for semantic search at chat time.
3. **Voice profile** — Three parallel LLM passes over the posts to extract *how* they write (tone, vocabulary, sentence patterns, tone map, catchphrases, etc.).
4. **Writing examples** — 12–15 verbatim posts chosen as few-shot examples for chat (“show, don’t tell”).
5. **Core brain** — Topic clustering → per-topic summaries (beliefs, opinions, FAQ, reasoning) + a separate reasoning-style analysis → one synthesized brain (personality, beliefs, opinions, reasoning style, emotional triggers, blind spots, contradictions, vocabulary fingerprint).
6. **Category** — Optional AI classification into a single explore category (founders, traders, etc.).

All LLM calls use **structured output** (Zod schemas via `generateStructured` in `src/lib/ai/structured.ts`) so we get valid JSON; the helper falls back to plain `generateText` + JSON extraction if the primary path fails.

At **chat time**, the brain is used by `getChatContext` in `src/lib/ai/chat.ts`: RAG retrieval + high-priority chunks are combined with the voice profile, writing examples, beliefs/opinions, and reasoning section into one large system prompt so the model responds as that person.

---

## 1. Content Selection (What Goes Into the Brain)

**Files:** `src/lib/x/filter.ts`, `src/lib/x/scorer.ts`, `src/lib/x/ingest.ts` (steps 4–6).

### 1.1 Thread reconstruction

Before filtering, we **reconstruct threads**: reply chains where the author replies to themselves are merged into single “synthetic” posts (`src/lib/x/threads.ts`). So a 10-tweet thread becomes one unit for scoring and embedding.

### 1.2 Trash filter

`filterTrash()` removes:

- Retweets (`RT @`)
- Very short posts (< 10 words)
- “gm” / “gn” / “good morning” / “good night” only
- Link-only (text after stripping URLs < 15 chars)
- Emoji-only (text after stripping emoji < 10 chars)
- Heavy hashtag spam (> 5 hashtags and hashtags/words > 0.5)

Everything else is kept for scoring.

### 1.3 Scoring

Each post is scored by `scoreTweet()`:

- **Length** (0–25): more words = more thoughtful (capped).
- **Content type**: thread +20, standalone tweet +10, reply +5.
- **Engagement** (0–30): likes, retweets, quotes, replies combined with log scaling.
- **Recency** (0–10): linear decay over 90 days.
- **Signals**: question (+3), “I think”/“IMO”/“hot take” (+5), “because”/“therefore” (+3).

A **topic** is assigned per post via simple keyword/regex patterns (e.g. “AI & Technology”, “Crypto & Web3”, “Business & Startups”). This is only for diversity in selection.

### 1.4 Topic-diverse selection

`selectTopPosts(filtered, 1000, 0.3)`:

- Score all posts, sort by score descending.
- Group by topic.
- **Cap per topic** at `maxTopicShare` of the limit (default 30% of 1000 = 300 per topic).
- Fill the 1000 slots: first pass respects the per-topic cap in global score order; second pass fills remaining with leftover posts.

So we get up to 1000 posts, with no single topic dominating. These are the posts used for embeddings, voice, examples, and brain.

---

## 2. Embeddings and RAG Storage

**Files:** `src/lib/ai/embeddings.ts`, `src/lib/db/schema.ts` (`content_chunks`).

### 2.1 Chunk shape

Each selected post becomes one “chunk” with:

- `text` — original post text.
- `contentType` — tweet | reply | thread.
- `tweetId`, `priority` (from scorer), `qualityScore`.

No splitting of long posts; one post = one chunk.

### 2.2 Enrichment before embedding

We don’t embed raw text only. We **enrich** it so that vector search is more topic- and type-aware:

- `[Topic: …]` (if we had a topic from scorer).
- `[Type: Original Post | Reply | Thread]`.
- `[Engagement: high | medium | low]` from `qualityScore`.
- Then the actual text.

So the stored embedding is over this enriched string; the DB also stores `originalText` and `processedText` (enriched). Chat and RAG use `originalText` when injecting into the prompt.

### 2.3 Embedding model and storage

- **Model:** OpenAI `text-embedding-3-small` (1536 dimensions).
- **Batching:** `embedMany` in batches of 100.
- **Storage:** Table `content_chunks`: `proxy_id`, `content_type`, `original_text`, `processed_text`, `tweet_id`, `priority`, `quality_score`, `embedding` (pgvector), `metadata`, `created_at`.

At chat time we embed the user message and run a vector similarity search (cosine) on `content_chunks` for that proxy, then add the top chunks to the system prompt as “Reference Material”.

---

## 3. Voice Profile (How They Write)

**File:** `src/lib/ai/voice-analysis.ts`.

**Input:** Up to 300 posts, concatenated with `\n---\n`.

**Model:** Claude Sonnet 4 (`claude-sonnet-4-20250514`). Three **parallel** passes, each with a Zod schema; results are merged into one `VoiceProfile`.

### Pass 1 — Style

- **Prompt:** “Computational linguist: extract ONLY stylistic and structural patterns. Ignore topics. Every pattern must be backed by multiple examples; use ‘not observed’ if no signal.”
- **Schema:**  
  `tone`, `vocabulary` (words/phrases used 3+ times), `sentencePatterns`, `punctuationHabits`, `capitalizationStyle`, `emojiUsage`.

### Pass 2 — Tone map

- **Prompt:** “Map how their voice SHIFTS by context. For each context describe changes in tone, word choice, structure, with examples. If no examples, say ‘not observed — insufficient data’.”
- **Schema:**  
  `emotionalRange`, `humorStyle`, `toneMap`: for each of `humor`, `serious`, `excited`, `frustrated`, `technical`, `casual` a short description of how they write in that mode.

### Pass 3 — Signature

- **Prompt:** “Fingerprint: recurring, distinctive patterns that appear 2–3+ times. Catchphrases = multi-word phrases. Empty array if no examples.”
- **Schema:**  
  `catchphrases`, `openers`, `closers`, `rhetoricalDevices`, `uniqueTraits`, `topicPreferences` (5–10 main topics), `communicationStyle`.

The combined **VoiceProfile** is stored on the proxy as `voice_profile` (JSONB) and is used in chat as a “Voice & Style Rules” section: tone, communication style, humor, emotional range, sentence patterns, punctuation, capitalization, emoji, catchphrases, openers/closers, rhetorical devices, quirks, tone map, and a capped vocabulary list.

---

## 4. Writing Examples (Few-Shot)

**File:** `src/lib/ai/example-selector.ts`.

**Input:** Up to 200 posts.

**Purpose:** Give the chat model **verbatim** samples of how this person writes so it can mimic tone, length, and style instead of only following a text description.

**Prompt:** Select 12–15 examples that cover different categories: being funny, serious, giving advice, hot take, storytelling, technical, celebrating, frustrated, casual, motivational. Rules: **verbatim copy-paste only** (no paraphrasing or cleaning), prefer distinctive posts, maximize diversity, skip categories with no good example.

**Schema:** `examples: array of { category, text }`.

**Storage:** `proxy.writing_examples` (JSONB). At chat time we render these in a “How This Person Actually Writes” section (capped at 12, long text truncated to 500 chars) and instruct the model to match that vibe and length.

---

## 5. Core Brain (What They Think and How They Think)

**File:** `src/lib/ai/brain-builder.ts`.

**Input:** Up to 300 posts + the **voice profile** (for synthesis). All steps use Claude Sonnet 4 and Zod schemas via `generateStructured`.

The pipeline has three phases: **cluster by topic**, **per-topic summaries + reasoning analysis** (in parallel), then **synthesize** one CoreBrain.

### 5.1 Phase 1 — Topic clustering

- **Input:** Posts numbered as `[0]`, `[1]`, …
- **Prompt:** Group posts into 6–12 topic clusters with clear names (e.g. “AI & Technology”, “Crypto Markets”). Every index must appear in exactly one cluster; merge tiny clusters into “General / Miscellaneous”.
- **Output:** `clusters: array of { topic, tweetIndices }`.

### 5.2 Phase 2 — Per-topic summary

For each cluster we call `buildTopicSummary(topic, postsForThatTopic)`:

- **Prompt:** Extract beliefs, opinions, knowledge, FAQ (Q&A in their voice), reasoning patterns, and emotional reactions **only from what is clearly in the posts**. Beliefs must be specific; FAQ answers must sound like them; reasoning and emotional reactions must be grounded in visible argumentation or emotion.
- **Schema:**  
  `beliefs`, `opinions` (subtopic → stance), `knowledge`, `faq` (question, answer), `reasoningPatterns`, `emotionalReactions` (trigger → reaction).

Topic summaries are built in batches of 4 in parallel to avoid overloading the API.

### 5.3 Phase 2.5 — Reasoning-style analysis

Runs **in parallel** with topic summaries. We don’t use all posts; we **select posts that look argumentative or emotional**:

- Score each post by length and presence of markers like “because”, “therefore”, “however”, “actually”, “disagree”, “wrong”, “hot take”, “thread”, “let me explain”, “?”, “!”, etc.
- Take top 80 by this score.

If there are fewer than 5 such posts, we return a minimal reasoning object (“not enough argumentative posts”). Otherwise:

- **Prompt:** Analyze HOW they think (process, not conclusions), emotional wiring, blind spots, contradictions, vocabulary fingerprint. Everything grounded in evidence; contradictions and blind spots are desirable for realism.
- **Schema:**  
  `reasoningStyle`, `emotionalTriggers`, `blindSpots`, `contradictions`, `vocabularyFingerprint`.

### 5.4 Phase 3 — Synthesize CoreBrain

**Input:** All topic summaries (as JSON), voice profile (JSON), reasoning analysis (JSON).

**Prompt:** Build one “Core Brain” for an AI clone: vivid, specific, faithful. Must capture not only WHAT they think but HOW they think, what triggers them, blind spots, and contradictions. Hard constraints: opinions must cover every topic from the summaries; beliefs must be specific and testable; background and reasoningStyle must be evidence-based; contradictions must be real. Soft: personality like a “character bible”; FAQ 8–15 entries in their voice; emotionalTriggers 3–6; include blind spots and contradictions when supported.

**Schema (CoreBrain):**

- `beliefs` — 8–15 core beliefs (synthesized across topics).
- `opinions` — topic/subtopic → stance (at least one per topic summary).
- `topicMap` — category → list of subtopics.
- `faq` — 8–15 question/answer pairs in their voice.
- `personality` — 2–3 paragraph character summary.
- `background` — inferred from posts.
- `reasoningStyle` — 2–3 paragraphs on how they argue and weigh evidence.
- `emotionalTriggers`, `blindSpots`, `contradictions`, `vocabularyFingerprint`.

A small verification step checks that each cluster topic appears in some form in `opinions` (fuzzy match); we only log a warning if something seems missing.

**Storage:** The result is saved as `proxy.core_brain` (JSONB). With voice and examples, this completes the “brain” used at chat time.

---

## 6. Category Classification (Explore)

**File:** `src/lib/ai/classifier.ts`.

**Input:** Bio, follower count, and topics (from brain’s topicMap + opinions keys).

**Prompt:** Classify into exactly one of: top-creators, founders, influencers, traders, investors, ui-ux-design, athletes, solana, musicians. Rules: 10k+ followers and no clearer fit → top-creators; otherwise pick the dominant category; “solana” only if identity is tied to Solana.

**Schema:** `category` (enum), `confidence`, `reasoning`.

**Storage:** We resolve the slug to a `category_id` in the DB and set `proxy.category_id`. Used for explore/filtering, not for the chat brain.

---

## 7. How Chat Uses the Brain

**File:** `src/lib/ai/chat.ts` — `getChatContext(proxy, userMessage)`.

For each user message we:

1. **RAG:** Embed the message, run vector search on `content_chunks` for this proxy (limit 8, min similarity 0.3). Results are “Relevant to This Conversation”.
2. **Low-confidence flag:** If average RAG score is below a threshold (default 0.4), we set `shouldFlag` so the model is told to answer carefully and stay in character.
3. **High-priority content:** Fetch up to 20 chunks with highest `priority` (no semantic search). These are “Core Knowledge”.
4. **Build system prompt** from fixed sections:

Order of sections in the prompt:

1. **Who You Are** — “You are @handle (name). Not a chatbot…” plus `brain.personality`, `brain.background`, `proxy.bio`.
2. **How This Person Actually Writes** — Few-shot examples (category + verbatim text), capped at 12, with instruction to match tone and length.
3. **Voice & Style Rules** — From voice profile: tone, communication style, humor, emotional range, sentence patterns, punctuation, capitalization, emoji, catchphrases, openers/closers, rhetorical devices, quirks, tone map, vocabulary (capped).
4. **Beliefs & Opinions** — From core brain: core beliefs list, stances per topic, FAQ (first 10).
5. **How You Think & React** — reasoningStyle, emotionalTriggers, contradictions, blindSpots, vocabularyFingerprint.
6. **Creator Instructions** — Optional override from `proxy.system_prompt` (e.g. from setup form).
7. **Reference Material** — Core Knowledge (high-priority chunks) + Relevant to This Conversation (RAG chunks). Instruction: use as background knowledge, never copy/quote/remix.
8. **Behavior Guidelines** — Hard rules (stay in character, no “as an AI”, one thought per message, no bullet dumps, don’t recite reference material) and soft rules (react to user, be witty, use beliefs/voice/reasoning). If low confidence, add a note to answer carefully.

So the “brain” at inference time is: **identity + few-shot examples + voice rules + beliefs/opinions/FAQ + reasoning/emotions/contradictions/blind spots + RAG chunks + strict behavior rules**. The chat model (Claude) then generates one or more short messages in that person’s voice.

---

## 8. Summary Table

| Component        | Source data        | Output stored on proxy   | Used at chat as                    |
|-----------------|--------------------|--------------------------|------------------------------------|
| Content chunks  | Top 1000 posts     | `content_chunks` table   | RAG + high-priority → Reference     |
| Voice profile   | Up to 300 posts    | `voice_profile` (JSONB)  | Voice & Style Rules section         |
| Writing examples| Up to 200 posts    | `writing_examples` (JSONB)| Few-shot “How This Person Writes” |
| Core brain      | Up to 300 posts + voice | `core_brain` (JSONB)  | Beliefs, opinions, FAQ, reasoning  |
| Category        | Bio, followers, topics | `category_id`        | Explore only                       |

All of this is produced inside `runFullIngestion`; the proxy is then set to `status: 'live'` and is ready for chat and token deployment.
