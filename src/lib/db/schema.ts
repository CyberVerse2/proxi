import {
  pgTable, uuid, text, varchar, integer, boolean,
  timestamp, doublePrecision, jsonb, index, pgEnum, vector,
} from "drizzle-orm/pg-core";

/* ---------- enums ---------- */
export const proxyStatusEnum = pgEnum("proxy_status", ["pending", "building", "live", "paused", "failed"]);
export const queueStatusEnum = pgEnum("queue_status", ["pending", "answered", "skipped"]);
export const contentTypeEnum = pgEnum("content_type", ["tweet", "reply", "thread", "private_note"]);

/* ---------- users ---------- */
export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  privyId: varchar("privy_id", { length: 255 }).unique().notNull(),
  xHandle: varchar("x_handle", { length: 100 }),
  xProfileImageUrl: text("x_profile_image_url"),
  displayName: varchar("display_name", { length: 100 }),
  bio: text("bio"),
  walletAddress: varchar("wallet_address", { length: 42 }),
  points: integer("points").default(0).notNull(),
  tier: varchar("tier", { length: 20 }).default("bronze").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

/* ---------- categories ---------- */
export const categories = pgTable("categories", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 100 }).unique().notNull(),
  slug: varchar("slug", { length: 100 }).unique().notNull(),
  icon: varchar("icon", { length: 50 }),
  sortOrder: integer("sort_order").default(0).notNull(),
});

/* ---------- proxies ---------- */
export const proxies = pgTable("proxies", {
  id: uuid("id").defaultRandom().primaryKey(),
  creatorId: uuid("creator_id").references(() => users.id),
  xHandle: varchar("x_handle", { length: 100 }).unique().notNull(),
  displayName: varchar("display_name", { length: 100 }),
  avatarUrl: text("avatar_url"),
  bio: text("bio"),
  ticker: varchar("ticker", { length: 20 }),
  status: proxyStatusEnum("status").default("pending").notNull(),
  categoryId: uuid("category_id").references(() => categories.id),
  tokenAddress: varchar("token_address", { length: 42 }),
  chatPrice: doublePrecision("chat_price").default(0.1),
  price: doublePrecision("price").default(0),
  priceChange24h: doublePrecision("price_change_24h").default(0),
  marketCap: doublePrecision("market_cap").default(0),
  volume24h: doublePrecision("volume_24h").default(0),
  totalChats: integer("total_chats").default(0).notNull(),
  totalMessages: integer("total_messages").default(0).notNull(),
  rating: doublePrecision("rating").default(0),
  coreBrain: jsonb("core_brain"),
  voiceProfile: jsonb("voice_profile"),
  writingExamples: jsonb("writing_examples"),
  systemPrompt: text("system_prompt"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  index("idx_proxies_handle").on(t.xHandle),
  index("idx_proxies_status").on(t.status),
  index("idx_proxies_category").on(t.categoryId),
]);

/* ---------- content_chunks ---------- */
export const contentChunks = pgTable("content_chunks", {
  id: uuid("id").defaultRandom().primaryKey(),
  proxyId: uuid("proxy_id").references(() => proxies.id).notNull(),
  contentType: contentTypeEnum("content_type").notNull(),
  originalText: text("original_text").notNull(),
  processedText: text("processed_text"),
  tweetId: varchar("tweet_id", { length: 30 }),
  embedding: vector("embedding", { dimensions: 1536 }),
  priority: integer("priority").default(0).notNull(),
  qualityScore: doublePrecision("quality_score").default(0),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  index("idx_chunks_proxy").on(t.proxyId),
]);

/* ---------- conversations ---------- */
export const conversations = pgTable("conversations", {
  id: uuid("id").defaultRandom().primaryKey(),
  proxyId: uuid("proxy_id").references(() => proxies.id).notNull(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  title: varchar("title", { length: 200 }),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  endedAt: timestamp("ended_at"),
  totalMessages: integer("total_messages").default(0).notNull(),
  costTokens: integer("cost_tokens").default(0).notNull(),
}, (t) => [
  index("idx_conversations_user_proxy").on(t.userId, t.proxyId),
]);

/* ---------- messages ---------- */
export const messages = pgTable("messages", {
  id: uuid("id").defaultRandom().primaryKey(),
  conversationId: uuid("conversation_id").references(() => conversations.id).notNull(),
  role: varchar("role", { length: 10 }).notNull(),
  content: text("content").notNull(),
  flagged: boolean("flagged").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  index("idx_messages_conv").on(t.conversationId),
]);

/* ---------- queue (flagged questions) ---------- */
export const queue = pgTable("queue", {
  id: uuid("id").defaultRandom().primaryKey(),
  proxyId: uuid("proxy_id").references(() => proxies.id).notNull(),
  messageId: uuid("message_id").references(() => messages.id).notNull(),
  question: text("question").notNull(),
  answer: text("answer"),
  status: queueStatusEnum("status").default("pending").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  answeredAt: timestamp("answered_at"),
});

/* ---------- watchlist ---------- */
export const watchlist = pgTable("watchlist", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  proxyId: uuid("proxy_id").references(() => proxies.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  index("idx_watchlist_user").on(t.userId),
]);

/* ---------- ratings / reviews ---------- */
export const ratings = pgTable("ratings", {
  id: uuid("id").defaultRandom().primaryKey(),
  proxyId: uuid("proxy_id").references(() => proxies.id).notNull(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  score: integer("score").notNull(),
  reviewText: text("review_text"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  index("idx_ratings_proxy").on(t.proxyId),
]);

/* ---------- leaderboard ---------- */
export const leaderboard = pgTable("leaderboard", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  points: integer("points").default(0).notNull(),
  rank: integer("rank"),
  tier: varchar("tier", { length: 20 }).default("bronze").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

/* ---------- point_events ---------- */
export const pointEvents = pgTable("point_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  action: varchar("action", { length: 50 }).notNull(),
  points: integer("points").notNull(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/* ---------- proxy_token ---------- */
export const proxyTokens = pgTable("proxy_tokens", {
  id: uuid("id").defaultRandom().primaryKey(),
  proxyId: uuid("proxy_id").references(() => proxies.id).notNull(),
  tokenAddress: varchar("token_address", { length: 42 }).notNull(),
  chain: varchar("chain", { length: 20 }).default("bsc").notNull(),
  deployedAt: timestamp("deployed_at").defaultNow().notNull(),
  metadata: jsonb("metadata"),
});

/* ---------- creator earnings payouts ---------- */
export const creatorEarningsPayouts = pgTable("creator_earnings_payouts", {
  id: uuid("id").defaultRandom().primaryKey(),
  proxyId: uuid("proxy_id").references(() => proxies.id).notNull(),
  tokenAddress: varchar("token_address", { length: 42 }).notNull(),
  creatorWalletAddress: varchar("creator_wallet_address", { length: 42 }).notNull(),
  quoteTokenAddress: varchar("quote_token_address", { length: 42 }),
  grossAmount: varchar("gross_amount", { length: 255 }).notNull(),
  creatorAmount: varchar("creator_amount", { length: 255 }).notNull(),
  platformAmount: varchar("platform_amount", { length: 255 }).notNull(),
  txHash: varchar("tx_hash", { length: 66 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  index("idx_creator_earnings_payouts_proxy").on(t.proxyId),
  index("idx_creator_earnings_payouts_token").on(t.tokenAddress),
]);

/* ---------- ingestion_logs ---------- */
export const ingestionLogs = pgTable("ingestion_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  proxyId: uuid("proxy_id").references(() => proxies.id).notNull(),
  step: varchar("step", { length: 50 }).notNull(),
  status: varchar("status", { length: 20 }).notNull(),
  detail: text("detail"),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  finishedAt: timestamp("finished_at"),
});

/* ---------- bot_state (key-value for poll cursors etc.) ---------- */
export const botState = pgTable("bot_state", {
  key: varchar("key", { length: 100 }).primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

/* ---------- type helpers ---------- */
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Proxy = typeof proxies.$inferSelect;
export type NewProxy = typeof proxies.$inferInsert;
export type ContentChunk = typeof contentChunks.$inferSelect;
export type Conversation = typeof conversations.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type QueueItem = typeof queue.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type WatchlistItem = typeof watchlist.$inferSelect;
