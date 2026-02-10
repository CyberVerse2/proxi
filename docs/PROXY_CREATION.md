# How We Create a Proxy

This document describes how a proxy (an AI clone of an X/Twitter user) is created in Proxi, from trigger to live proxy with token and chat.

---

## Overview

A proxy is created in three main phases:

1. **Trigger** — Something asks for a new proxy (Twitter mention, setup wizard, or API).
2. **Record + identity** — We create the database proxy row and ensure the creator has a Privy user + wallet (for token deployment and fees).
3. **Ingestion + token** — A background job pulls X data, builds the “brain” and voice profile, deploys an ERC-20 token on Base, and marks the proxy live.

The proxy is **unclaimed** until the creator signs in on the website and clicks “Claim” on `/{handle}/claim`. Claiming sets `creator_id` on the proxy and links it to their app account.

---

## Entry Points (How Creation Is Triggered)

### 1. Twitter bot (primary flow)

- **Trigger:** User tweets at `@proxiagent` with a “create” intent (e.g. “@proxiagent clone me”, “create my proxy”, “make my clone”).
- **Detection:** Inngest cron `poll-mentions` runs every 5 minutes (`src/inngest/poll-mentions.ts`). It fetches new mentions of the bot, parses each with `parseCreateIntent()` in `src/lib/x/bot.ts`, and skips non-create or already-existing proxies.
- **Handler:** For each valid create intent, it calls `handleCreateMention(authorHandle, tweetId)` in `src/lib/x/bot.ts`.

### 2. Setup wizard (website)

- **Trigger:** User on `/{handle}/claim/setup` starts ingestion (e.g. “Build my proxy”).
- **API:** `POST /api/proxy/ingest` (`src/app/api/proxy/ingest/route.ts`) with `{ privyId, xHandle }`. If no proxy exists for that handle (or for the user’s `creator_id`), it creates one and triggers the same Inngest event.

### 3. Direct API

- **Trigger:** `POST /api/proxy` with a JSON body that matches the proxy schema.
- **Code:** `src/app/api/proxy/route.ts` calls `createProxy(data)` and returns the new proxy. This does **not** trigger ingestion or token deployment; it only creates the DB row. Used for programmatic creation or internal tools.

### 4. Clone script (CLI)

- **Trigger:** `npm run clone <xHandle>` (`scripts/clone.ts`). Used for testing or backfills.
- **Behavior:** Optionally creates/updates Privy user and DB user, creates or resets the proxy row, then sends the same Inngest event `proxy/ingest.requested` so ingestion and token deployment run in the background.

---

## Phase 1: Validation and Record Creation (Twitter Flow in Detail)

The Twitter path is the most complete; the others converge to the same ingestion event after creating (or reusing) a proxy.

### Step 0: Already exists?

- `getProxyByHandle(authorHandle)`. If a proxy exists, reply with “You already have a proxy” and the profile URL; stop.

### Step 1: X user and eligibility

- **Lookup:** `getUserByUsername(authorHandle)` (X API v2) to get profile and metrics.
- **Not found:** Reply “Couldn’t find your X profile”; stop.
- **Company check:** If the account has a bio, `detectCompanyAccount(name, bio)` uses Claude Haiku to classify COMPANY vs INDIVIDUAL. Companies get a reply that Proxi is for individual creators; stop.
- **Minimums:** Require ≥ 200 followers and ≥ 200 tweets. Otherwise reply with current counts and ask them to try again later.

### Step 2: Privy user and wallet

- **Purpose:** Token deployment and fee collection require an Ethereum wallet. We create a Privy user with Twitter linked and an embedded wallet, all server-side.
- **Call:** `createUserWithWallet(authorHandle, xUser.id)` in `src/lib/auth/privy.ts`.
  - Uses `privyServer.importUser()` with `linkedAccounts: [{ type: 'twitter_oauth', subject: twitterSubject, username: twitterUsername, name: twitterUsername }]` and `createEthereumWallet: true`.
  - If that fails (e.g. Twitter already linked elsewhere), it falls back to `getUserByTwitterUsername()` and returns the existing user’s wallet.
- **Failure:** If we can’t get a wallet, reply “Something went wrong setting up your account”; stop.
- **DB user:** `upsertUser({ privyId, walletAddress, xHandle, displayName, xProfileImageUrl, bio })` so the app has a user row tied to that Privy account.

### Step 3: Create proxy row

- **Call:** `createProxy(...)` from `src/lib/db/queries.ts`.
- **Input:** `xHandle`, `displayName`, `avatarUrl`, `bio`, `status: "building"`. No `creator_id` yet (that’s set at claim time).
- **Schema:** Table `proxies` in `src/lib/db/schema.ts`: `id`, `creator_id` (nullable), `x_handle` (unique), `display_name`, `avatar_url`, `bio`, `ticker`, `status`, `category_id`, `token_address`, `chat_price`, pricing/market fields, `core_brain`, `voice_profile`, `writing_examples`, `system_prompt`, timestamps. Defaults include `status: "pending"` (overridden to `"building"` here).

### Step 4: Enqueue ingestion

- **Event:** `inngest.send({ name: 'proxy/ingest.requested', data: { proxyId, xHandle, tweetId?, maxTweets?, walletAddress } })`.
- **tweetId:** Present only for the Twitter flow; used later to reply to the user when the proxy is live.
- **walletAddress:** Required for token deployment (creator receives LP fee share).

No reply is sent yet for “we’re building”; the completion reply is sent from the ingestion job when it finishes.

---

## Phase 2: Background Ingestion (Inngest)

- **Function:** `ingest-proxy` in `src/inngest/ingest-proxy.ts`, triggered by event `proxy/ingest.requested`, concurrency 2, retries 3.
- **Payload:** `proxyId`, `xHandle`, optional `tweetId`, optional `maxTweets` (default 200 in ingest), `walletAddress`.

### 2.1 Run ingestion pipeline

- **Entry:** `runFullIngestion(proxyId, xHandle, onProgress, maxTweets)` in `src/lib/x/ingest.ts`.
- **Progress:** Each step is logged and written to `ingestion_logs` for the proxy.

Pipeline steps (high level):

1. **Fetch user** — `getUserByUsername(xHandle)`. Update proxy profile (displayName, avatarUrl, bio). Abort if user not found.
2. **Fetch tweets** — `getAllUserTweets(xUser.id, maxTweets)` (X API). If prefetched tweets are passed (e.g. clone script with `--mock`), skip X and use those.
3. **Threads** — `reconstructThreads()` + `threadsToSyntheticTweets()` so reply chains become single coherent posts.
4. **Filter** — `filterTrash()` to drop low-quality or off-brand content.
5. **Score and select** — `selectTopPosts(filtered, 1000)` for diversity and quality; these become the content set for the proxy.
6. **Embed and store** — `embedAndStoreChunks(proxyId, chunks)`: OpenAI embeddings (1536-d), stored in `content_chunks` with `proxy_id`, used later for RAG in chat.
7. **Voice analysis** — `analyzeVoice(texts)` (multi-pass) → `voice_profile` (tone, style, vocabulary, etc.).
8. **Writing examples** — `selectWritingExamples(exampleTexts)` for few-shot chat.
9. **Core brain** — `buildCoreBrain(brainTexts, voiceRecord)` → beliefs, opinions, topicMap, reasoning style, etc.
10. **Classify** — `classifyProxy({ bio, followerCount, topics })` assigns a category (e.g. founders, creators); `getCategoryBySlug` + `updateProxy(proxyId, { categoryId })`.
11. **Finalize** — `updateProxy(proxyId, { voiceProfile, coreBrain, writingExamples, status: 'live' })`. Proxy is now **live** for chat (no token yet).

Result: proxy has `content_chunks`, `voice_profile`, `core_brain`, `writing_examples`, and `status: 'live'`.

### 2.2 Token deployment

- **Check:** If proxy already has `token_address` (e.g. retry after partial success), skip deploy and use existing token.
- **Deploy:** `deployProxyToken(...)` in `src/lib/chain/token.ts` (Clanker SDK on Base): name, symbol (ticker), `proxyId`, `creatorAddress`, optional `imageUrl`, description linking to `{appUrl}/{xHandle}`. On success we get `tokenAddress` and `ticker`.
- **DB:** Token is stored on the proxy (and in `proxy_tokens` as applicable). Creator wallet is the fee recipient for that token.

### 2.3 Completion reply (Twitter only)

- If `tweetId` is present, `sendCompletionReply(xHandle, proxyId, tweetId, tokenInfo)` in `src/lib/x/bot.ts` posts a reply: proxy is live, chat URL, token ticker + Dexscreener link, claim URL.

### 2.4 Failure handling

- On error, ingestion log row is written with `step: "error"`, `status: "failed"`.
- On final retry attempt: `updateProxy(proxyId, { status: 'failed' })` and, if `tweetId` is set, send a “something went wrong” reply. Error is rethrown so Inngest can record the failure.

---

## Phase 3: Claiming (Optional, On Website)

- **Page:** `/{handle}/claim` (`src/app/[handle]/claim/claim-client.tsx`).
- **Logic:** If the proxy has no `creator_id` and the signed-in user’s X handle (from Privy) matches the proxy’s `x_handle`, they see “Claim Your Proxy” and can hit “Verify & Claim”.
- **API:** `POST /api/proxy/claim` (or equivalent) updates the proxy with `creator_id = current user’s DB id`. After that, the proxy is “claimed” and the creator can access setup, fees, and settings.

Until claimed, the proxy is still usable (chat, token, explore); only the link to the app account and creator-only features are gated.

---

## Data Flow Summary

```
Twitter mention (@proxiagent clone me)
  → poll-mentions (cron) → parseCreateIntent → handleCreateMention
  → X user check, company check, 200/200 check
  → createUserWithWallet (Privy) → upsertUser
  → createProxy (DB) → inngest.send('proxy/ingest.requested')

POST /api/proxy/ingest (setup)
  → get/create user, get or createProxy
  → inngest.send('proxy/ingest.requested')

proxy/ingest.requested
  → runFullIngestion (profile, tweets, threads, filter, score, embed, voice, examples, brain, classify, update status=live)
  → deployProxyToken (Base)
  → sendCompletionReply (if tweetId)
```

---

## Key Files

| Role | File |
|------|------|
| Bot logic, create intent, handle mention | `src/lib/x/bot.ts` |
| Poll mentions cron | `src/inngest/poll-mentions.ts` |
| Ingest-proxy Inngest function | `src/inngest/ingest-proxy.ts` |
| Full ingestion pipeline | `src/lib/x/ingest.ts` |
| Create proxy DB | `src/lib/db/queries.ts` (`createProxy`) |
| Proxy schema | `src/lib/db/schema.ts` (`proxies`) |
| Privy user + wallet creation | `src/lib/auth/privy.ts` (`createUserWithWallet`) |
| Setup ingest API | `src/app/api/proxy/ingest/route.ts` |
| Direct create API | `src/app/api/proxy/route.ts` |
| Clone script | `scripts/clone.ts` |
| Token deployment | `src/lib/chain/token.ts` (`deployProxyToken`) |

---

## Environment / Config

- **X/Twitter:** Bearer token (read), OAuth 1.0a (tweet, reply), `X_BOT_USER_ID` for mention polling, `BOT_HANDLE` (e.g. `proxiagent`).
- **Privy:** `NEXT_PUBLIC_PRIVY_APP_ID`, `PRIVY_APP_SECRET` for server-side `importUser` and wallet lookup.
- **Inngest:** Events delivered to the app; `proxy/ingest.requested` triggers the ingest function.
- **Base/Clanker:** RPC, deployer key, platform wallet for token deployment and fee routing.

This is how we create a proxy end-to-end, from trigger to live proxy with token and optional claim.
