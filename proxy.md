# Proxi.fun — Core User Flow

---

## The Loop

1. User tags @proxifun on X → proxy agent is auto-created
2. User visits proxi.fun → connects X to prove ownership → completes agent details → unlocks fee access
3. Platform builds the **Proxy Brain** from public + private data
4. Anyone can now chat with the proxy
5. Agent has its own token → creator earns 50% of fees
---

## Flow 1: Creation (Starts on X)

### Trigger

A user posts on X:

> @proxifun create my proxy

or

> @proxifun clone me

or simply tags @proxifun with intent to create.

### What Happens Immediately

1. **@proxifun bot responds publicly** within seconds:

   > 🧬 building your proxy now, @username...
   >
   > ingesting your posts. analyzing your voice. cloning your brain.
   >
   > your proxy will be live in ~3 min.
   >
   > claim it and start earning → proxi.fun/username

2. **Behind the scenes — fast build pipeline kicks off:**
   - Pull user's public X data (posts, replies, threads, bio, pinned tweet)
   - Run the trash filter (strip RTs, "gm" replies, link-only posts, auto-generated content)
   - Classify and score remaining posts
   - Build the Knowledge Base (vector store)
   - Run Voice Analysis to generate their voice profile
   - Generate topic map
   - Deploy a default agent with auto-generated name and ticker

3. **@proxifun bot replies again when ready:**

   > ✅ @username your proxy is live.
   >
   > 🧠 analyzed 18,429 posts
   > 🗣️ voice profile: casual, lowercase, dry humor, crypto-native
   > 📚 strongest topics: DeFi, L2s, tokenomics
   > 💰 token: $USERNAME on Base
   >
   > anyone can chat with your proxy now → proxi.fun/username
   >
   > claim it to unlock your 50% fee share 👇

This is the viral moment. The reply thread becomes discovery — other people see it, click the link, chat with the proxy, maybe create their own.

### Unclaimed State

The proxy is **live and chatable immediately** even before the creator claims it. This is important:

- Chatters can talk to it right away
- Token is tradeable right away
- But the creator earns nothing until they claim
- The unclaimed proxy has a banner: "This proxy is unclaimed. Are you @username? Claim it to earn 50% of fees."

This creates urgency for the creator to come claim it.

---

## Flow 2: Claiming & Completing (On Platform)

### Step 1: Arrive & Connect

1. Creator clicks the link (proxi.fun/username) or navigates to proxi.fun
2. Sees their proxy already live — people may already be chatting with it
3. Clicks **"Claim This Proxy"**
4. Connects wallet (Base — Coinbase Wallet, MetaMask, etc.)
5. Authenticates with X via OAuth → this **proves they own the account**
6. X handle matches → proxy is now claimed
7. Creator's wallet is linked to the agent token → fees start flowing

### Step 2: Complete Agent Details

After claiming, the creator lands on their **Proxy Dashboard** with a setup wizard:

**2a. Review Voice Profile**

The platform shows the auto-generated voice profile:

> "Your proxy writes in lowercase with minimal punctuation. Keeps takes to 1-2 sentences. Uses crypto slang heavily — 'ser', 'ngmi', 'lfg'. Switches to technical language when explaining protocols. Humor is dry and deadpan. Avoids exclamation marks."

Creator can:
- Approve as-is
- Tweak specific traits ("make it a bit more friendly", "I'm actually more sarcastic than that")
- Regenerate from scratch

**2b. Review Knowledge Map**

Visual breakdown of what the proxy knows:

> 🟢 **Strong** (100+ deep posts): DeFi protocols, L2 architecture, tokenomics
> 🟡 **Medium** (20-100 posts): AI agents, startup culture, Farcaster ecosystem
> 🔴 **Weak** (< 20 posts): personal life, health, travel
> ⚫ **Blind spots**: no coverage at all

Creator sees where the proxy will be confident vs. where it'll say "not sure about that one — I'll flag it for the real me."

**2c. Add Private Knowledge**

This is where the proxy goes from "pretty good" to "uncanny." Creator can upload private data that wasn't on X:

- **Documents** — PDFs, blog drafts, research notes, personal writing
- **Direct input** — "Things I believe but haven't tweeted about" — free-text that gets added to the knowledge base
- **Q&A pairs** — Creator pre-answers common questions they expect people to ask
- **Correction mode** — Chat with their own proxy, catch mistakes, correct them in real time

**2d. Configure Agent Details**

- Display name (defaults to X name)
- Avatar (defaults to X profile pic)
- Short bio / tagline for the agent card
- Token ticker (defaults to $HANDLE — can customize if unclaimed)
- Notification preferences for the queue system (in-app, Farcaster DM, email digest)

**2e. Test Chat**

Creator talks to their own proxy before it goes fully live with their endorsement. They verify it sounds right, catches their opinions accurately, and handles edge cases well.

### Step 3: Go Live (Claimed)

Once setup is complete:
- "Unclaimed" banner is removed
- Creator badge appears on the agent profile
- Creator starts receiving 50% of token trading fees to their connected wallet
- Agent appears as "verified" in the explore page

---

## Flow 3: The Proxy Brain

The brain is the core product. It has two components that work together.

### Component 1: Knowledge Base

**What it is:** Everything the proxy knows — the facts, opinions, experiences, and expertise it can draw from when answering questions.

**What feeds it:**

| Source | Priority | Description |
|--------|----------|-------------|
| Queue Answers | ★★★★★ | Direct answers from the real creator to questions their proxy couldn't handle. Highest signal data — actual Q&A pairs. |
| Uploaded Documents | ★★★★☆ | Private knowledge the creator adds — blog posts, research, notes, direct input. High signal because it's intentional. |
| Correction Data | ★★★★☆ | When the creator chats with their proxy and corrects mistakes. Direct preference signal. |
| Pre-loaded Q&A | ★★★★☆ | Questions the creator pre-answers during setup. Clean, structured knowledge. |
| Deep X Posts | ★★★☆☆ | Long-form threads, detailed explanations, technical breakdowns. Original thought with depth. |
| Opinion Posts | ★★★☆☆ | Takes and perspectives on topics. Shows where the creator stands. |
| Conversational Replies | ★★☆☆☆ | How the creator interacts in discussion. Lower knowledge signal but useful for personality. |
| Recent Posts | ★★☆☆☆ | Keeps the proxy current. Auto-ingested periodically. |

**How it works at query time:**

1. Chatter asks a question
2. Question gets embedded (vector representation)
3. RAG retrieval pulls the top 10-20 most relevant chunks from the knowledge base
4. These chunks get injected into the system prompt's `<knowledge>` block
5. The LLM generates a response grounded in the creator's actual knowledge
6. If the similarity scores are all low (nothing relevant found), the proxy flags it for the queue

**Key design principle:** The proxy should NEVER fabricate opinions or knowledge. If it's not in the knowledge base, it doesn't exist. The proxy either answers from the knowledge base or sends it to the queue. No hallucinated takes.

### Component 2: Voice Profile

**What it is:** How the proxy sounds — the personality layer that makes it feel like talking to the actual person, not a generic chatbot wearing their name.

**What it captures:**

```
VOICE PROFILE: @username

Tone
├── Primary: casual, confident
├── Formality: 2/10 (very informal)
├── Warmth: 6/10 (friendly but not soft)
└── Confidence: 8/10 (assertive, rarely hedges)

Writing Mechanics
├── Capitalization: none (all lowercase)
├── Punctuation: minimal (no periods, rare commas)
├── Avg post length: 12 words
├── Sentence structure: short, punchy fragments
└── Uses line breaks for emphasis: yes

Vocabulary
├── Register: slang-heavy
├── Signature words: "ser", "ngmi", "the play is...", "ngl"
├── Filler words: "tbh", "idk", "look,"
├── Never uses: "furthermore", "regarding", "I believe"
└── Acronym usage: heavy

Emoji & Symbols
├── Frequency: moderate
├── Favorites: 🫡 💀 👀 (in order)
└── Style: ironic, never decorative

Personality
├── Humor: dry, deadpan, meme-literate
├── How they agree: "this is it" / "exactly" / "real"
├── How they disagree: "nah" / asks rhetorical question / "respectfully, no"
├── How they greet: doesn't — jumps straight to the point
├── Catchphrases: "the play is...", "not gonna make it", "few understand"
└── Debate style: direct, uses short rhetorical questions, never gets heated

Topics
├── Goes deep on: DeFi, L2 infra, tokenomics
├── Has takes on: AI agents, startup culture
├── Avoids: politics, personal drama
└── Expertise flex: can explain complex DeFi in simple terms

Interaction Style
├── Reply tone: more casual than original posts
├── Handles criticism: deflects with humor
├── Asks questions: rarely
└── Engagement: converses with known people, broadcasts to others
```

**How it's generated:**

1. Voice Sample — 300-500 curated posts balanced across types (originals, replies, threads, casual, serious)
2. Weighted toward recent content (voice evolves over time)
3. Includes low-engagement posts (authentic voice, not performance mode)
4. Fed into the voice analysis LLM prompt → outputs the structured profile above
5. The `voice_summary` field gets injected into the system prompt

**How it's used at runtime:**

The voice profile lives in the system prompt permanently. Every response the proxy generates must conform to it. The LLM doesn't just know *what* the creator thinks — it knows *how* they'd say it.

Example — same knowledge, different voice profiles:

> **Question:** "What do you think about Solana?"
>
> **Creator A's proxy** (casual, bullish, emoji-heavy):
> "solana been cooking fr 🔥 fastest L1 out there and the dev community is insane. not everything needs to be on ethereum ser"
>
> **Creator B's proxy** (technical, measured, formal):
> "Solana offers compelling throughput at the hardware layer, though the centralization tradeoffs in validator economics remain a concern. For payments specifically, it's hard to argue against the UX."

Same question. Completely different people. That's the voice profile doing its job.

### How the Two Components Interact

```
┌─────────────────────────────────────────────────┐
│                  PROXY BRAIN                     │
│                                                  │
│  ┌──────────────┐       ┌──────────────────┐    │
│  │  KNOWLEDGE   │       │  VOICE PROFILE   │    │
│  │  BASE        │       │                  │    │
│  │              │       │  Tone            │    │
│  │  X Posts     │       │  Vocabulary      │    │
│  │  Threads     │       │  Mechanics       │    │
│  │  Uploads     │       │  Personality     │    │
│  │  Queue A's   │       │  Emoji style     │    │
│  │  Corrections │       │  Debate style    │    │
│  │              │       │                  │    │
│  │  "WHAT they  │       │  "HOW they       │    │
│  │   know and   │       │   would say it"  │    │
│  │   believe"   │       │                  │    │
│  └──────┬───────┘       └────────┬─────────┘    │
│         │                        │               │
│         └──────────┬─────────────┘               │
│                    ▼                             │
│         ┌──────────────────┐                    │
│         │  SYSTEM PROMPT   │                    │
│         │                  │                    │
│         │  Voice rules     │                    │
│         │  + Retrieved     │                    │
│         │    knowledge     │                    │
│         │  + Guardrails    │                    │
│         └────────┬─────────┘                    │
│                  ▼                               │
│         ┌──────────────────┐                    │
│         │  LLM GENERATES   │                    │
│         │  RESPONSE        │                    │
│         │                  │                    │
│         │  Sounds like     │                    │
│         │  the creator,    │                    │
│         │  grounded in     │                    │
│         │  their actual    │                    │
│         │  knowledge       │                    │
│         └──────────────────┘                    │
│                                                  │
└─────────────────────────────────────────────────┘
```

### Brain Growth Over Time

The brain isn't static. It gets smarter through four channels:

**Channel 1: Queue Learning**
Chatter asks something → proxy can't answer → queued → creator answers → Q&A pair added to knowledge base → proxy handles it next time. This is the highest-value learning loop.

**Channel 2: Creator Uploads**
Creator adds documents, notes, blog posts, or direct text input at any time. Processed immediately and added to the knowledge base.

**Channel 3: Correction Training**
Creator chats with their proxy, catches wrong answers or off-tone responses, and corrects them. Corrections are stored as high-priority overrides.

**Channel 4: Auto-Refresh**
Platform periodically re-ingests the creator's recent X posts. New takes, new topics, evolving opinions get absorbed. Voice profile gets re-analyzed quarterly to catch style drift.

```
BRAIN QUALITY OVER TIME

Quality
  ▲
  │                                    ┌─── Auto-refresh
  │                              ┌─────┘    keeps it current
  │                         ┌────┘
  │                    ┌────┘ ← Queue answers
  │               ┌────┘       fill knowledge gaps
  │          ┌────┘
  │     ┌────┘ ← Creator uploads
  │ ┌───┘      add private knowledge
  │─┘
  │ ← Initial build from X posts
  │
  └──────────────────────────────────────► Time
  Day 1    Week 1    Month 1    Month 3
```

---

## The System Prompt (Runtime)

When a chatter sends a message, this is what the LLM actually sees:

```
You are a Proxy of {{CREATOR_NAME}} (@{{X_HANDLE}}).

## Voice
{{VOICE_SUMMARY}}

## Knowledge
The following is context from {{CREATOR_NAME}}'s posts, documents, and
direct inputs. Use ONLY this to answer. Never fabricate opinions or
knowledge they haven't expressed.

<knowledge>
{{RAG_RETRIEVED_CHUNKS — top 10-20 most relevant to the query}}
</knowledge>

## Rules
1. Speak in first person as {{CREATOR_NAME}}. Stay in character always.
2. If asked "are you an AI / are you real" — be honest: "I'm a Proxy 
   of {{CREATOR_NAME}} built on proxi.fun. The real one sees questions 
   I can't handle."
3. If you don't have enough info to answer confidently, respond in 
   character: "hmm haven't really gotten into that — flagging it for 
   the real me" and mark the message as: [QUEUE]
4. Never make commitments (meetings, deals, promises) on their behalf.
5. Never share personal info not in the knowledge base.
6. Never generate content that could damage their reputation.
7. Match their typical response length and energy. Don't over-explain.
```

---

## Token Economics

| Parameter | Value |
|-----------|-------|
| Token launch | Clanker or Flaunch (creator chooses) |
| Chain | Base |
| Fee split | 50% creator / 50% protocol |
| Launch timing | Immediate on proxy creation (tradeable before claim) |
| Creator access to fees | Unlocked after claiming (connecting wallet + X OAuth) |

The token creates alignment: the better the proxy, the more people chat with it, the more demand for the token, the more the creator earns, the more incentive they have to keep training it.

---

## Summary: The Full Lifecycle

```
1. TAG        User tags @proxifun on X
                  │
2. BUILD      Bot ingests posts → filters → classifies → scores
                  │
              ┌───┴───┐
              ▼       ▼
          Knowledge  Voice
          Base       Profile
              │       │
              └───┬───┘
                  ▼
3. LAUNCH     Proxy goes live + token deployed on Base
                  │
4. CHAT       Anyone can talk to the proxy immediately
                  │
5. CLAIM      Creator visits proxi.fun → connects X + wallet
                  │
6. COMPLETE   Reviews voice, knowledge map, adds private data
                  │
7. EARN       50% of token fees flow to creator's wallet
                  │
8. GROW       Queue answers + uploads + corrections + auto-refresh
                  │
              ┌───┴───┐
              ▼       ▼
          Brain gets    Token demand
          smarter        increases
              │            │
              └─────┬──────┘
                    ▼
              Flywheel spins
```