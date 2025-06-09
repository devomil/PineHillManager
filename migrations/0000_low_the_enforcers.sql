CREATE TABLE "announcements" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar NOT NULL,
	"content" text NOT NULL,
	"author_id" varchar NOT NULL,
	"priority" varchar DEFAULT 'normal',
	"target_audience" varchar DEFAULT 'all',
	"is_published" boolean DEFAULT false,
	"published_at" timestamp,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "channel_members" (
	"id" serial PRIMARY KEY NOT NULL,
	"channel_id" integer NOT NULL,
	"user_id" varchar NOT NULL,
	"role" varchar DEFAULT 'member',
	"joined_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "chat_channels" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar NOT NULL,
	"description" text,
	"type" varchar DEFAULT 'team',
	"is_private" boolean DEFAULT false,
	"created_by" varchar NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "document_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"document_id" integer NOT NULL,
	"user_id" varchar NOT NULL,
	"action" varchar NOT NULL,
	"ip_address" varchar,
	"user_agent" text,
	"timestamp" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "document_permissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"document_id" integer NOT NULL,
	"user_id" varchar,
	"department" varchar,
	"role" varchar,
	"access_level" varchar DEFAULT 'read',
	"granted_by" varchar NOT NULL,
	"granted_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" serial PRIMARY KEY NOT NULL,
	"file_name" varchar NOT NULL,
	"original_name" varchar NOT NULL,
	"file_path" varchar NOT NULL,
	"file_size" integer NOT NULL,
	"mime_type" varchar NOT NULL,
	"category" varchar DEFAULT 'general',
	"description" text,
	"uploaded_by" varchar NOT NULL,
	"is_public" boolean DEFAULT false,
	"is_active" boolean DEFAULT true,
	"uploaded_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "employee_invitations" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" varchar NOT NULL,
	"first_name" varchar NOT NULL,
	"last_name" varchar NOT NULL,
	"role" varchar DEFAULT 'employee' NOT NULL,
	"department" varchar,
	"position" varchar,
	"invite_token" varchar NOT NULL,
	"invited_by" varchar NOT NULL,
	"invited_at" timestamp DEFAULT now(),
	"expires_at" timestamp NOT NULL,
	"accepted_at" timestamp,
	"status" varchar DEFAULT 'pending' NOT NULL,
	"notes" text,
	CONSTRAINT "employee_invitations_email_unique" UNIQUE("email"),
	CONSTRAINT "employee_invitations_invite_token_unique" UNIQUE("invite_token")
);
--> statement-breakpoint
CREATE TABLE "locations" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar NOT NULL,
	"address" varchar NOT NULL,
	"city" varchar NOT NULL,
	"state" varchar NOT NULL,
	"zip_code" varchar NOT NULL,
	"phone" varchar,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "logos" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar NOT NULL,
	"file_name" varchar NOT NULL,
	"original_name" varchar NOT NULL,
	"file_path" varchar NOT NULL,
	"file_size" integer NOT NULL,
	"mime_type" varchar NOT NULL,
	"is_active" boolean DEFAULT true,
	"uploaded_by" varchar NOT NULL,
	"uploaded_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"sender_id" varchar NOT NULL,
	"recipient_id" varchar,
	"subject" varchar,
	"content" text NOT NULL,
	"is_read" boolean DEFAULT false,
	"sent_at" timestamp DEFAULT now(),
	"read_at" timestamp,
	"message_type" varchar DEFAULT 'direct',
	"channel_id" varchar
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"title" varchar NOT NULL,
	"body" text NOT NULL,
	"type" varchar NOT NULL,
	"related_id" integer,
	"is_read" boolean DEFAULT false,
	"sent_at" timestamp DEFAULT now(),
	"read_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "password_reset_tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"token" varchar NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "password_reset_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "push_subscriptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"endpoint" text NOT NULL,
	"p256dh_key" text NOT NULL,
	"auth_key" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"sid" varchar PRIMARY KEY NOT NULL,
	"sess" jsonb NOT NULL,
	"expire" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shift_coverage_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"requester_id" varchar NOT NULL,
	"schedule_id" integer NOT NULL,
	"reason" text,
	"status" varchar DEFAULT 'open' NOT NULL,
	"covered_by" varchar,
	"requested_at" timestamp DEFAULT now(),
	"covered_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "time_clock_entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"location_id" integer,
	"clock_in_time" timestamp NOT NULL,
	"clock_out_time" timestamp,
	"break_start_time" timestamp,
	"break_end_time" timestamp,
	"total_break_minutes" integer DEFAULT 0,
	"total_worked_minutes" integer DEFAULT 0,
	"status" varchar DEFAULT 'clocked_in' NOT NULL,
	"notes" text,
	"ip_address" varchar,
	"device_info" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "time_off_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"reason" text,
	"status" varchar DEFAULT 'pending' NOT NULL,
	"requested_at" timestamp DEFAULT now(),
	"reviewed_at" timestamp,
	"reviewed_by" varchar,
	"comments" text
);
--> statement-breakpoint
CREATE TABLE "training_modules" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar NOT NULL,
	"description" text,
	"content" text,
	"duration" integer,
	"category" varchar,
	"required_for_role" varchar,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "training_progress" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"module_id" integer NOT NULL,
	"status" varchar DEFAULT 'not_started',
	"progress" integer DEFAULT 0,
	"started_at" timestamp,
	"completed_at" timestamp,
	"score" integer
);
--> statement-breakpoint
CREATE TABLE "user_presence" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"status" varchar DEFAULT 'offline' NOT NULL,
	"last_seen" timestamp DEFAULT now(),
	"current_location" varchar,
	"status_message" text,
	"is_working" boolean DEFAULT false,
	"clocked_in_at" timestamp,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "user_presence_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY NOT NULL,
	"employee_id" varchar,
	"email" varchar NOT NULL,
	"password" varchar,
	"first_name" varchar,
	"last_name" varchar,
	"profile_image_url" varchar,
	"role" varchar DEFAULT 'employee' NOT NULL,
	"department" varchar,
	"position" varchar,
	"hire_date" date,
	"time_off_balance" integer DEFAULT 24,
	"is_active" boolean DEFAULT true,
	"phone" varchar,
	"address" varchar,
	"city" varchar,
	"state" varchar,
	"zip_code" varchar,
	"emergency_contact" varchar,
	"emergency_phone" varchar,
	"notes" text,
	"permissions" text[],
	"last_login" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "users_employee_id_unique" UNIQUE("employee_id"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "work_schedules" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"location_id" integer,
	"date" date NOT NULL,
	"start_time" varchar NOT NULL,
	"end_time" varchar NOT NULL,
	"shift_type" varchar DEFAULT 'regular',
	"status" varchar DEFAULT 'scheduled',
	"breaks" text,
	"notes" text,
	"created_by" varchar,
	"approved_by" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "channel_members" ADD CONSTRAINT "channel_members_channel_id_chat_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."chat_channels"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "channel_members" ADD CONSTRAINT "channel_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_channels" ADD CONSTRAINT "chat_channels_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_logs" ADD CONSTRAINT "document_logs_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_logs" ADD CONSTRAINT "document_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_permissions" ADD CONSTRAINT "document_permissions_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_permissions" ADD CONSTRAINT "document_permissions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_permissions" ADD CONSTRAINT "document_permissions_granted_by_users_id_fk" FOREIGN KEY ("granted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_invitations" ADD CONSTRAINT "employee_invitations_invited_by_users_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "logos" ADD CONSTRAINT "logos_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_recipient_id_users_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shift_coverage_requests" ADD CONSTRAINT "shift_coverage_requests_requester_id_users_id_fk" FOREIGN KEY ("requester_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shift_coverage_requests" ADD CONSTRAINT "shift_coverage_requests_schedule_id_work_schedules_id_fk" FOREIGN KEY ("schedule_id") REFERENCES "public"."work_schedules"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shift_coverage_requests" ADD CONSTRAINT "shift_coverage_requests_covered_by_users_id_fk" FOREIGN KEY ("covered_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "time_clock_entries" ADD CONSTRAINT "time_clock_entries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "time_clock_entries" ADD CONSTRAINT "time_clock_entries_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "time_off_requests" ADD CONSTRAINT "time_off_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "time_off_requests" ADD CONSTRAINT "time_off_requests_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "training_progress" ADD CONSTRAINT "training_progress_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "training_progress" ADD CONSTRAINT "training_progress_module_id_training_modules_id_fk" FOREIGN KEY ("module_id") REFERENCES "public"."training_modules"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_presence" ADD CONSTRAINT "user_presence_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_schedules" ADD CONSTRAINT "work_schedules_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_schedules" ADD CONSTRAINT "work_schedules_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_schedules" ADD CONSTRAINT "work_schedules_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_schedules" ADD CONSTRAINT "work_schedules_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_announcements_published_created" ON "announcements" USING btree ("is_published","created_at");--> statement-breakpoint
CREATE INDEX "idx_announcements_priority" ON "announcements" USING btree ("priority");--> statement-breakpoint
CREATE INDEX "idx_announcements_author" ON "announcements" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX "idx_messages_recipient_read" ON "messages" USING btree ("recipient_id","is_read");--> statement-breakpoint
CREATE INDEX "idx_messages_channel" ON "messages" USING btree ("channel_id");--> statement-breakpoint
CREATE INDEX "idx_messages_sent_at" ON "messages" USING btree ("sent_at");--> statement-breakpoint
CREATE INDEX "idx_messages_sender" ON "messages" USING btree ("sender_id");--> statement-breakpoint
CREATE INDEX "idx_password_reset_token" ON "password_reset_tokens" USING btree ("token");--> statement-breakpoint
CREATE INDEX "idx_password_reset_user" ON "password_reset_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "IDX_session_expire" ON "sessions" USING btree ("expire");--> statement-breakpoint
CREATE INDEX "idx_time_clock_user_clockin" ON "time_clock_entries" USING btree ("user_id","clock_in_time");--> statement-breakpoint
CREATE INDEX "idx_time_clock_status" ON "time_clock_entries" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_time_clock_location" ON "time_clock_entries" USING btree ("location_id");--> statement-breakpoint
CREATE INDEX "idx_time_clock_date" ON "time_clock_entries" USING btree ("clock_in_time");--> statement-breakpoint
CREATE INDEX "idx_time_off_user_status" ON "time_off_requests" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "idx_time_off_status" ON "time_off_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_time_off_requested_at" ON "time_off_requests" USING btree ("requested_at");--> statement-breakpoint
CREATE INDEX "idx_users_email" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "idx_users_employee_id" ON "users" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "idx_users_role" ON "users" USING btree ("role");--> statement-breakpoint
CREATE INDEX "idx_work_schedules_user_date" ON "work_schedules" USING btree ("user_id","date");--> statement-breakpoint
CREATE INDEX "idx_work_schedules_location_date" ON "work_schedules" USING btree ("location_id","date");--> statement-breakpoint
CREATE INDEX "idx_work_schedules_status" ON "work_schedules" USING btree ("status");