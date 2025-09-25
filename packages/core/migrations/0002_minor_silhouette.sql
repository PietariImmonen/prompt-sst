ALTER TABLE "user_settings" ADD COLUMN "shortcut_capture" varchar(255) DEFAULT 'CmdOrCtrl+Shift+P' NOT NULL;--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "shortcut_palette" varchar(255) DEFAULT 'CmdOrCtrl+Shift+O' NOT NULL;--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "enable_auto_capture" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "user_settings" DROP COLUMN "full_sentences";--> statement-breakpoint
ALTER TABLE "user_settings" DROP COLUMN "default_template_id";--> statement-breakpoint
ALTER TABLE "user_settings" DROP COLUMN "language";