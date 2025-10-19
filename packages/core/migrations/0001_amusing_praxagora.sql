ALTER TABLE "user_settings" ADD COLUMN "language_hints" jsonb DEFAULT '["en"]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "user_settings" DROP COLUMN "transcription_languages";