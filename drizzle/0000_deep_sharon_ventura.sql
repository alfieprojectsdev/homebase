CREATE TABLE "financial_obligations" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" integer NOT NULL,
	"residence_id" integer,
	"name" varchar(255) NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"due_date" timestamp NOT NULL,
	"status" varchar(50) DEFAULT 'pending' NOT NULL,
	"paid_at" timestamp,
	"recurrence_enabled" boolean DEFAULT false NOT NULL,
	"recurrence_frequency" varchar(20),
	"recurrence_interval" integer DEFAULT 1,
	"recurrence_day_of_month" integer,
	"parent_bill_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "residences" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"address" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" integer NOT NULL,
	"residence_id" integer,
	"email" varchar(255) NOT NULL,
	"password" varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	"role" varchar(50) DEFAULT 'member' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "financial_obligations" ADD CONSTRAINT "financial_obligations_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial_obligations" ADD CONSTRAINT "financial_obligations_residence_id_residences_id_fk" FOREIGN KEY ("residence_id") REFERENCES "public"."residences"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial_obligations" ADD CONSTRAINT "financial_obligations_parent_bill_id_fk" FOREIGN KEY ("parent_bill_id") REFERENCES "public"."financial_obligations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial_obligations" ADD CONSTRAINT "recurrence_frequency_check" CHECK ("recurrence_frequency" IN ('monthly', 'quarterly', 'biannual', 'annual') OR "recurrence_frequency" IS NULL);--> statement-breakpoint
ALTER TABLE "residences" ADD CONSTRAINT "residences_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_residence_id_residences_id_fk" FOREIGN KEY ("residence_id") REFERENCES "public"."residences"("id") ON DELETE set null ON UPDATE no action;