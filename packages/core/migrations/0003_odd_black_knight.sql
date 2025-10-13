CREATE TABLE "prompt_tag" (
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
CREATE TABLE "tag" (
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
CREATE TABLE "waitlist" (
	"id" char(24) PRIMARY KEY NOT NULL,
	"time_created" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"time_updated" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"time_deleted" timestamp with time zone,
	"email" varchar(255) NOT NULL,
	"source" varchar(50) DEFAULT 'website' NOT NULL,
	"metadata" jsonb
);
--> statement-breakpoint
CREATE UNIQUE INDEX "prompt_tag_unique" ON "prompt_tag" USING btree ("workspace_id","prompt_id","tag_id");--> statement-breakpoint
CREATE INDEX "prompt_tag_workspace_prompt" ON "prompt_tag" USING btree ("workspace_id","prompt_id");--> statement-breakpoint
CREATE INDEX "prompt_tag_workspace_tag" ON "prompt_tag" USING btree ("workspace_id","tag_id");--> statement-breakpoint
CREATE UNIQUE INDEX "tag_workspace_slug" ON "tag" USING btree ("workspace_id","slug");--> statement-breakpoint
CREATE INDEX "tag_workspace_name" ON "tag" USING btree ("workspace_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "waitlist_email" ON "waitlist" USING btree ("email");--> statement-breakpoint
CREATE INDEX "waitlist_time_created" ON "waitlist" USING btree ("time_created");