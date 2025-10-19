CREATE TABLE IF NOT EXISTS "account" (
	"id" char(24) PRIMARY KEY NOT NULL,
	"time_created" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"time_updated" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"time_deleted" timestamp with time zone,
	"name" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"email_language" varchar(255) DEFAULT 'fi' NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "prompt" (
	"id" char(24) NOT NULL,
	"workspace_id" char(24) NOT NULL,
	"time_created" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"time_updated" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"time_deleted" timestamp with time zone,
	"user_id" char(24) NOT NULL,
	"title" varchar(255) NOT NULL,
	"content" text NOT NULL,
	"source" varchar(32) DEFAULT 'other' NOT NULL,
	"category_path" varchar(255) NOT NULL,
	"visibility" varchar(32) DEFAULT 'private' NOT NULL,
	"is_favorite" boolean DEFAULT false NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	CONSTRAINT "prompt_workspace_id_id_pk" PRIMARY KEY("workspace_id","id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "replicache_client" (
	"id" char(36) PRIMARY KEY NOT NULL,
	"mutation_id" bigint DEFAULT 0 NOT NULL,
	"time_created" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"time_updated" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"time_deleted" timestamp with time zone,
	"client_group_id" char(36) NOT NULL,
	"client_version" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "replicache_client_group" (
	"time_created" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"time_updated" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"time_deleted" timestamp with time zone,
	"id" char(36) NOT NULL,
	"actor" json,
	"cvr_version" integer NOT NULL,
	"client_version" integer NOT NULL,
	CONSTRAINT "replicache_client_group_id_pk" PRIMARY KEY("id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "replicache_cvr" (
	"id" integer NOT NULL,
	"time_created" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"time_updated" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"time_deleted" timestamp with time zone,
	"data" json NOT NULL,
	"client_group_id" char(36) NOT NULL,
	"client_version" integer NOT NULL,
	CONSTRAINT "replicache_cvr_client_group_id_id_pk" PRIMARY KEY("client_group_id","id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "prompt_tag" (
	"id" char(24) NOT NULL,
	"workspace_id" char(24) NOT NULL,
	"time_created" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"time_updated" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"time_deleted" timestamp with time zone,
	"prompt_id" char(24) NOT NULL,
	"tag_id" char(24) NOT NULL,
	CONSTRAINT "prompt_tag_workspace_id_id_pk" PRIMARY KEY("workspace_id","id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tag" (
	"id" char(24) NOT NULL,
	"workspace_id" char(24) NOT NULL,
	"time_created" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"time_updated" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"time_deleted" timestamp with time zone,
	"name" varchar(120) NOT NULL,
	"slug" varchar(120) NOT NULL,
	"description" text,
	CONSTRAINT "tag_workspace_id_id_pk" PRIMARY KEY("workspace_id","id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_settings" (
	"id" char(24) NOT NULL,
	"workspace_id" char(24) NOT NULL,
	"time_created" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"time_updated" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"time_deleted" timestamp with time zone,
	"user_id" char(24) NOT NULL,
	"in_app_onboarding_completed" boolean DEFAULT true NOT NULL,
	"shortcut_capture" varchar(255) DEFAULT 'CmdOrCtrl+Shift+P' NOT NULL,
	"shortcut_palette" varchar(255) DEFAULT 'CmdOrCtrl+Shift+O' NOT NULL,
	"shortcut_transcribe" varchar(255) DEFAULT 'CmdOrCtrl+Shift+F' NOT NULL,
	"enable_auto_capture" boolean DEFAULT true NOT NULL,
	"transcription_languages" jsonb DEFAULT '["en"]'::jsonb NOT NULL,
	"ai_context" text,
	"user_role" varchar(255),
	CONSTRAINT "user_settings_workspace_id_id_pk" PRIMARY KEY("workspace_id","id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user" (
	"id" char(24) NOT NULL,
	"workspace_id" char(24) NOT NULL,
	"time_created" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"time_updated" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"time_deleted" timestamp with time zone,
	"name" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"first" boolean NOT NULL,
	"status" varchar(255) DEFAULT 'active' NOT NULL,
	"role" varchar(255) NOT NULL,
	"time_seen" timestamp with time zone,
	"is_onboarded" boolean DEFAULT true NOT NULL,
	CONSTRAINT "user_workspace_id_id_pk" PRIMARY KEY("workspace_id","id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "waitlist" (
	"id" char(24) PRIMARY KEY NOT NULL,
	"time_created" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"time_updated" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"time_deleted" timestamp with time zone,
	"email" varchar(255) NOT NULL,
	"source" varchar(50) DEFAULT 'website' NOT NULL,
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "workspace" (
	"id" char(24) PRIMARY KEY NOT NULL,
	"time_created" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"time_updated" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"time_deleted" timestamp with time zone,
	"name" varchar(255) NOT NULL,
	"website" varchar(255),
	"slug" varchar(255) NOT NULL,
	"is_pilot_workspace" boolean,
	"type" varchar(255) DEFAULT 'organization' NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "account_name" ON "account" USING btree ("name");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "account_email" ON "account" USING btree ("email");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "prompt_workspace_time" ON "prompt" USING btree ("workspace_id","time_created");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "prompt_workspace_category" ON "prompt" USING btree ("workspace_id","category_path");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "prompt_workspace_user" ON "prompt" USING btree ("workspace_id","user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "replicache_client_group_id" ON "replicache_client" USING btree ("client_group_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS 	"prompt_tag_unique" ON "prompt_tag" USING btree ("workspace_id","prompt_id","tag_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "prompt_tag_workspace_prompt" ON "prompt_tag" USING btree ("workspace_id","prompt_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "prompt_tag_workspace_tag" ON "prompt_tag" USING btree ("workspace_id","tag_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "tag_workspace_slug" ON "tag" USING btree ("workspace_id","slug");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tag_workspace_name" ON "tag" USING btree ("workspace_id","name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_name" ON "user" USING btree ("name");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "user_email" ON "user" USING btree ("workspace_id","email");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_email_global" ON "user" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "waitlist_email" ON "waitlist" USING btree ("email");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "waitlist_time_created" ON "waitlist" USING btree ("time_created");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "workspace_slug" ON "workspace" USING btree ("slug");