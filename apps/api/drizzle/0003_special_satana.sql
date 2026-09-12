ALTER TYPE "public"."account_type" ADD VALUE IF NOT EXISTS 'GITHUB';--> statement-breakpoint
ALTER TYPE "public"."account_type" ADD VALUE IF NOT EXISTS 'GOOGLE';--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "linked_at" timestamp with time zone;
