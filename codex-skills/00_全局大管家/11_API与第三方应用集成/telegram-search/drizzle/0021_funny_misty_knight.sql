ALTER TABLE "accounts" ALTER COLUMN "settings" SET DEFAULT '{"embedding":{"model":"text-embedding-3-small","dimension":1536,"apiKey":"","apiBase":""},"llm":{"model":"gpt-4o-mini","apiKey":"","apiBase":"https://api.openai.com/v1","temperature":0.7,"maxTokens":2000},"resolvers":{"disabledResolvers":["avatar"]},"receiveMessages":{"receiveAll":true}}'::jsonb;--> statement-breakpoint
ALTER TABLE "photos" ADD COLUMN "image_thumbnail_bytes" "bytea";--> statement-breakpoint
ALTER TABLE "photos" ADD COLUMN "image_thumbnail_path" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "photos" ADD COLUMN "image_mime_type" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "photos" ADD COLUMN "image_width" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "photos" ADD COLUMN "image_height" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "stickers" ADD COLUMN "sticker_mime_type" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "stickers" ADD COLUMN "sticker_width" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "stickers" ADD COLUMN "sticker_height" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
UPDATE "photos" SET "image_mime_type" = 'image/' WHERE "image_mime_type" = '';
