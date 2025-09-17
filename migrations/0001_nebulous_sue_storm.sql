CREATE TABLE "amazon_config" (
	"id" serial PRIMARY KEY NOT NULL,
	"seller_id" varchar NOT NULL,
	"marketplace_id" varchar,
	"merchant_name" varchar,
	"refresh_token" text,
	"client_id" text,
	"client_secret" text,
	"access_token" text,
	"base_url" varchar DEFAULT 'https://sellingpartnerapi-na.amazon.com',
	"is_active" boolean DEFAULT true,
	"last_sync_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "amazon_config_seller_id_unique" UNIQUE("seller_id")
);
--> statement-breakpoint
CREATE TABLE "announcement_reactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"announcement_id" integer NOT NULL,
	"user_id" varchar NOT NULL,
	"reaction_type" varchar NOT NULL,
	"is_from_sms" boolean DEFAULT false,
	"sms_message_sid" varchar,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "unique_announcement_reaction_per_user" UNIQUE("announcement_id","user_id","reaction_type")
);
--> statement-breakpoint
CREATE TABLE "announcement_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar NOT NULL,
	"description" text,
	"category" varchar NOT NULL,
	"emoji" varchar,
	"priority_emoji" varchar,
	"category_emoji" varchar,
	"title" varchar NOT NULL,
	"content" text NOT NULL,
	"priority" varchar DEFAULT 'normal',
	"target_audience" varchar DEFAULT 'all',
	"target_employees" varchar[],
	"sms_enabled" boolean DEFAULT false,
	"is_active" boolean DEFAULT true,
	"use_count" integer DEFAULT 0,
	"created_by" varchar NOT NULL,
	"last_used_at" timestamp,
	"tags" text[],
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "automation_rules" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true,
	"rule_type" varchar NOT NULL,
	"cron_expression" varchar,
	"timezone" varchar DEFAULT 'America/Chicago',
	"template_id" integer,
	"title" varchar,
	"content" text,
	"priority" varchar,
	"target_audience" varchar,
	"sms_enabled" boolean,
	"conditions" jsonb,
	"created_by" varchar NOT NULL,
	"last_triggered" timestamp,
	"next_run" timestamp,
	"run_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "calendar_notes" (
	"id" serial PRIMARY KEY NOT NULL,
	"date" date NOT NULL,
	"location_id" integer,
	"title" varchar NOT NULL,
	"content" text,
	"note_type" varchar DEFAULT 'general',
	"is_active" boolean DEFAULT true,
	"created_by" varchar NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "channel_message_reactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"message_id" integer NOT NULL,
	"user_id" varchar NOT NULL,
	"reaction_type" varchar NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "unique_channel_reaction_per_user" UNIQUE("message_id","user_id","reaction_type")
);
--> statement-breakpoint
CREATE TABLE "channel_message_read_receipts" (
	"id" serial PRIMARY KEY NOT NULL,
	"message_id" integer NOT NULL,
	"user_id" varchar NOT NULL,
	"read_at" timestamp DEFAULT now(),
	CONSTRAINT "unique_channel_receipt_per_user" UNIQUE("message_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "channel_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"channel_id" integer NOT NULL,
	"sender_id" varchar NOT NULL,
	"content" text NOT NULL,
	"message_type" varchar DEFAULT 'message',
	"priority" varchar DEFAULT 'normal',
	"sms_enabled" boolean DEFAULT false,
	"parent_message_id" integer,
	"is_edited" boolean DEFAULT false,
	"edited_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "clover_config" (
	"id" serial PRIMARY KEY NOT NULL,
	"merchant_id" varchar NOT NULL,
	"merchant_name" varchar,
	"api_token" text,
	"base_url" varchar,
	"is_active" boolean DEFAULT true,
	"last_sync_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "clover_config_merchant_id_unique" UNIQUE("merchant_id")
);
--> statement-breakpoint
CREATE TABLE "communication_analytics" (
	"id" serial PRIMARY KEY NOT NULL,
	"date" date NOT NULL,
	"total_messages" integer DEFAULT 0,
	"total_announcements" integer DEFAULT 0,
	"total_sms" integer DEFAULT 0,
	"total_direct_messages" integer DEFAULT 0,
	"total_channel_messages" integer DEFAULT 0,
	"sms_delivered" integer DEFAULT 0,
	"sms_failed" integer DEFAULT 0,
	"sms_delivery_rate" numeric(5, 2) DEFAULT '0.00',
	"total_reactions" integer DEFAULT 0,
	"total_responses" integer DEFAULT 0,
	"total_read_receipts" integer DEFAULT 0,
	"average_response_time" integer DEFAULT 0,
	"engagement_rate" numeric(5, 2) DEFAULT '0.00',
	"active_users" integer DEFAULT 0,
	"new_users" integer DEFAULT 0,
	"sms_opted_in_users" integer DEFAULT 0,
	"sms_cost" integer DEFAULT 0,
	"average_sms_cost" numeric(10, 4) DEFAULT '0.0000',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "unique_communication_analytics_date" UNIQUE("date")
);
--> statement-breakpoint
CREATE TABLE "communication_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"event_type" varchar NOT NULL,
	"user_id" varchar,
	"message_id" integer,
	"announcement_id" integer,
	"channel_message_id" integer,
	"event_data" jsonb,
	"source" varchar DEFAULT 'app',
	"platform" varchar,
	"cost" integer DEFAULT 0,
	"event_timestamp" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "customers_vendors" (
	"id" serial PRIMARY KEY NOT NULL,
	"qb_id" varchar,
	"name" varchar NOT NULL,
	"type" varchar NOT NULL,
	"company_name" varchar,
	"email" varchar,
	"phone" varchar,
	"address" text,
	"city" varchar,
	"state" varchar,
	"zip_code" varchar,
	"balance" numeric(15, 2) DEFAULT '0.00',
	"is_active" boolean DEFAULT true,
	"last_sync_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "customers_vendors_qb_id_unique" UNIQUE("qb_id")
);
--> statement-breakpoint
CREATE TABLE "daily_sales" (
	"id" serial PRIMARY KEY NOT NULL,
	"merchant_id" integer NOT NULL,
	"location_id" integer,
	"channel" varchar NOT NULL,
	"date" date NOT NULL,
	"order_count" integer DEFAULT 0,
	"item_count" integer DEFAULT 0,
	"customer_count" integer DEFAULT 0,
	"gross_sales" numeric(12, 2) DEFAULT '0.00',
	"discounts" numeric(12, 2) DEFAULT '0.00',
	"net_sales" numeric(12, 2) DEFAULT '0.00',
	"tax_amount" numeric(12, 2) DEFAULT '0.00',
	"tip_amount" numeric(12, 2) DEFAULT '0.00',
	"total_revenue" numeric(12, 2) DEFAULT '0.00',
	"total_cogs" numeric(12, 2) DEFAULT '0.00',
	"gross_margin" numeric(12, 2) DEFAULT '0.00',
	"gross_margin_percent" numeric(5, 2),
	"refund_count" integer DEFAULT 0,
	"refund_amount" numeric(12, 2) DEFAULT '0.00',
	"payments_breakdown" jsonb,
	"avg_order_value" numeric(10, 2),
	"avg_items_per_order" numeric(8, 2),
	"peak_hour" integer,
	"peak_hour_revenue" numeric(12, 2),
	"top_categories" jsonb,
	"last_updated_at" timestamp DEFAULT now(),
	"data_completeness" numeric(5, 2) DEFAULT '100.00',
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "unique_daily_sales_record" UNIQUE("merchant_id","location_id","channel","date")
);
--> statement-breakpoint
CREATE TABLE "dashboard_widgets" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar,
	"widget_type" varchar NOT NULL,
	"widget_config" jsonb,
	"position" integer DEFAULT 1,
	"size" varchar DEFAULT 'medium',
	"is_visible" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "discounts" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" integer,
	"line_item_id" integer,
	"discount_name" varchar NOT NULL,
	"discount_type" varchar NOT NULL,
	"discount_value" numeric(10, 4),
	"discount_amount" numeric(10, 2) NOT NULL,
	"discount_code" varchar,
	"discount_reason" varchar,
	"minimum_amount" numeric(10, 2),
	"maximum_amount" numeric(10, 2),
	"applied_by" varchar,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "financial_accounts" (
	"id" serial PRIMARY KEY NOT NULL,
	"qb_account_id" varchar,
	"account_number" varchar,
	"account_name" varchar NOT NULL,
	"account_type" varchar NOT NULL,
	"sub_type" varchar,
	"description" text,
	"balance" numeric(15, 2) DEFAULT '0.00',
	"is_active" boolean DEFAULT true,
	"parent_account_id" integer,
	"last_sync_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "financial_accounts_qb_account_id_unique" UNIQUE("qb_account_id")
);
--> statement-breakpoint
CREATE TABLE "financial_transaction_lines" (
	"id" serial PRIMARY KEY NOT NULL,
	"transaction_id" integer NOT NULL,
	"account_id" integer NOT NULL,
	"description" text,
	"debit_amount" numeric(15, 2) DEFAULT '0.00',
	"credit_amount" numeric(15, 2) DEFAULT '0.00',
	"line_number" integer DEFAULT 1,
	"customer_vendor_id" varchar,
	"item_id" varchar,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "financial_transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"qb_transaction_id" varchar,
	"transaction_number" varchar,
	"transaction_date" date NOT NULL,
	"transaction_type" varchar NOT NULL,
	"description" text,
	"reference_number" varchar,
	"total_amount" numeric(15, 2) NOT NULL,
	"source_system" varchar NOT NULL,
	"source_id" varchar,
	"status" varchar DEFAULT 'pending',
	"created_by" varchar,
	"last_sync_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "financial_transactions_qb_transaction_id_unique" UNIQUE("qb_transaction_id")
);
--> statement-breakpoint
CREATE TABLE "hsa_config" (
	"id" serial PRIMARY KEY NOT NULL,
	"system_name" varchar NOT NULL,
	"api_endpoint" varchar,
	"api_key" text,
	"account_number" varchar,
	"is_active" boolean DEFAULT true,
	"last_sync_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "hsa_expenses" (
	"id" serial PRIMARY KEY NOT NULL,
	"hsa_system_id" varchar,
	"employee_id" varchar,
	"expense_date" date NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"category" varchar NOT NULL,
	"description" text,
	"receipt_url" varchar,
	"is_eligible" boolean DEFAULT true,
	"status" varchar DEFAULT 'pending',
	"approved_by" varchar,
	"approved_at" timestamp,
	"qb_posted" boolean DEFAULT false,
	"qb_transaction_id" varchar,
	"last_sync_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "hsa_expenses_hsa_system_id_unique" UNIQUE("hsa_system_id")
);
--> statement-breakpoint
CREATE TABLE "integration_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"system" varchar NOT NULL,
	"operation" varchar NOT NULL,
	"record_type" varchar,
	"record_id" varchar,
	"status" varchar NOT NULL,
	"message" text,
	"error_details" jsonb,
	"processing_time_ms" integer,
	"timestamp" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "inventory_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"qb_item_id" varchar,
	"thrive_item_id" varchar,
	"sku" varchar,
	"item_name" varchar NOT NULL,
	"description" text,
	"category" varchar,
	"unit_of_measure" varchar,
	"unit_cost" numeric(10, 2) DEFAULT '0.00',
	"standard_cost" numeric(10, 2) DEFAULT '0.00',
	"unit_price" numeric(10, 2) DEFAULT '0.00',
	"quantity_on_hand" numeric(10, 3) DEFAULT '0.000',
	"reorder_point" numeric(10, 3) DEFAULT '0.000',
	"is_active" boolean DEFAULT true,
	"last_sync_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "inventory_items_qb_item_id_unique" UNIQUE("qb_item_id"),
	CONSTRAINT "inventory_items_thrive_item_id_unique" UNIQUE("thrive_item_id")
);
--> statement-breakpoint
CREATE TABLE "item_cost_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"item_id" integer NOT NULL,
	"merchant_id" integer NOT NULL,
	"unit_cost" numeric(10, 2) NOT NULL,
	"cost_method" varchar DEFAULT 'avg' NOT NULL,
	"effective_from" timestamp NOT NULL,
	"effective_to" timestamp,
	"quantity_received" numeric(10, 3),
	"source_document" varchar,
	"source_document_id" varchar,
	"created_by" varchar,
	"reason" text,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "unique_item_effective_range" UNIQUE("item_id","effective_from")
);
--> statement-breakpoint
CREATE TABLE "items" (
	"id" serial PRIMARY KEY NOT NULL,
	"merchant_id" integer NOT NULL,
	"external_item_id" varchar NOT NULL,
	"channel" varchar NOT NULL,
	"sku" varchar,
	"name" varchar NOT NULL,
	"description" text,
	"category" varchar,
	"subcategory" varchar,
	"brand" varchar,
	"unit_price" numeric(10, 2) DEFAULT '0.00',
	"unit_cost" numeric(10, 2) DEFAULT '0.00',
	"msrp" numeric(10, 2),
	"quantity_on_hand" numeric(10, 3) DEFAULT '0.000',
	"reorder_point" numeric(10, 3) DEFAULT '0.000',
	"weight" numeric(8, 3),
	"dimensions" jsonb,
	"taxable" boolean DEFAULT true,
	"tax_category" varchar,
	"price_type" varchar DEFAULT 'fixed',
	"is_active" boolean DEFAULT true,
	"is_deleted" boolean DEFAULT false,
	"item_type" varchar DEFAULT 'product',
	"metadata" jsonb,
	"last_sync_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "unique_merchant_channel_item" UNIQUE("merchant_id","channel","external_item_id")
);
--> statement-breakpoint
CREATE TABLE "merchants" (
	"id" serial PRIMARY KEY NOT NULL,
	"merchant_id" varchar NOT NULL,
	"name" varchar NOT NULL,
	"legal_name" varchar,
	"channel" varchar NOT NULL,
	"contact_email" varchar,
	"contact_phone" varchar,
	"address" text,
	"city" varchar,
	"state" varchar,
	"zip_code" varchar,
	"country" varchar DEFAULT 'US',
	"timezone" varchar DEFAULT 'America/Chicago',
	"currency" varchar DEFAULT 'USD',
	"is_active" boolean DEFAULT true,
	"settings" jsonb,
	"last_sync_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "unique_merchant_channel" UNIQUE("merchant_id","channel")
);
--> statement-breakpoint
CREATE TABLE "message_reactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"message_id" integer NOT NULL,
	"user_id" varchar NOT NULL,
	"reaction_type" varchar NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "unique_reaction_per_user" UNIQUE("message_id","user_id","reaction_type")
);
--> statement-breakpoint
CREATE TABLE "message_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar NOT NULL,
	"category" varchar NOT NULL,
	"subject" varchar,
	"content" text NOT NULL,
	"priority" varchar DEFAULT 'normal',
	"target_audience" varchar,
	"is_active" boolean DEFAULT true,
	"created_by" varchar NOT NULL,
	"use_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "monthly_account_balances" (
	"id" serial PRIMARY KEY NOT NULL,
	"monthly_closing_id" integer NOT NULL,
	"account_id" integer NOT NULL,
	"year" integer NOT NULL,
	"month" integer NOT NULL,
	"opening_balance" numeric(15, 2) DEFAULT '0.00' NOT NULL,
	"closing_balance" numeric(15, 2) DEFAULT '0.00' NOT NULL,
	"total_debits" numeric(15, 2) DEFAULT '0.00' NOT NULL,
	"total_credits" numeric(15, 2) DEFAULT '0.00' NOT NULL,
	"transaction_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "idx_mab_account_year_month" UNIQUE("account_id","year","month")
);
--> statement-breakpoint
CREATE TABLE "monthly_closings" (
	"id" serial PRIMARY KEY NOT NULL,
	"year" integer NOT NULL,
	"month" integer NOT NULL,
	"closing_date" timestamp DEFAULT now() NOT NULL,
	"closed_by" varchar NOT NULL,
	"total_revenue" numeric(15, 2) DEFAULT '0.00' NOT NULL,
	"total_expenses" numeric(15, 2) DEFAULT '0.00' NOT NULL,
	"net_income" numeric(15, 2) DEFAULT '0.00' NOT NULL,
	"transaction_count" integer DEFAULT 0 NOT NULL,
	"account_balance_snapshot" jsonb,
	"notes" text,
	"status" varchar DEFAULT 'closed' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "idx_mc_year_month" UNIQUE("year","month")
);
--> statement-breakpoint
CREATE TABLE "monthly_reset_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"year" integer NOT NULL,
	"month" integer NOT NULL,
	"reset_date" timestamp DEFAULT now() NOT NULL,
	"reset_by" varchar NOT NULL,
	"previous_closing_id" integer,
	"reset_type" varchar DEFAULT 'manual' NOT NULL,
	"transactions_archived" integer DEFAULT 0 NOT NULL,
	"new_starting_balances" jsonb,
	"reason" text,
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "monthly_transaction_summaries" (
	"id" serial PRIMARY KEY NOT NULL,
	"monthly_closing_id" integer NOT NULL,
	"account_id" integer NOT NULL,
	"year" integer NOT NULL,
	"month" integer NOT NULL,
	"source_system" varchar NOT NULL,
	"transaction_count" integer DEFAULT 0 NOT NULL,
	"total_amount" numeric(15, 2) DEFAULT '0.00' NOT NULL,
	"total_debits" numeric(15, 2) DEFAULT '0.00' NOT NULL,
	"total_credits" numeric(15, 2) DEFAULT '0.00' NOT NULL,
	"average_amount" numeric(15, 2) DEFAULT '0.00' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "idx_mts_account_source_year_month" UNIQUE("account_id","source_system","year","month")
);
--> statement-breakpoint
CREATE TABLE "order_line_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" integer NOT NULL,
	"item_id" integer,
	"external_line_item_id" varchar,
	"item_name" varchar NOT NULL,
	"item_sku" varchar,
	"item_category" varchar,
	"quantity" numeric(10, 3) NOT NULL,
	"unit_price" numeric(10, 2) NOT NULL,
	"unit_cost_at_sale" numeric(10, 2),
	"line_subtotal" numeric(10, 2) NOT NULL,
	"line_cogs" numeric(10, 2) DEFAULT '0.00',
	"line_margin" numeric(10, 2) DEFAULT '0.00',
	"discount_amount" numeric(10, 2) DEFAULT '0.00',
	"discount_percentage" numeric(5, 2),
	"tax_amount" numeric(10, 2) DEFAULT '0.00',
	"tax_rate" numeric(5, 4),
	"taxable" boolean DEFAULT true,
	"notes" text,
	"line_number" integer DEFAULT 1,
	"is_refunded" boolean DEFAULT false,
	"refund_quantity" numeric(10, 3) DEFAULT '0.000',
	"modifiers" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "unique_external_line_item" UNIQUE("external_line_item_id")
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"merchant_id" integer NOT NULL,
	"location_id" integer,
	"external_order_id" varchar NOT NULL,
	"channel" varchar NOT NULL,
	"order_number" varchar,
	"customer_reference" varchar,
	"created_time" timestamp NOT NULL,
	"modified_time" timestamp,
	"order_date" date NOT NULL,
	"order_state" varchar NOT NULL,
	"payment_state" varchar,
	"fulfillment_status" varchar,
	"customer_id" varchar,
	"customer_name" varchar,
	"customer_email" varchar,
	"customer_phone" varchar,
	"subtotal" numeric(12, 2) DEFAULT '0.00',
	"tax_amount" numeric(12, 2) DEFAULT '0.00',
	"tip_amount" numeric(12, 2) DEFAULT '0.00',
	"discount_amount" numeric(12, 2) DEFAULT '0.00',
	"shipping_amount" numeric(12, 2) DEFAULT '0.00',
	"total" numeric(12, 2) NOT NULL,
	"order_cogs" numeric(12, 2) DEFAULT '0.00',
	"order_gross_margin" numeric(12, 2) DEFAULT '0.00',
	"order_type" varchar DEFAULT 'sale',
	"order_source" varchar,
	"device_id" varchar,
	"employee_id" varchar,
	"shipping_address" jsonb,
	"billing_address" jsonb,
	"notes" text,
	"tags" text[],
	"metadata" jsonb,
	"last_sync_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "unique_merchant_order_channel" UNIQUE("merchant_id","external_order_id","channel")
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" integer NOT NULL,
	"external_payment_id" varchar,
	"payment_method" varchar NOT NULL,
	"payment_type" varchar,
	"amount" numeric(12, 2) NOT NULL,
	"tip_amount" numeric(12, 2) DEFAULT '0.00',
	"tax_amount" numeric(12, 2) DEFAULT '0.00',
	"cashback_amount" numeric(12, 2) DEFAULT '0.00',
	"payment_status" varchar DEFAULT 'pending' NOT NULL,
	"result" varchar,
	"card_type" varchar,
	"card_last_4" varchar,
	"card_first_6" varchar,
	"card_entry_type" varchar,
	"transaction_id" varchar,
	"auth_code" varchar,
	"gateway_response_code" varchar,
	"gateway_response_message" text,
	"processed_at" timestamp,
	"created_time" timestamp NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "unique_external_payment" UNIQUE("external_payment_id")
);
--> statement-breakpoint
CREATE TABLE "payroll_entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"payroll_period_id" integer NOT NULL,
	"user_id" varchar NOT NULL,
	"location_id" integer,
	"regular_hours" numeric(8, 2) DEFAULT '0.00',
	"overtime_hours" numeric(8, 2) DEFAULT '0.00',
	"double_time_hours" numeric(8, 2) DEFAULT '0.00',
	"total_hours" numeric(8, 2) DEFAULT '0.00',
	"regular_rate" numeric(8, 2) NOT NULL,
	"overtime_rate" numeric(8, 2) NOT NULL,
	"double_time_rate" numeric(8, 2) NOT NULL,
	"regular_pay" numeric(10, 2) DEFAULT '0.00',
	"overtime_pay" numeric(10, 2) DEFAULT '0.00',
	"double_time_pay" numeric(10, 2) DEFAULT '0.00',
	"gross_pay" numeric(10, 2) DEFAULT '0.00',
	"federal_tax" numeric(10, 2) DEFAULT '0.00',
	"state_tax" numeric(10, 2) DEFAULT '0.00',
	"social_security_tax" numeric(10, 2) DEFAULT '0.00',
	"medicare_tax" numeric(10, 2) DEFAULT '0.00',
	"unemployment_tax" numeric(10, 2) DEFAULT '0.00',
	"total_taxes" numeric(10, 2) DEFAULT '0.00',
	"health_insurance" numeric(10, 2) DEFAULT '0.00',
	"dental_insurance" numeric(10, 2) DEFAULT '0.00',
	"vision_insurance" numeric(10, 2) DEFAULT '0.00',
	"retirement_401k" numeric(10, 2) DEFAULT '0.00',
	"other_deductions" numeric(10, 2) DEFAULT '0.00',
	"total_deductions" numeric(10, 2) DEFAULT '0.00',
	"net_pay" numeric(10, 2) DEFAULT '0.00',
	"time_entry_ids" text[],
	"adjustments" jsonb,
	"notes" text,
	"is_approved" boolean DEFAULT false,
	"approved_by" varchar,
	"approved_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "payroll_journal_entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"payroll_period_id" integer NOT NULL,
	"transaction_id" integer,
	"entry_type" varchar NOT NULL,
	"account" varchar NOT NULL,
	"debit_amount" numeric(12, 2) DEFAULT '0.00',
	"credit_amount" numeric(12, 2) DEFAULT '0.00',
	"description" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "payroll_periods" (
	"id" serial PRIMARY KEY NOT NULL,
	"period_type" varchar NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"pay_date" date NOT NULL,
	"status" varchar DEFAULT 'draft' NOT NULL,
	"total_gross_pay" numeric(10, 2) DEFAULT '0.00',
	"total_net_pay" numeric(10, 2) DEFAULT '0.00',
	"total_deductions" numeric(10, 2) DEFAULT '0.00',
	"total_taxes" numeric(10, 2) DEFAULT '0.00',
	"notes" text,
	"processed_by" varchar,
	"processed_at" timestamp,
	"created_by" varchar NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "payroll_time_entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"payroll_entry_id" integer NOT NULL,
	"time_clock_entry_id" integer NOT NULL,
	"hours_worked" numeric(8, 2) NOT NULL,
	"hourly_rate" numeric(8, 2) NOT NULL,
	"pay_amount" numeric(10, 2) NOT NULL,
	"pay_type" varchar NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "pos_locations" (
	"id" serial PRIMARY KEY NOT NULL,
	"merchant_id" integer NOT NULL,
	"channel" varchar NOT NULL,
	"external_location_id" varchar NOT NULL,
	"name" varchar NOT NULL,
	"address" text,
	"city" varchar,
	"state" varchar,
	"zip_code" varchar,
	"country" varchar DEFAULT 'US',
	"timezone" varchar DEFAULT 'America/Chicago',
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "unique_external_location_channel" UNIQUE("external_location_id","channel")
);
--> statement-breakpoint
CREATE TABLE "pos_sale_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"sale_id" integer NOT NULL,
	"inventory_item_id" integer,
	"item_name" varchar NOT NULL,
	"quantity" numeric(10, 3) NOT NULL,
	"unit_price" numeric(10, 2) NOT NULL,
	"line_total" numeric(10, 2) NOT NULL,
	"cost_basis" numeric(10, 2),
	"discount_amount" numeric(10, 2) DEFAULT '0.00',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "pos_sales" (
	"id" serial PRIMARY KEY NOT NULL,
	"clover_order_id" varchar,
	"amazon_order_id" varchar,
	"sale_date" date NOT NULL,
	"sale_time" timestamp NOT NULL,
	"total_amount" numeric(10, 2) NOT NULL,
	"tax_amount" numeric(10, 2) DEFAULT '0.00',
	"tip_amount" numeric(10, 2) DEFAULT '0.00',
	"payment_method" varchar,
	"card_type" varchar,
	"location_id" integer,
	"employee_id" varchar,
	"customer_count" integer DEFAULT 1,
	"status" varchar DEFAULT 'completed',
	"qb_posted" boolean DEFAULT false,
	"qb_transaction_id" varchar,
	"last_sync_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "pos_sales_clover_order_id_unique" UNIQUE("clover_order_id"),
	CONSTRAINT "pos_sales_amazon_order_id_unique" UNIQUE("amazon_order_id")
);
--> statement-breakpoint
CREATE TABLE "product_videos" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_name" varchar(255) NOT NULL,
	"product_description" text,
	"category" varchar(100),
	"created_by" varchar(255) NOT NULL,
	"video_config" jsonb NOT NULL,
	"render_status" varchar(50) DEFAULT 'pending',
	"render_progress" integer DEFAULT 0,
	"video_url" text,
	"thumbnail_url" text,
	"duration" integer,
	"file_size" integer,
	"download_count" integer DEFAULT 0,
	"last_downloaded" timestamp,
	"render_started_at" timestamp,
	"render_completed_at" timestamp,
	"error_message" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "qr_codes" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(255) NOT NULL,
	"url" text NOT NULL,
	"description" text,
	"category" varchar(100),
	"created_by" varchar(255) NOT NULL,
	"qr_code_data" text NOT NULL,
	"download_count" integer DEFAULT 0,
	"last_downloaded" timestamp,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "quickbooks_config" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" varchar NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"token_expires_at" timestamp,
	"realm_id" varchar,
	"base_url" varchar,
	"is_active" boolean DEFAULT true,
	"last_sync_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "quickbooks_config_company_id_unique" UNIQUE("company_id")
);
--> statement-breakpoint
CREATE TABLE "read_receipts" (
	"id" serial PRIMARY KEY NOT NULL,
	"message_id" integer NOT NULL,
	"user_id" varchar NOT NULL,
	"read_at" timestamp DEFAULT now(),
	"delivered_at" timestamp,
	"sms_delivery_status" varchar,
	"sms_delivery_id" varchar,
	CONSTRAINT "unique_receipt_per_user" UNIQUE("message_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "refunds" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" integer NOT NULL,
	"original_payment_id" integer,
	"external_refund_id" varchar,
	"refund_amount" numeric(12, 2) NOT NULL,
	"refund_reason" varchar,
	"refund_type" varchar NOT NULL,
	"refund_method" varchar,
	"refund_status" varchar DEFAULT 'pending' NOT NULL,
	"processed_by" varchar,
	"processed_at" timestamp,
	"refund_date" date NOT NULL,
	"created_time" timestamp NOT NULL,
	"notes" text,
	"customer_notified" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "unique_external_refund" UNIQUE("external_refund_id")
);
--> statement-breakpoint
CREATE TABLE "report_configs" (
	"id" serial PRIMARY KEY NOT NULL,
	"report_name" varchar NOT NULL,
	"report_type" varchar NOT NULL,
	"parameters" jsonb,
	"created_by" varchar,
	"is_public" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "responses" (
	"id" serial PRIMARY KEY NOT NULL,
	"author_id" varchar NOT NULL,
	"content" text NOT NULL,
	"announcement_id" integer,
	"message_id" integer,
	"parent_response_id" integer,
	"response_type" varchar DEFAULT 'reply' NOT NULL,
	"is_from_sms" boolean DEFAULT false,
	"sms_message_sid" varchar,
	"is_read" boolean DEFAULT false,
	"read_at" timestamp,
	"is_hidden" boolean DEFAULT false,
	"hidden_by" varchar,
	"hidden_reason" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "scheduled_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"author_id" varchar NOT NULL,
	"title" varchar NOT NULL,
	"content" text NOT NULL,
	"message_type" varchar DEFAULT 'announcement',
	"priority" varchar DEFAULT 'normal',
	"target_audience" varchar DEFAULT 'all',
	"target_employees" varchar[],
	"sms_enabled" boolean DEFAULT false,
	"scheduled_for" timestamp NOT NULL,
	"status" varchar DEFAULT 'scheduled',
	"expires_at" timestamp,
	"automation_rule_id" integer,
	"sent_at" timestamp,
	"failure_reason" text,
	"retry_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "shift_swap_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"original_schedule_id" integer NOT NULL,
	"requester_id" varchar NOT NULL,
	"taker_id" varchar,
	"status" varchar DEFAULT 'open',
	"reason" text,
	"offer_message" text,
	"response_message" text,
	"urgency_level" varchar DEFAULT 'normal',
	"incentive" text,
	"approved_by" varchar,
	"approved_at" timestamp,
	"completed_at" timestamp,
	"expires_at" timestamp,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "sms_consent_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"consent_given" boolean NOT NULL,
	"previous_consent" boolean,
	"notification_types" text[],
	"previous_notification_types" text[],
	"change_reason" varchar,
	"changed_by" varchar,
	"change_method" varchar,
	"ip_address" varchar,
	"user_agent" text,
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "sms_deliveries" (
	"id" serial PRIMARY KEY NOT NULL,
	"message_id" integer,
	"user_id" varchar NOT NULL,
	"twilio_message_id" varchar NOT NULL,
	"phone_number" varchar NOT NULL,
	"status" varchar DEFAULT 'queued' NOT NULL,
	"error_code" varchar,
	"error_message" text,
	"sent_at" timestamp DEFAULT now(),
	"delivered_at" timestamp,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "sync_cursors" (
	"id" serial PRIMARY KEY NOT NULL,
	"system" varchar NOT NULL,
	"merchant_id" integer,
	"data_type" varchar NOT NULL,
	"last_modified_ms" varchar,
	"last_sync_at" timestamp,
	"last_run_at" timestamp,
	"backfill_state" varchar DEFAULT 'none',
	"backfill_start_date" timestamp,
	"backfill_end_date" timestamp,
	"backfill_progress" numeric(5, 2) DEFAULT '0.00',
	"last_error" text,
	"error_count" integer DEFAULT 0,
	"last_success_at" timestamp,
	"is_active" boolean DEFAULT true,
	"sync_frequency" integer DEFAULT 300,
	"batch_size" integer DEFAULT 100,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "unique_system_merchant_data_type" UNIQUE("system","merchant_id","data_type")
);
--> statement-breakpoint
CREATE TABLE "taxes" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" integer,
	"line_item_id" integer,
	"tax_name" varchar NOT NULL,
	"tax_type" varchar NOT NULL,
	"tax_rate" numeric(5, 4) NOT NULL,
	"tax_amount" numeric(10, 2) NOT NULL,
	"taxable_amount" numeric(10, 2) NOT NULL,
	"tax_jurisdiction" varchar,
	"tax_authority_name" varchar,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "tenders" (
	"id" serial PRIMARY KEY NOT NULL,
	"payment_id" integer NOT NULL,
	"tender_type" varchar NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"card_type" varchar,
	"card_last_4" varchar,
	"card_first_6" varchar,
	"gift_card_number" varchar,
	"gift_card_balance" numeric(12, 2),
	"check_number" varchar,
	"cash_received" numeric(12, 2),
	"change_given" numeric(12, 2),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "thrive_config" (
	"id" serial PRIMARY KEY NOT NULL,
	"store_id" varchar NOT NULL,
	"api_token" text,
	"base_url" varchar,
	"is_active" boolean DEFAULT true,
	"last_sync_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "thrive_config_store_id_unique" UNIQUE("store_id")
);
--> statement-breakpoint
CREATE TABLE "user_communication_stats" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"preferred_channel" varchar DEFAULT 'app',
	"message_frequency" varchar DEFAULT 'normal',
	"messages_received" integer DEFAULT 0,
	"messages_sent" integer DEFAULT 0,
	"announcements_viewed" integer DEFAULT 0,
	"reactions_given" integer DEFAULT 0,
	"responses_created" integer DEFAULT 0,
	"average_response_time" integer DEFAULT 0,
	"read_receipt_rate" numeric(5, 2) DEFAULT '0.00',
	"engagement_score" numeric(5, 2) DEFAULT '0.00',
	"sms_received" integer DEFAULT 0,
	"sms_cost_incurred" integer DEFAULT 0,
	"last_calculated" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "unique_user_communication_stats" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "video_assets" (
	"id" serial PRIMARY KEY NOT NULL,
	"video_id" integer NOT NULL,
	"asset_type" varchar(50) NOT NULL,
	"file_name" varchar(255) NOT NULL,
	"file_path" text NOT NULL,
	"file_size" integer,
	"mime_type" varchar(100),
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "video_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"category" varchar(100) NOT NULL,
	"description" text,
	"config" jsonb NOT NULL,
	"preview_url" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "voice_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"message_id" integer NOT NULL,
	"file_path" varchar NOT NULL,
	"file_name" varchar NOT NULL,
	"file_size" integer NOT NULL,
	"duration" integer,
	"transcription" text,
	"mime_type" varchar DEFAULT 'audio/webm',
	"uploaded_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "time_clock_entries" DROP CONSTRAINT "time_clock_entries_location_id_locations_id_fk";
--> statement-breakpoint
ALTER TABLE "announcements" ADD COLUMN "target_employees" varchar[];--> statement-breakpoint
ALTER TABLE "chat_channels" ADD COLUMN "is_active" boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "priority" varchar DEFAULT 'normal';--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "target_audience" varchar;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "sms_enabled" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "sms_delivered" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "hourly_rate" numeric(8, 2);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "default_entry_cost" numeric(8, 2);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "benefits" jsonb;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "display_color" varchar DEFAULT '#3b82f6';--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "primary_store" varchar;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "assigned_stores" text[];--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "sms_consent" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "sms_consent_date" timestamp;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "sms_enabled" boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "sms_notification_types" text[] DEFAULT '{"emergency"}';--> statement-breakpoint
ALTER TABLE "announcement_reactions" ADD CONSTRAINT "announcement_reactions_announcement_id_announcements_id_fk" FOREIGN KEY ("announcement_id") REFERENCES "public"."announcements"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "announcement_reactions" ADD CONSTRAINT "announcement_reactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "announcement_templates" ADD CONSTRAINT "announcement_templates_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_rules" ADD CONSTRAINT "automation_rules_template_id_announcement_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."announcement_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_rules" ADD CONSTRAINT "automation_rules_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calendar_notes" ADD CONSTRAINT "calendar_notes_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calendar_notes" ADD CONSTRAINT "calendar_notes_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "channel_message_reactions" ADD CONSTRAINT "channel_message_reactions_message_id_channel_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."channel_messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "channel_message_reactions" ADD CONSTRAINT "channel_message_reactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "channel_message_read_receipts" ADD CONSTRAINT "channel_message_read_receipts_message_id_channel_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."channel_messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "channel_message_read_receipts" ADD CONSTRAINT "channel_message_read_receipts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "channel_messages" ADD CONSTRAINT "channel_messages_channel_id_chat_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."chat_channels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "channel_messages" ADD CONSTRAINT "channel_messages_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "communication_events" ADD CONSTRAINT "communication_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "communication_events" ADD CONSTRAINT "communication_events_message_id_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "communication_events" ADD CONSTRAINT "communication_events_announcement_id_announcements_id_fk" FOREIGN KEY ("announcement_id") REFERENCES "public"."announcements"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "communication_events" ADD CONSTRAINT "communication_events_channel_message_id_channel_messages_id_fk" FOREIGN KEY ("channel_message_id") REFERENCES "public"."channel_messages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_sales" ADD CONSTRAINT "daily_sales_merchant_id_merchants_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "public"."merchants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_sales" ADD CONSTRAINT "daily_sales_location_id_pos_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."pos_locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dashboard_widgets" ADD CONSTRAINT "dashboard_widgets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discounts" ADD CONSTRAINT "discounts_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discounts" ADD CONSTRAINT "discounts_line_item_id_order_line_items_id_fk" FOREIGN KEY ("line_item_id") REFERENCES "public"."order_line_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discounts" ADD CONSTRAINT "discounts_applied_by_users_id_fk" FOREIGN KEY ("applied_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial_transaction_lines" ADD CONSTRAINT "financial_transaction_lines_transaction_id_financial_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."financial_transactions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial_transaction_lines" ADD CONSTRAINT "financial_transaction_lines_account_id_financial_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."financial_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial_transactions" ADD CONSTRAINT "financial_transactions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hsa_expenses" ADD CONSTRAINT "hsa_expenses_employee_id_users_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hsa_expenses" ADD CONSTRAINT "hsa_expenses_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_cost_history" ADD CONSTRAINT "item_cost_history_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_cost_history" ADD CONSTRAINT "item_cost_history_merchant_id_merchants_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "public"."merchants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_cost_history" ADD CONSTRAINT "item_cost_history_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "items" ADD CONSTRAINT "items_merchant_id_merchants_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "public"."merchants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_reactions" ADD CONSTRAINT "message_reactions_message_id_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_reactions" ADD CONSTRAINT "message_reactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_templates" ADD CONSTRAINT "message_templates_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "monthly_account_balances" ADD CONSTRAINT "monthly_account_balances_monthly_closing_id_monthly_closings_id_fk" FOREIGN KEY ("monthly_closing_id") REFERENCES "public"."monthly_closings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "monthly_account_balances" ADD CONSTRAINT "monthly_account_balances_account_id_financial_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."financial_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "monthly_closings" ADD CONSTRAINT "monthly_closings_closed_by_users_id_fk" FOREIGN KEY ("closed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "monthly_reset_history" ADD CONSTRAINT "monthly_reset_history_reset_by_users_id_fk" FOREIGN KEY ("reset_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "monthly_reset_history" ADD CONSTRAINT "monthly_reset_history_previous_closing_id_monthly_closings_id_fk" FOREIGN KEY ("previous_closing_id") REFERENCES "public"."monthly_closings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "monthly_transaction_summaries" ADD CONSTRAINT "monthly_transaction_summaries_monthly_closing_id_monthly_closings_id_fk" FOREIGN KEY ("monthly_closing_id") REFERENCES "public"."monthly_closings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "monthly_transaction_summaries" ADD CONSTRAINT "monthly_transaction_summaries_account_id_financial_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."financial_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_line_items" ADD CONSTRAINT "order_line_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_line_items" ADD CONSTRAINT "order_line_items_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_merchant_id_merchants_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "public"."merchants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_location_id_pos_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."pos_locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_employee_id_users_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_entries" ADD CONSTRAINT "payroll_entries_payroll_period_id_payroll_periods_id_fk" FOREIGN KEY ("payroll_period_id") REFERENCES "public"."payroll_periods"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_entries" ADD CONSTRAINT "payroll_entries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_entries" ADD CONSTRAINT "payroll_entries_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_entries" ADD CONSTRAINT "payroll_entries_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_journal_entries" ADD CONSTRAINT "payroll_journal_entries_payroll_period_id_payroll_periods_id_fk" FOREIGN KEY ("payroll_period_id") REFERENCES "public"."payroll_periods"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_journal_entries" ADD CONSTRAINT "payroll_journal_entries_transaction_id_financial_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."financial_transactions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_periods" ADD CONSTRAINT "payroll_periods_processed_by_users_id_fk" FOREIGN KEY ("processed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_periods" ADD CONSTRAINT "payroll_periods_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_time_entries" ADD CONSTRAINT "payroll_time_entries_payroll_entry_id_payroll_entries_id_fk" FOREIGN KEY ("payroll_entry_id") REFERENCES "public"."payroll_entries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_time_entries" ADD CONSTRAINT "payroll_time_entries_time_clock_entry_id_time_clock_entries_id_fk" FOREIGN KEY ("time_clock_entry_id") REFERENCES "public"."time_clock_entries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pos_locations" ADD CONSTRAINT "pos_locations_merchant_id_merchants_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "public"."merchants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pos_sale_items" ADD CONSTRAINT "pos_sale_items_sale_id_pos_sales_id_fk" FOREIGN KEY ("sale_id") REFERENCES "public"."pos_sales"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pos_sale_items" ADD CONSTRAINT "pos_sale_items_inventory_item_id_inventory_items_id_fk" FOREIGN KEY ("inventory_item_id") REFERENCES "public"."inventory_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pos_sales" ADD CONSTRAINT "pos_sales_location_id_pos_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."pos_locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pos_sales" ADD CONSTRAINT "pos_sales_employee_id_users_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_videos" ADD CONSTRAINT "product_videos_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qr_codes" ADD CONSTRAINT "qr_codes_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "read_receipts" ADD CONSTRAINT "read_receipts_message_id_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "read_receipts" ADD CONSTRAINT "read_receipts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_original_payment_id_payments_id_fk" FOREIGN KEY ("original_payment_id") REFERENCES "public"."payments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_processed_by_users_id_fk" FOREIGN KEY ("processed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_configs" ADD CONSTRAINT "report_configs_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "responses" ADD CONSTRAINT "responses_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "responses" ADD CONSTRAINT "responses_announcement_id_announcements_id_fk" FOREIGN KEY ("announcement_id") REFERENCES "public"."announcements"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "responses" ADD CONSTRAINT "responses_message_id_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "responses" ADD CONSTRAINT "responses_parent_response_id_responses_id_fk" FOREIGN KEY ("parent_response_id") REFERENCES "public"."responses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "responses" ADD CONSTRAINT "responses_hidden_by_users_id_fk" FOREIGN KEY ("hidden_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scheduled_messages" ADD CONSTRAINT "scheduled_messages_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shift_swap_requests" ADD CONSTRAINT "shift_swap_requests_original_schedule_id_work_schedules_id_fk" FOREIGN KEY ("original_schedule_id") REFERENCES "public"."work_schedules"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shift_swap_requests" ADD CONSTRAINT "shift_swap_requests_requester_id_users_id_fk" FOREIGN KEY ("requester_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shift_swap_requests" ADD CONSTRAINT "shift_swap_requests_taker_id_users_id_fk" FOREIGN KEY ("taker_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shift_swap_requests" ADD CONSTRAINT "shift_swap_requests_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sms_consent_history" ADD CONSTRAINT "sms_consent_history_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sms_consent_history" ADD CONSTRAINT "sms_consent_history_changed_by_users_id_fk" FOREIGN KEY ("changed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sms_deliveries" ADD CONSTRAINT "sms_deliveries_message_id_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sms_deliveries" ADD CONSTRAINT "sms_deliveries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sync_cursors" ADD CONSTRAINT "sync_cursors_merchant_id_merchants_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "public"."merchants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "taxes" ADD CONSTRAINT "taxes_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "taxes" ADD CONSTRAINT "taxes_line_item_id_order_line_items_id_fk" FOREIGN KEY ("line_item_id") REFERENCES "public"."order_line_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenders" ADD CONSTRAINT "tenders_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_communication_stats" ADD CONSTRAINT "user_communication_stats_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_assets" ADD CONSTRAINT "video_assets_video_id_product_videos_id_fk" FOREIGN KEY ("video_id") REFERENCES "public"."product_videos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voice_messages" ADD CONSTRAINT "voice_messages_message_id_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_amazon_seller_id" ON "amazon_config" USING btree ("seller_id");--> statement-breakpoint
CREATE INDEX "idx_amazon_marketplace_id" ON "amazon_config" USING btree ("marketplace_id");--> statement-breakpoint
CREATE INDEX "idx_announcement_reactions_announcement_user" ON "announcement_reactions" USING btree ("announcement_id","user_id");--> statement-breakpoint
CREATE INDEX "idx_announcement_reactions_announcement_type" ON "announcement_reactions" USING btree ("announcement_id","reaction_type");--> statement-breakpoint
CREATE INDEX "idx_announcement_reactions_sms" ON "announcement_reactions" USING btree ("is_from_sms");--> statement-breakpoint
CREATE INDEX "idx_announcement_templates_category" ON "announcement_templates" USING btree ("category");--> statement-breakpoint
CREATE INDEX "idx_announcement_templates_created_by" ON "announcement_templates" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "idx_announcement_templates_active" ON "announcement_templates" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_announcement_templates_name" ON "announcement_templates" USING btree ("name");--> statement-breakpoint
CREATE INDEX "idx_automation_rules_active" ON "automation_rules" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_automation_rules_type" ON "automation_rules" USING btree ("rule_type");--> statement-breakpoint
CREATE INDEX "idx_automation_rules_next_run" ON "automation_rules" USING btree ("next_run");--> statement-breakpoint
CREATE INDEX "idx_automation_rules_created_by" ON "automation_rules" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "idx_automation_rules_template" ON "automation_rules" USING btree ("template_id");--> statement-breakpoint
CREATE INDEX "idx_calendar_notes_date_location" ON "calendar_notes" USING btree ("date","location_id");--> statement-breakpoint
CREATE INDEX "idx_calendar_notes_type" ON "calendar_notes" USING btree ("note_type");--> statement-breakpoint
CREATE INDEX "idx_calendar_notes_active" ON "calendar_notes" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_channel_reactions_message_user" ON "channel_message_reactions" USING btree ("message_id","user_id");--> statement-breakpoint
CREATE INDEX "idx_channel_reactions_message_type" ON "channel_message_reactions" USING btree ("message_id","reaction_type");--> statement-breakpoint
CREATE INDEX "idx_channel_read_receipts_message_user" ON "channel_message_read_receipts" USING btree ("message_id","user_id");--> statement-breakpoint
CREATE INDEX "idx_channel_messages_channel" ON "channel_messages" USING btree ("channel_id");--> statement-breakpoint
CREATE INDEX "idx_channel_messages_sender" ON "channel_messages" USING btree ("sender_id");--> statement-breakpoint
CREATE INDEX "idx_channel_messages_created" ON "channel_messages" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_channel_messages_priority" ON "channel_messages" USING btree ("priority");--> statement-breakpoint
CREATE INDEX "idx_clover_merchant_id" ON "clover_config" USING btree ("merchant_id");--> statement-breakpoint
CREATE INDEX "idx_communication_analytics_date" ON "communication_analytics" USING btree ("date");--> statement-breakpoint
CREATE INDEX "idx_communication_analytics_created" ON "communication_analytics" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_communication_events_type" ON "communication_events" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "idx_communication_events_user" ON "communication_events" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_communication_events_message" ON "communication_events" USING btree ("message_id");--> statement-breakpoint
CREATE INDEX "idx_communication_events_timestamp" ON "communication_events" USING btree ("event_timestamp");--> statement-breakpoint
CREATE INDEX "idx_communication_events_source" ON "communication_events" USING btree ("source");--> statement-breakpoint
CREATE INDEX "idx_cv_qb_id" ON "customers_vendors" USING btree ("qb_id");--> statement-breakpoint
CREATE INDEX "idx_cv_type" ON "customers_vendors" USING btree ("type");--> statement-breakpoint
CREATE INDEX "idx_cv_name" ON "customers_vendors" USING btree ("name");--> statement-breakpoint
CREATE INDEX "idx_daily_sales_merchant_date_channel" ON "daily_sales" USING btree ("merchant_id","date","channel");--> statement-breakpoint
CREATE INDEX "idx_daily_sales_date_location_channel" ON "daily_sales" USING btree ("date","location_id","channel");--> statement-breakpoint
CREATE INDEX "idx_daily_sales_channel_date" ON "daily_sales" USING btree ("channel","date");--> statement-breakpoint
CREATE INDEX "idx_daily_sales_location_date" ON "daily_sales" USING btree ("location_id","date");--> statement-breakpoint
CREATE INDEX "idx_daily_sales_revenue" ON "daily_sales" USING btree ("total_revenue");--> statement-breakpoint
CREATE INDEX "idx_daily_sales_margin" ON "daily_sales" USING btree ("gross_margin");--> statement-breakpoint
CREATE INDEX "idx_daily_sales_last_updated" ON "daily_sales" USING btree ("last_updated_at");--> statement-breakpoint
CREATE INDEX "idx_dw_user_id" ON "dashboard_widgets" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_dw_widget_type" ON "dashboard_widgets" USING btree ("widget_type");--> statement-breakpoint
CREATE INDEX "idx_discounts_order" ON "discounts" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "idx_discounts_line_item" ON "discounts" USING btree ("line_item_id");--> statement-breakpoint
CREATE INDEX "idx_discounts_type" ON "discounts" USING btree ("discount_type");--> statement-breakpoint
CREATE INDEX "idx_discounts_code" ON "discounts" USING btree ("discount_code");--> statement-breakpoint
CREATE INDEX "idx_discounts_applied_by" ON "discounts" USING btree ("applied_by");--> statement-breakpoint
CREATE INDEX "idx_fa_qb_account_id" ON "financial_accounts" USING btree ("qb_account_id");--> statement-breakpoint
CREATE INDEX "idx_fa_account_type" ON "financial_accounts" USING btree ("account_type");--> statement-breakpoint
CREATE INDEX "idx_fa_parent_account" ON "financial_accounts" USING btree ("parent_account_id");--> statement-breakpoint
CREATE INDEX "idx_ftl_transaction_id" ON "financial_transaction_lines" USING btree ("transaction_id");--> statement-breakpoint
CREATE INDEX "idx_ftl_account_id" ON "financial_transaction_lines" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "idx_ft_qb_transaction_id" ON "financial_transactions" USING btree ("qb_transaction_id");--> statement-breakpoint
CREATE INDEX "idx_ft_transaction_date" ON "financial_transactions" USING btree ("transaction_date");--> statement-breakpoint
CREATE INDEX "idx_ft_source_system" ON "financial_transactions" USING btree ("source_system");--> statement-breakpoint
CREATE INDEX "idx_ft_status" ON "financial_transactions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_hsa_system_id" ON "hsa_expenses" USING btree ("hsa_system_id");--> statement-breakpoint
CREATE INDEX "idx_hsa_employee_id" ON "hsa_expenses" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "idx_hsa_expense_date" ON "hsa_expenses" USING btree ("expense_date");--> statement-breakpoint
CREATE INDEX "idx_hsa_status" ON "hsa_expenses" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_hsa_qb_posted" ON "hsa_expenses" USING btree ("qb_posted");--> statement-breakpoint
CREATE INDEX "idx_il_system" ON "integration_logs" USING btree ("system");--> statement-breakpoint
CREATE INDEX "idx_il_status" ON "integration_logs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_il_timestamp" ON "integration_logs" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "idx_il_record_type" ON "integration_logs" USING btree ("record_type");--> statement-breakpoint
CREATE INDEX "idx_ii_qb_item_id" ON "inventory_items" USING btree ("qb_item_id");--> statement-breakpoint
CREATE INDEX "idx_ii_thrive_item_id" ON "inventory_items" USING btree ("thrive_item_id");--> statement-breakpoint
CREATE INDEX "idx_ii_sku" ON "inventory_items" USING btree ("sku");--> statement-breakpoint
CREATE INDEX "idx_ii_category" ON "inventory_items" USING btree ("category");--> statement-breakpoint
CREATE INDEX "idx_item_cost_history_item_effective" ON "item_cost_history" USING btree ("item_id","effective_from");--> statement-breakpoint
CREATE INDEX "idx_item_cost_history_merchant" ON "item_cost_history" USING btree ("merchant_id");--> statement-breakpoint
CREATE INDEX "idx_item_cost_history_effective_from" ON "item_cost_history" USING btree ("effective_from");--> statement-breakpoint
CREATE INDEX "idx_item_cost_history_effective_to" ON "item_cost_history" USING btree ("effective_to");--> statement-breakpoint
CREATE INDEX "idx_item_cost_history_method" ON "item_cost_history" USING btree ("cost_method");--> statement-breakpoint
CREATE INDEX "idx_items_merchant_external" ON "items" USING btree ("merchant_id","external_item_id");--> statement-breakpoint
CREATE INDEX "idx_items_channel" ON "items" USING btree ("channel");--> statement-breakpoint
CREATE INDEX "idx_items_sku" ON "items" USING btree ("sku");--> statement-breakpoint
CREATE INDEX "idx_items_category" ON "items" USING btree ("category");--> statement-breakpoint
CREATE INDEX "idx_items_active" ON "items" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_items_name" ON "items" USING btree ("name");--> statement-breakpoint
CREATE INDEX "idx_merchants_merchant_id_channel" ON "merchants" USING btree ("merchant_id","channel");--> statement-breakpoint
CREATE INDEX "idx_merchants_channel" ON "merchants" USING btree ("channel");--> statement-breakpoint
CREATE INDEX "idx_merchants_active" ON "merchants" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_reactions_message_user" ON "message_reactions" USING btree ("message_id","user_id");--> statement-breakpoint
CREATE INDEX "idx_reactions_message_type" ON "message_reactions" USING btree ("message_id","reaction_type");--> statement-breakpoint
CREATE INDEX "idx_templates_category" ON "message_templates" USING btree ("category");--> statement-breakpoint
CREATE INDEX "idx_templates_created_by" ON "message_templates" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "idx_templates_active" ON "message_templates" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_mab_monthly_closing_id" ON "monthly_account_balances" USING btree ("monthly_closing_id");--> statement-breakpoint
CREATE INDEX "idx_mab_account_id" ON "monthly_account_balances" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "idx_mab_year_month" ON "monthly_account_balances" USING btree ("year","month");--> statement-breakpoint
CREATE INDEX "idx_mc_year" ON "monthly_closings" USING btree ("year");--> statement-breakpoint
CREATE INDEX "idx_mc_status" ON "monthly_closings" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_mc_closing_date" ON "monthly_closings" USING btree ("closing_date");--> statement-breakpoint
CREATE INDEX "idx_mrh_year_month" ON "monthly_reset_history" USING btree ("year","month");--> statement-breakpoint
CREATE INDEX "idx_mrh_reset_date" ON "monthly_reset_history" USING btree ("reset_date");--> statement-breakpoint
CREATE INDEX "idx_mrh_reset_by" ON "monthly_reset_history" USING btree ("reset_by");--> statement-breakpoint
CREATE INDEX "idx_mrh_reset_type" ON "monthly_reset_history" USING btree ("reset_type");--> statement-breakpoint
CREATE INDEX "idx_mts_monthly_closing_id" ON "monthly_transaction_summaries" USING btree ("monthly_closing_id");--> statement-breakpoint
CREATE INDEX "idx_mts_account_id" ON "monthly_transaction_summaries" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "idx_mts_source_system" ON "monthly_transaction_summaries" USING btree ("source_system");--> statement-breakpoint
CREATE INDEX "idx_mts_year_month" ON "monthly_transaction_summaries" USING btree ("year","month");--> statement-breakpoint
CREATE INDEX "idx_order_line_items_order" ON "order_line_items" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "idx_order_line_items_item" ON "order_line_items" USING btree ("item_id");--> statement-breakpoint
CREATE INDEX "idx_order_line_items_item_name" ON "order_line_items" USING btree ("item_name");--> statement-breakpoint
CREATE INDEX "idx_order_line_items_item_sku" ON "order_line_items" USING btree ("item_sku");--> statement-breakpoint
CREATE INDEX "idx_order_line_items_category" ON "order_line_items" USING btree ("item_category");--> statement-breakpoint
CREATE INDEX "idx_order_line_items_refunded" ON "order_line_items" USING btree ("is_refunded");--> statement-breakpoint
CREATE INDEX "idx_orders_merchant_external" ON "orders" USING btree ("merchant_id","external_order_id");--> statement-breakpoint
CREATE INDEX "idx_orders_channel" ON "orders" USING btree ("channel");--> statement-breakpoint
CREATE INDEX "idx_orders_date" ON "orders" USING btree ("order_date");--> statement-breakpoint
CREATE INDEX "idx_orders_created_time" ON "orders" USING btree ("created_time");--> statement-breakpoint
CREATE INDEX "idx_orders_modified_time" ON "orders" USING btree ("modified_time");--> statement-breakpoint
CREATE INDEX "idx_orders_customer" ON "orders" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "idx_orders_location" ON "orders" USING btree ("location_id");--> statement-breakpoint
CREATE INDEX "idx_orders_employee" ON "orders" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "idx_orders_state" ON "orders" USING btree ("order_state");--> statement-breakpoint
CREATE INDEX "idx_orders_payment_state" ON "orders" USING btree ("payment_state");--> statement-breakpoint
CREATE INDEX "idx_orders_type" ON "orders" USING btree ("order_type");--> statement-breakpoint
CREATE INDEX "idx_payments_order" ON "payments" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "idx_payments_method" ON "payments" USING btree ("payment_method");--> statement-breakpoint
CREATE INDEX "idx_payments_status" ON "payments" USING btree ("payment_status");--> statement-breakpoint
CREATE INDEX "idx_payments_created_time" ON "payments" USING btree ("created_time");--> statement-breakpoint
CREATE INDEX "idx_payments_transaction_id" ON "payments" USING btree ("transaction_id");--> statement-breakpoint
CREATE INDEX "idx_payroll_entries_period" ON "payroll_entries" USING btree ("payroll_period_id");--> statement-breakpoint
CREATE INDEX "idx_payroll_entries_user" ON "payroll_entries" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_payroll_entries_location" ON "payroll_entries" USING btree ("location_id");--> statement-breakpoint
CREATE INDEX "idx_payroll_entries_approved" ON "payroll_entries" USING btree ("is_approved");--> statement-breakpoint
CREATE INDEX "idx_payroll_entries_created_at" ON "payroll_entries" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_payroll_journal_entries_period" ON "payroll_journal_entries" USING btree ("payroll_period_id");--> statement-breakpoint
CREATE INDEX "idx_payroll_journal_entries_transaction" ON "payroll_journal_entries" USING btree ("transaction_id");--> statement-breakpoint
CREATE INDEX "idx_payroll_journal_entries_type" ON "payroll_journal_entries" USING btree ("entry_type");--> statement-breakpoint
CREATE INDEX "idx_payroll_periods_type" ON "payroll_periods" USING btree ("period_type");--> statement-breakpoint
CREATE INDEX "idx_payroll_periods_status" ON "payroll_periods" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_payroll_periods_start_date" ON "payroll_periods" USING btree ("start_date");--> statement-breakpoint
CREATE INDEX "idx_payroll_periods_end_date" ON "payroll_periods" USING btree ("end_date");--> statement-breakpoint
CREATE INDEX "idx_payroll_time_entries_payroll" ON "payroll_time_entries" USING btree ("payroll_entry_id");--> statement-breakpoint
CREATE INDEX "idx_payroll_time_entries_time_clock" ON "payroll_time_entries" USING btree ("time_clock_entry_id");--> statement-breakpoint
CREATE INDEX "idx_payroll_time_entries_pay_type" ON "payroll_time_entries" USING btree ("pay_type");--> statement-breakpoint
CREATE INDEX "idx_pos_locations_merchant_channel" ON "pos_locations" USING btree ("merchant_id","channel");--> statement-breakpoint
CREATE INDEX "idx_pos_locations_external_channel" ON "pos_locations" USING btree ("external_location_id","channel");--> statement-breakpoint
CREATE INDEX "idx_pos_locations_active" ON "pos_locations" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_psi_sale_id" ON "pos_sale_items" USING btree ("sale_id");--> statement-breakpoint
CREATE INDEX "idx_psi_inventory_item_id" ON "pos_sale_items" USING btree ("inventory_item_id");--> statement-breakpoint
CREATE INDEX "idx_ps_clover_order_id" ON "pos_sales" USING btree ("clover_order_id");--> statement-breakpoint
CREATE INDEX "idx_ps_amazon_order_id" ON "pos_sales" USING btree ("amazon_order_id");--> statement-breakpoint
CREATE INDEX "idx_ps_sale_date" ON "pos_sales" USING btree ("sale_date");--> statement-breakpoint
CREATE INDEX "idx_ps_location_id" ON "pos_sales" USING btree ("location_id");--> statement-breakpoint
CREATE INDEX "idx_ps_qb_posted" ON "pos_sales" USING btree ("qb_posted");--> statement-breakpoint
CREATE INDEX "idx_pv_created_by" ON "product_videos" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "idx_pv_category" ON "product_videos" USING btree ("category");--> statement-breakpoint
CREATE INDEX "idx_pv_render_status" ON "product_videos" USING btree ("render_status");--> statement-breakpoint
CREATE INDEX "idx_pv_created_at" ON "product_videos" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_qr_created_by" ON "qr_codes" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "idx_qr_category" ON "qr_codes" USING btree ("category");--> statement-breakpoint
CREATE INDEX "idx_qr_created_at" ON "qr_codes" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_qb_company_id" ON "quickbooks_config" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "idx_receipts_message_user" ON "read_receipts" USING btree ("message_id","user_id");--> statement-breakpoint
CREATE INDEX "idx_receipts_user_read" ON "read_receipts" USING btree ("user_id","read_at");--> statement-breakpoint
CREATE INDEX "idx_refunds_order" ON "refunds" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "idx_refunds_date" ON "refunds" USING btree ("refund_date");--> statement-breakpoint
CREATE INDEX "idx_refunds_status" ON "refunds" USING btree ("refund_status");--> statement-breakpoint
CREATE INDEX "idx_refunds_processed_by" ON "refunds" USING btree ("processed_by");--> statement-breakpoint
CREATE INDEX "idx_refunds_created_time" ON "refunds" USING btree ("created_time");--> statement-breakpoint
CREATE INDEX "idx_rc_report_type" ON "report_configs" USING btree ("report_type");--> statement-breakpoint
CREATE INDEX "idx_rc_created_by" ON "report_configs" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "idx_responses_author" ON "responses" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX "idx_responses_announcement" ON "responses" USING btree ("announcement_id");--> statement-breakpoint
CREATE INDEX "idx_responses_message" ON "responses" USING btree ("message_id");--> statement-breakpoint
CREATE INDEX "idx_responses_parent" ON "responses" USING btree ("parent_response_id");--> statement-breakpoint
CREATE INDEX "idx_responses_type" ON "responses" USING btree ("response_type");--> statement-breakpoint
CREATE INDEX "idx_responses_sms" ON "responses" USING btree ("is_from_sms");--> statement-breakpoint
CREATE INDEX "idx_responses_created" ON "responses" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_responses_read" ON "responses" USING btree ("is_read");--> statement-breakpoint
CREATE INDEX "idx_scheduled_messages_author" ON "scheduled_messages" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX "idx_scheduled_messages_scheduled_for" ON "scheduled_messages" USING btree ("scheduled_for");--> statement-breakpoint
CREATE INDEX "idx_scheduled_messages_status" ON "scheduled_messages" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_scheduled_messages_automation_rule" ON "scheduled_messages" USING btree ("automation_rule_id");--> statement-breakpoint
CREATE INDEX "idx_scheduled_messages_type" ON "scheduled_messages" USING btree ("message_type");--> statement-breakpoint
CREATE INDEX "idx_shift_swap_requester" ON "shift_swap_requests" USING btree ("requester_id");--> statement-breakpoint
CREATE INDEX "idx_shift_swap_taker" ON "shift_swap_requests" USING btree ("taker_id");--> statement-breakpoint
CREATE INDEX "idx_shift_swap_status" ON "shift_swap_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_shift_swap_schedule" ON "shift_swap_requests" USING btree ("original_schedule_id");--> statement-breakpoint
CREATE INDEX "idx_shift_swap_urgency" ON "shift_swap_requests" USING btree ("urgency_level");--> statement-breakpoint
CREATE INDEX "idx_shift_swap_active" ON "shift_swap_requests" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_sms_consent_history_user_id" ON "sms_consent_history" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_sms_consent_history_consent" ON "sms_consent_history" USING btree ("consent_given");--> statement-breakpoint
CREATE INDEX "idx_sms_consent_history_reason" ON "sms_consent_history" USING btree ("change_reason");--> statement-breakpoint
CREATE INDEX "idx_sms_consent_history_created_at" ON "sms_consent_history" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_sms_message_user" ON "sms_deliveries" USING btree ("message_id","user_id");--> statement-breakpoint
CREATE INDEX "idx_sms_twilio_message" ON "sms_deliveries" USING btree ("twilio_message_id");--> statement-breakpoint
CREATE INDEX "idx_sms_status" ON "sms_deliveries" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_sms_phone" ON "sms_deliveries" USING btree ("phone_number");--> statement-breakpoint
CREATE INDEX "idx_sms_sent_at" ON "sms_deliveries" USING btree ("sent_at");--> statement-breakpoint
CREATE INDEX "idx_sync_cursors_system_merchant_data" ON "sync_cursors" USING btree ("system","merchant_id","data_type");--> statement-breakpoint
CREATE INDEX "idx_sync_cursors_system_data_type" ON "sync_cursors" USING btree ("system","data_type");--> statement-breakpoint
CREATE INDEX "idx_sync_cursors_last_sync" ON "sync_cursors" USING btree ("last_sync_at");--> statement-breakpoint
CREATE INDEX "idx_sync_cursors_backfill_state" ON "sync_cursors" USING btree ("backfill_state");--> statement-breakpoint
CREATE INDEX "idx_sync_cursors_active" ON "sync_cursors" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_taxes_order" ON "taxes" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "idx_taxes_line_item" ON "taxes" USING btree ("line_item_id");--> statement-breakpoint
CREATE INDEX "idx_taxes_type" ON "taxes" USING btree ("tax_type");--> statement-breakpoint
CREATE INDEX "idx_taxes_name" ON "taxes" USING btree ("tax_name");--> statement-breakpoint
CREATE INDEX "idx_tenders_payment" ON "tenders" USING btree ("payment_id");--> statement-breakpoint
CREATE INDEX "idx_tenders_type" ON "tenders" USING btree ("tender_type");--> statement-breakpoint
CREATE INDEX "idx_thrive_store_id" ON "thrive_config" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "idx_user_communication_stats_user" ON "user_communication_stats" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_user_communication_stats_calculated" ON "user_communication_stats" USING btree ("last_calculated");--> statement-breakpoint
CREATE INDEX "idx_user_communication_stats_engagement" ON "user_communication_stats" USING btree ("engagement_score");--> statement-breakpoint
CREATE INDEX "idx_va_video_id" ON "video_assets" USING btree ("video_id");--> statement-breakpoint
CREATE INDEX "idx_va_asset_type" ON "video_assets" USING btree ("asset_type");--> statement-breakpoint
CREATE INDEX "idx_vt_category" ON "video_templates" USING btree ("category");--> statement-breakpoint
CREATE INDEX "idx_vt_name" ON "video_templates" USING btree ("name");--> statement-breakpoint
CREATE INDEX "idx_voice_messages_message" ON "voice_messages" USING btree ("message_id");--> statement-breakpoint
CREATE INDEX "idx_voice_messages_uploaded" ON "voice_messages" USING btree ("uploaded_at");--> statement-breakpoint
CREATE INDEX "idx_channel_members_channel" ON "channel_members" USING btree ("channel_id");--> statement-breakpoint
CREATE INDEX "idx_channel_members_user" ON "channel_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_messages_priority" ON "messages" USING btree ("priority");--> statement-breakpoint
CREATE INDEX "idx_messages_target_audience" ON "messages" USING btree ("target_audience");--> statement-breakpoint
CREATE INDEX "idx_users_primary_store" ON "users" USING btree ("primary_store");--> statement-breakpoint
CREATE INDEX "idx_users_sms_consent" ON "users" USING btree ("sms_consent");--> statement-breakpoint
ALTER TABLE "channel_members" ADD CONSTRAINT "unique_channel_user" UNIQUE("channel_id","user_id");