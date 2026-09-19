ALTER TYPE "public"."verification_token_type" ADD VALUE 'email_change';--> statement-breakpoint
ALTER TABLE "verification_tokens" ADD COLUMN "email" text;