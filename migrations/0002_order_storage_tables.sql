-- Migration to add all order storage tables
-- Generated from schema.ts order storage table definitions

-- Merchants table
CREATE TABLE IF NOT EXISTS "merchants" (
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

-- POS Locations table
CREATE TABLE IF NOT EXISTS "pos_locations" (
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

-- Items table
CREATE TABLE IF NOT EXISTS "items" (
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

-- Item Cost History table
CREATE TABLE IF NOT EXISTS "item_cost_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"item_id" integer NOT NULL,
	"merchant_id" integer NOT NULL,
	"unit_cost" numeric(10, 2) NOT NULL,
	"cost_method" varchar NOT NULL DEFAULT 'avg',
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

-- Orders table
CREATE TABLE IF NOT EXISTS "orders" (
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
	"shipping_address" text,
	"billing_address" text,
	"notes" text,
	"metadata" jsonb,
	"last_sync_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);

-- Order Line Items table
CREATE TABLE IF NOT EXISTS "order_line_items" (
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

-- Payments table
CREATE TABLE IF NOT EXISTS "payments" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" integer NOT NULL,
	"external_payment_id" varchar,
	"payment_method" varchar NOT NULL,
	"payment_type" varchar,
	"amount" numeric(12, 2) NOT NULL,
	"tip_amount" numeric(12, 2) DEFAULT '0.00',
	"tax_amount" numeric(12, 2) DEFAULT '0.00',
	"cashback_amount" numeric(12, 2) DEFAULT '0.00',
	"payment_status" varchar NOT NULL DEFAULT 'pending',
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

-- Taxes table
CREATE TABLE IF NOT EXISTS "taxes" (
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

-- Discounts table
CREATE TABLE IF NOT EXISTS "discounts" (
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

-- Refunds table
CREATE TABLE IF NOT EXISTS "refunds" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" integer NOT NULL,
	"original_payment_id" integer,
	"external_refund_id" varchar,
	"refund_amount" numeric(12, 2) NOT NULL,
	"refund_reason" varchar,
	"refund_type" varchar NOT NULL,
	"refund_method" varchar,
	"refund_status" varchar NOT NULL DEFAULT 'pending',
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

-- Tenders table
CREATE TABLE IF NOT EXISTS "tenders" (
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

-- Sync Cursors table
CREATE TABLE IF NOT EXISTS "sync_cursors" (
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

-- Daily Sales table
CREATE TABLE IF NOT EXISTS "daily_sales" (
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

-- Add foreign key constraints
DO $$ BEGIN
	IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'merchants') THEN
		ALTER TABLE "pos_locations" ADD CONSTRAINT "pos_locations_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "merchants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
	END IF;
END $$;

DO $$ BEGIN
	IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'merchants') THEN
		ALTER TABLE "items" ADD CONSTRAINT "items_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "merchants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
	END IF;
END $$;

DO $$ BEGIN
	IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'items') THEN
		ALTER TABLE "item_cost_history" ADD CONSTRAINT "item_cost_history_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "items"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
	END IF;
END $$;

DO $$ BEGIN
	IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'merchants') THEN
		ALTER TABLE "item_cost_history" ADD CONSTRAINT "item_cost_history_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "merchants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
	END IF;
END $$;

DO $$ BEGIN
	IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'merchants') THEN
		ALTER TABLE "orders" ADD CONSTRAINT "orders_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "merchants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
	END IF;
END $$;

DO $$ BEGIN
	IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'pos_locations') THEN
		ALTER TABLE "orders" ADD CONSTRAINT "orders_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "pos_locations"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
	END IF;
END $$;

DO $$ BEGIN
	IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'orders') THEN
		ALTER TABLE "order_line_items" ADD CONSTRAINT "order_line_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE;
	END IF;
END $$;

DO $$ BEGIN
	IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'items') THEN
		ALTER TABLE "order_line_items" ADD CONSTRAINT "order_line_items_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "items"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
	END IF;
END $$;

DO $$ BEGIN
	IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'orders') THEN
		ALTER TABLE "payments" ADD CONSTRAINT "payments_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE;
	END IF;
END $$;

DO $$ BEGIN
	IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'orders') THEN
		ALTER TABLE "taxes" ADD CONSTRAINT "taxes_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE;
	END IF;
END $$;

DO $$ BEGIN
	IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_line_items') THEN
		ALTER TABLE "taxes" ADD CONSTRAINT "taxes_line_item_id_fkey" FOREIGN KEY ("line_item_id") REFERENCES "order_line_items"("id") ON DELETE CASCADE;
	END IF;
END $$;

DO $$ BEGIN
	IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'orders') THEN
		ALTER TABLE "discounts" ADD CONSTRAINT "discounts_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE;
	END IF;
END $$;

DO $$ BEGIN
	IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_line_items') THEN
		ALTER TABLE "discounts" ADD CONSTRAINT "discounts_line_item_id_fkey" FOREIGN KEY ("line_item_id") REFERENCES "order_line_items"("id") ON DELETE CASCADE;
	END IF;
END $$;

DO $$ BEGIN
	IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'orders') THEN
		ALTER TABLE "refunds" ADD CONSTRAINT "refunds_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
	END IF;
END $$;

DO $$ BEGIN
	IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payments') THEN
		ALTER TABLE "refunds" ADD CONSTRAINT "refunds_original_payment_id_fkey" FOREIGN KEY ("original_payment_id") REFERENCES "payments"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
	END IF;
END $$;

DO $$ BEGIN
	IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payments') THEN
		ALTER TABLE "tenders" ADD CONSTRAINT "tenders_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE CASCADE;
	END IF;
END $$;

DO $$ BEGIN
	IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'merchants') THEN
		ALTER TABLE "sync_cursors" ADD CONSTRAINT "sync_cursors_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "merchants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
	END IF;
END $$;

DO $$ BEGIN
	IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'merchants') THEN
		ALTER TABLE "daily_sales" ADD CONSTRAINT "daily_sales_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "merchants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
	END IF;
END $$;

DO $$ BEGIN
	IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'pos_locations') THEN
		ALTER TABLE "daily_sales" ADD CONSTRAINT "daily_sales_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "pos_locations"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
	END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS "idx_merchants_merchant_id_channel" ON "merchants" USING btree ("merchant_id","channel");
CREATE INDEX IF NOT EXISTS "idx_merchants_channel" ON "merchants" USING btree ("channel");
CREATE INDEX IF NOT EXISTS "idx_merchants_active" ON "merchants" USING btree ("is_active");

CREATE INDEX IF NOT EXISTS "idx_pos_locations_merchant_channel" ON "pos_locations" USING btree ("merchant_id","channel");
CREATE INDEX IF NOT EXISTS "idx_pos_locations_external_channel" ON "pos_locations" USING btree ("external_location_id","channel");
CREATE INDEX IF NOT EXISTS "idx_pos_locations_active" ON "pos_locations" USING btree ("is_active");

CREATE INDEX IF NOT EXISTS "idx_items_merchant_external" ON "items" USING btree ("merchant_id","external_item_id");
CREATE INDEX IF NOT EXISTS "idx_items_channel" ON "items" USING btree ("channel");
CREATE INDEX IF NOT EXISTS "idx_items_sku" ON "items" USING btree ("sku");
CREATE INDEX IF NOT EXISTS "idx_items_category" ON "items" USING btree ("category");
CREATE INDEX IF NOT EXISTS "idx_items_active" ON "items" USING btree ("is_active");
CREATE INDEX IF NOT EXISTS "idx_items_name" ON "items" USING btree ("name");

CREATE INDEX IF NOT EXISTS "idx_item_cost_history_item_effective" ON "item_cost_history" USING btree ("item_id","effective_from");
CREATE INDEX IF NOT EXISTS "idx_item_cost_history_merchant" ON "item_cost_history" USING btree ("merchant_id");
CREATE INDEX IF NOT EXISTS "idx_item_cost_history_effective_from" ON "item_cost_history" USING btree ("effective_from");
CREATE INDEX IF NOT EXISTS "idx_item_cost_history_effective_to" ON "item_cost_history" USING btree ("effective_to");
CREATE INDEX IF NOT EXISTS "idx_item_cost_history_method" ON "item_cost_history" USING btree ("cost_method");

CREATE INDEX IF NOT EXISTS "idx_orders_merchant_id" ON "orders" USING btree ("merchant_id");
CREATE INDEX IF NOT EXISTS "idx_orders_location_id" ON "orders" USING btree ("location_id");
CREATE INDEX IF NOT EXISTS "idx_orders_external_order_id" ON "orders" USING btree ("external_order_id");
CREATE INDEX IF NOT EXISTS "idx_orders_channel" ON "orders" USING btree ("channel");
CREATE INDEX IF NOT EXISTS "idx_orders_order_date" ON "orders" USING btree ("order_date");
CREATE INDEX IF NOT EXISTS "idx_orders_created_time" ON "orders" USING btree ("created_time");
CREATE INDEX IF NOT EXISTS "idx_orders_order_state" ON "orders" USING btree ("order_state");
CREATE INDEX IF NOT EXISTS "idx_orders_payment_state" ON "orders" USING btree ("payment_state");
CREATE INDEX IF NOT EXISTS "idx_orders_customer_id" ON "orders" USING btree ("customer_id");
CREATE INDEX IF NOT EXISTS "idx_orders_employee_id" ON "orders" USING btree ("employee_id");
CREATE INDEX IF NOT EXISTS "idx_orders_total" ON "orders" USING btree ("total");

CREATE INDEX IF NOT EXISTS "idx_order_line_items_order" ON "order_line_items" USING btree ("order_id");
CREATE INDEX IF NOT EXISTS "idx_order_line_items_item" ON "order_line_items" USING btree ("item_id");
CREATE INDEX IF NOT EXISTS "idx_order_line_items_item_name" ON "order_line_items" USING btree ("item_name");
CREATE INDEX IF NOT EXISTS "idx_order_line_items_item_sku" ON "order_line_items" USING btree ("item_sku");
CREATE INDEX IF NOT EXISTS "idx_order_line_items_category" ON "order_line_items" USING btree ("item_category");
CREATE INDEX IF NOT EXISTS "idx_order_line_items_refunded" ON "order_line_items" USING btree ("is_refunded");

CREATE INDEX IF NOT EXISTS "idx_payments_order" ON "payments" USING btree ("order_id");
CREATE INDEX IF NOT EXISTS "idx_payments_method" ON "payments" USING btree ("payment_method");
CREATE INDEX IF NOT EXISTS "idx_payments_status" ON "payments" USING btree ("payment_status");
CREATE INDEX IF NOT EXISTS "idx_payments_created_time" ON "payments" USING btree ("created_time");
CREATE INDEX IF NOT EXISTS "idx_payments_transaction_id" ON "payments" USING btree ("transaction_id");

CREATE INDEX IF NOT EXISTS "idx_taxes_order" ON "taxes" USING btree ("order_id");
CREATE INDEX IF NOT EXISTS "idx_taxes_line_item" ON "taxes" USING btree ("line_item_id");
CREATE INDEX IF NOT EXISTS "idx_taxes_type" ON "taxes" USING btree ("tax_type");
CREATE INDEX IF NOT EXISTS "idx_taxes_name" ON "taxes" USING btree ("tax_name");

CREATE INDEX IF NOT EXISTS "idx_discounts_order" ON "discounts" USING btree ("order_id");
CREATE INDEX IF NOT EXISTS "idx_discounts_line_item" ON "discounts" USING btree ("line_item_id");
CREATE INDEX IF NOT EXISTS "idx_discounts_type" ON "discounts" USING btree ("discount_type");
CREATE INDEX IF NOT EXISTS "idx_discounts_code" ON "discounts" USING btree ("discount_code");
CREATE INDEX IF NOT EXISTS "idx_discounts_applied_by" ON "discounts" USING btree ("applied_by");

CREATE INDEX IF NOT EXISTS "idx_refunds_order" ON "refunds" USING btree ("order_id");
CREATE INDEX IF NOT EXISTS "idx_refunds_date" ON "refunds" USING btree ("refund_date");
CREATE INDEX IF NOT EXISTS "idx_refunds_status" ON "refunds" USING btree ("refund_status");
CREATE INDEX IF NOT EXISTS "idx_refunds_processed_by" ON "refunds" USING btree ("processed_by");
CREATE INDEX IF NOT EXISTS "idx_refunds_created_time" ON "refunds" USING btree ("created_time");

CREATE INDEX IF NOT EXISTS "idx_tenders_payment" ON "tenders" USING btree ("payment_id");
CREATE INDEX IF NOT EXISTS "idx_tenders_type" ON "tenders" USING btree ("tender_type");

CREATE INDEX IF NOT EXISTS "idx_sync_cursors_system_merchant_data" ON "sync_cursors" USING btree ("system","merchant_id","data_type");
CREATE INDEX IF NOT EXISTS "idx_sync_cursors_system_data_type" ON "sync_cursors" USING btree ("system","data_type");
CREATE INDEX IF NOT EXISTS "idx_sync_cursors_last_sync" ON "sync_cursors" USING btree ("last_sync_at");
CREATE INDEX IF NOT EXISTS "idx_sync_cursors_backfill_state" ON "sync_cursors" USING btree ("backfill_state");
CREATE INDEX IF NOT EXISTS "idx_sync_cursors_active" ON "sync_cursors" USING btree ("is_active");

CREATE INDEX IF NOT EXISTS "idx_daily_sales_merchant_date_channel" ON "daily_sales" USING btree ("merchant_id","date","channel");
CREATE INDEX IF NOT EXISTS "idx_daily_sales_date_location_channel" ON "daily_sales" USING btree ("date","location_id","channel");
CREATE INDEX IF NOT EXISTS "idx_daily_sales_channel_date" ON "daily_sales" USING btree ("channel","date");
CREATE INDEX IF NOT EXISTS "idx_daily_sales_location_date" ON "daily_sales" USING btree ("location_id","date");
CREATE INDEX IF NOT EXISTS "idx_daily_sales_revenue" ON "daily_sales" USING btree ("total_revenue");
CREATE INDEX IF NOT EXISTS "idx_daily_sales_margin" ON "daily_sales" USING btree ("gross_margin");
CREATE INDEX IF NOT EXISTS "idx_daily_sales_last_updated" ON "daily_sales" USING btree ("last_updated_at");