CREATE TYPE "public"."content_type" AS ENUM('tweet', 'reply', 'thread', 'private_note');--> statement-breakpoint
CREATE TYPE "public"."proxy_status" AS ENUM('pending', 'building', 'live', 'paused', 'failed');--> statement-breakpoint
CREATE TYPE "public"."queue_status" AS ENUM('pending', 'answered', 'skipped');--> statement-breakpoint
CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"slug" varchar(100) NOT NULL,
	"icon" varchar(50),
	"sort_order" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "categories_name_unique" UNIQUE("name"),
	CONSTRAINT "categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "content_chunks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"proxy_id" uuid NOT NULL,
	"content_type" "content_type" NOT NULL,
	"original_text" text NOT NULL,
	"processed_text" text,
	"tweet_id" varchar(30),
	"embedding" vector(1536),
	"priority" integer DEFAULT 0 NOT NULL,
	"quality_score" double precision DEFAULT 0,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"proxy_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"title" varchar(200),
	"started_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"ended_at" timestamp,
	"total_messages" integer DEFAULT 0 NOT NULL,
	"cost_tokens" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ingestion_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"proxy_id" uuid NOT NULL,
	"step" varchar(50) NOT NULL,
	"status" varchar(20) NOT NULL,
	"detail" text,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"finished_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "leaderboard" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"points" integer DEFAULT 0 NOT NULL,
	"rank" integer,
	"tier" varchar(20) DEFAULT 'bronze' NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"role" varchar(10) NOT NULL,
	"content" text NOT NULL,
	"flagged" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "point_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"action" varchar(50) NOT NULL,
	"points" integer NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "proxies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"creator_id" uuid,
	"x_handle" varchar(100) NOT NULL,
	"display_name" varchar(100),
	"avatar_url" text,
	"bio" text,
	"ticker" varchar(20),
	"status" "proxy_status" DEFAULT 'pending' NOT NULL,
	"category_id" uuid,
	"token_address" varchar(42),
	"price" double precision DEFAULT 0,
	"price_change_24h" double precision DEFAULT 0,
	"market_cap" double precision DEFAULT 0,
	"volume_24h" double precision DEFAULT 0,
	"total_chats" integer DEFAULT 0 NOT NULL,
	"total_messages" integer DEFAULT 0 NOT NULL,
	"rating" double precision DEFAULT 0,
	"core_brain" jsonb,
	"voice_profile" jsonb,
	"writing_examples" jsonb,
	"system_prompt" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "proxies_x_handle_unique" UNIQUE("x_handle")
);
--> statement-breakpoint
CREATE TABLE "proxy_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"proxy_id" uuid NOT NULL,
	"token_address" varchar(42) NOT NULL,
	"chain" varchar(20) DEFAULT 'base' NOT NULL,
	"deployed_at" timestamp DEFAULT now() NOT NULL,
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE "queue" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"proxy_id" uuid NOT NULL,
	"message_id" uuid NOT NULL,
	"question" text NOT NULL,
	"answer" text,
	"status" "queue_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"answered_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "ratings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"proxy_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"score" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"privy_id" varchar(255) NOT NULL,
	"x_handle" varchar(100),
	"x_profile_image_url" text,
	"display_name" varchar(100),
	"bio" text,
	"wallet_address" varchar(42),
	"points" integer DEFAULT 0 NOT NULL,
	"tier" varchar(20) DEFAULT 'bronze' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_privy_id_unique" UNIQUE("privy_id")
);
--> statement-breakpoint
CREATE TABLE "watchlist" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"proxy_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "content_chunks" ADD CONSTRAINT "content_chunks_proxy_id_proxies_id_fk" FOREIGN KEY ("proxy_id") REFERENCES "public"."proxies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_proxy_id_proxies_id_fk" FOREIGN KEY ("proxy_id") REFERENCES "public"."proxies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ingestion_logs" ADD CONSTRAINT "ingestion_logs_proxy_id_proxies_id_fk" FOREIGN KEY ("proxy_id") REFERENCES "public"."proxies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leaderboard" ADD CONSTRAINT "leaderboard_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "point_events" ADD CONSTRAINT "point_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proxies" ADD CONSTRAINT "proxies_creator_id_users_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proxies" ADD CONSTRAINT "proxies_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proxy_tokens" ADD CONSTRAINT "proxy_tokens_proxy_id_proxies_id_fk" FOREIGN KEY ("proxy_id") REFERENCES "public"."proxies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "queue" ADD CONSTRAINT "queue_proxy_id_proxies_id_fk" FOREIGN KEY ("proxy_id") REFERENCES "public"."proxies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "queue" ADD CONSTRAINT "queue_message_id_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_proxy_id_proxies_id_fk" FOREIGN KEY ("proxy_id") REFERENCES "public"."proxies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "watchlist" ADD CONSTRAINT "watchlist_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "watchlist" ADD CONSTRAINT "watchlist_proxy_id_proxies_id_fk" FOREIGN KEY ("proxy_id") REFERENCES "public"."proxies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_chunks_proxy" ON "content_chunks" USING btree ("proxy_id");--> statement-breakpoint
CREATE INDEX "idx_conversations_user_proxy" ON "conversations" USING btree ("user_id","proxy_id");--> statement-breakpoint
CREATE INDEX "idx_messages_conv" ON "messages" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "idx_proxies_handle" ON "proxies" USING btree ("x_handle");--> statement-breakpoint
CREATE INDEX "idx_proxies_status" ON "proxies" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_proxies_category" ON "proxies" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "idx_watchlist_user" ON "watchlist" USING btree ("user_id");