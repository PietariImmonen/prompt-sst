CREATE TABLE "prompt" (
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
  CONSTRAINT "prompt_workspace_id_id_pk" PRIMARY KEY("workspace_id", "id")
);
--> statement-breakpoint
CREATE INDEX "prompt_workspace_time" ON "prompt" USING btree ("workspace_id", "time_created");
--> statement-breakpoint
CREATE INDEX "prompt_workspace_category" ON "prompt" USING btree ("workspace_id", "category_path");
--> statement-breakpoint
CREATE INDEX "prompt_workspace_user" ON "prompt" USING btree ("workspace_id", "user_id");
