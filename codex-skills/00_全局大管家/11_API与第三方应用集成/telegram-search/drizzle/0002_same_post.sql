ALTER TABLE "chat_messages" ADD COLUMN "platform_timestamp" bigint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD COLUMN "deleted_at" bigint DEFAULT 0 NOT NULL;