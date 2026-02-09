CREATE TABLE "bot_state" (
	"key" varchar(100) PRIMARY KEY NOT NULL,
	"value" text NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ratings" ADD COLUMN "review_text" text;--> statement-breakpoint
CREATE INDEX "idx_ratings_proxy" ON "ratings" USING btree ("proxy_id");