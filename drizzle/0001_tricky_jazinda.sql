CREATE TYPE "public"."category" AS ENUM('utility-electric', 'utility-water', 'telecom-internet', 'subscription-entertainment', 'housing-rent', 'insurance', 'major-expense', 'subscription', 'uncategorized');--> statement-breakpoint
ALTER TABLE "financial_obligations" ADD COLUMN "category" "category" DEFAULT 'uncategorized' NOT NULL;--> statement-breakpoint
ALTER TABLE "financial_obligations" ADD COLUMN "urgency_score" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "financial_obligations" ADD COLUMN "urgency_level" varchar(20) DEFAULT 'normal' NOT NULL;--> statement-breakpoint
ALTER TABLE "financial_obligations" ADD COLUMN "urgency_reasons" text[];--> statement-breakpoint
ALTER TABLE "financial_obligations" ADD COLUMN "last_urgency_calculation" timestamp;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "last_app_open" timestamp;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "primary_residence" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "overall_forget_rate" numeric(5, 2) DEFAULT '0';