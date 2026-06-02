-- Migration to add the communication_drafts table
-- Generated from schema.ts communicationDrafts definition

CREATE TABLE IF NOT EXISTS "communication_drafts" (
"id" serial PRIMARY KEY NOT NULL,
"author_id" varchar NOT NULL,
"draft_type" varchar DEFAULT 'announcement',
"title" varchar,
"content" text,
"priority" varchar DEFAULT 'normal',
"target_audience" varchar DEFAULT 'all',
"target_employees" varchar[],
"sms_enabled" boolean DEFAULT true,
"image_urls" text[],
"pdf_urls" jsonb,
"created_at" timestamp DEFAULT now(),
"updated_at" timestamp DEFAULT now()
);

DO $$ BEGIN
 ALTER TABLE "communication_drafts" ADD CONSTRAINT "communication_drafts_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

CREATE INDEX IF NOT EXISTS "idx_comm_drafts_author" ON "communication_drafts" ("author_id");
