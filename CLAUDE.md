# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What is Proxi

Proxi is an AI-powered platform where users create AI clones of themselves from their X/Twitter data. Users tweet `@proxiagent` to trigger ingestion of their X history, which builds voice profiles, embeddings, and a "brain" for chat. Each proxy gets an ERC-20 token deployed on Base chain. Users can chat with proxies (priced in USDC) and trade proxy tokens.

## Commands

```bash
npm run dev          # Next.js dev server (port 3000)
npm run build        # Production build
npm run lint         # ESLint
npm run db:push      # Push Drizzle schema to database
npm run db:generate  # Generate Drizzle migrations
npm run db:seed      # Seed categories (tsx scripts/seed-categories.ts)
npm run clone        # Run clone script (tsx scripts/clone.ts)
```

No test runner is configured yet.

## Tech Stack

- **Framework**: Next.js 16 (App Router), React 19, TypeScript (strict)
- **Styling**: Tailwind CSS 4 with `clsx` + `tailwind-merge` via `cn()` in `src/lib/utils.ts`
- **Database**: PostgreSQL with Drizzle ORM, pgvector for embeddings (1536 dims)
- **Auth**: Privy (Twitter OAuth + embedded Ethereum wallets)
- **AI**: Vercel AI SDK with Anthropic (chat) and OpenAI (embeddings, text-embedding-3-small)
- **Blockchain**: Base chain, Clanker SDK v4 (token deployment), 0x API (swaps), viem/wagmi
- **Background Jobs**: Inngest (cron + event-driven functions via `/api/inngest`)
- **X/Twitter**: `@xdevplatform/xdk` for API v2

## Architecture

### Path alias
`@/*` maps to `./src/*`

### App Router structure
- `src/app/(marketing)/` - Public landing pages
- `src/app/(app)/` - Authenticated app pages (dashboard, explore, portfolio)
- `src/app/[handle]/` - Dynamic proxy pages (chat, claim, visualize)
- `src/app/api/` - API routes

### Key directories
- `src/lib/db/` - Drizzle schema (`schema.ts`), queries (`queries.ts`), client (`index.ts`)
- `src/lib/ai/` - AI pipeline: RAG, embeddings, voice analysis, brain building, chat context
- `src/lib/x/` - X/Twitter: ingestion pipeline, bot, client, filtering, scoring
- `src/lib/chain/` - Blockchain: token deployment, chain config
- `src/lib/auth/` - Privy server-side auth
- `src/inngest/` - Inngest functions (claim-fees, ingest-proxy, poll-mentions, auto-refresh)
- `src/hooks/` - React hooks (use-auth, use-chat, use-swap, use-sidebar)
- `src/components/ui/` - Base UI components (button, badge, card, input)

### Client-side providers
`src/components/providers.tsx` wraps the app with `PrivyProvider` (Base chain, Twitter+wallet login, dark theme) and `QueryClientProvider`.

### Authentication flow
- Client: `useAuth()` hook wraps `usePrivy()` with graceful fallback if Privy isn't configured
- Server: `src/lib/auth/privy.ts` handles server-side user/wallet creation
- Login methods: Twitter OAuth and wallet connect

### Database schema
13 tables defined in `src/lib/db/schema.ts`. Key enums:
- `proxy_status`: pending | building | live | paused | failed
- `content_type`: tweet | reply | thread | private_note

The `contentChunks` table stores vector embeddings (1536 dimensions) for RAG search.

### AI/Ingestion pipeline
The ingestion pipeline in `src/lib/x/ingest.ts` runs 11 steps: fetch profile, pull tweets, reconstruct threads, filter, score, embed chunks, voice analysis, example selection, brain building, category classification, and token deployment. Chat context is built via RAG (semantic search + priority scoring) with voice profile and brain data.

### Token lifecycle
Tokens deploy via Clanker SDK v4. The deployer wallet signs transactions; the creator wallet receives LP fee rewards. Fee claiming runs hourly as a scheduled Inngest cron function. Swaps use 0x API for USDC-to-token trades.

## Inngest Rules

- All functions live in `src/inngest/` and are served via `src/app/api/inngest/route.ts`
- Client is defined in `src/inngest/client.ts` — import `inngest` from there
- Cron functions use `inngest.createFunction({ id }, { cron }, handler)`
- Event-driven functions use `inngest.createFunction({ id }, { event }, handler)`
- To trigger an event-driven function: `inngest.send({ name: 'event/name', data: payload })`
- Concurrency is set via `concurrency: [{ limit: N }]` in the function config
- Retries are set via `retries: N` in the function config
- No separate CLI deploy needed — Inngest auto-discovers functions when deploying to Vercel

## Environment

All required env vars are documented in `.env.example`. Key groups: database (DATABASE_URL), auth (Privy), AI (Anthropic + OpenAI), X/Twitter (bearer + OAuth 1.0a), Inngest (event key + signing key), blockchain (Base RPC, deployer key, platform wallet), and external APIs (Alchemy, 0x).
