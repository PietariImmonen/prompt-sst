CREATE TABLE "account" (
	"id" char(24) PRIMARY KEY NOT NULL,
	"time_created" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"time_updated" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"time_deleted" timestamp with time zone,
	"name" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"email_language" varchar(255) DEFAULT 'fi' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "replicache_client" (
	"id" char(36) PRIMARY KEY NOT NULL,
	"mutation_id" bigint DEFAULT 0 NOT NULL,
	"time_created" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"time_updated" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"time_deleted" timestamp with time zone,
	"client_group_id" char(36) NOT NULL,
	"client_version" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "replicache_client_group" (
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
CREATE TABLE "replicache_cvr" (
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
CREATE TABLE "user_settings" (
	"id" char(24) NOT NULL,
	"workspace_id" char(24) NOT NULL,
	"time_created" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"time_updated" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"time_deleted" timestamp with time zone,
	"user_id" char(24) NOT NULL,
	"full_sentences" boolean DEFAULT true NOT NULL,
	"default_template_id" char(24),
	"language" varchar(255) NOT NULL,
	"in_app_onboarding_completed" boolean DEFAULT true NOT NULL,
	CONSTRAINT "user_settings_workspace_id_id_pk" PRIMARY KEY("workspace_id","id")
);
--> statement-breakpoint
CREATE TABLE "user" (
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
CREATE TABLE "workspace" (
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
CREATE INDEX "account_name" ON "account" USING btree ("name");--> statement-breakpoint
CREATE UNIQUE INDEX "account_email" ON "account" USING btree ("email");--> statement-breakpoint
CREATE INDEX "replicache_client_group_id" ON "replicache_client" USING btree ("client_group_id");--> statement-breakpoint
CREATE INDEX "user_name" ON "user" USING btree ("name");--> statement-breakpoint
CREATE UNIQUE INDEX "user_email" ON "user" USING btree ("workspace_id","email");--> statement-breakpoint
CREATE INDEX "user_email_global" ON "user" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "workspace_slug" ON "workspace" USING btree ("slug");