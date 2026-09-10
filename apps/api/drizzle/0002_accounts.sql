CREATE TYPE "public"."account_type" AS ENUM('CREDENTIALS', 'GOOGLE', 'GITHUB');--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" "account_type" NOT NULL,
	"provider_account_id" text NOT NULL,
	"password_hash" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "accounts_credentials_password_hash_check" CHECK (("accounts"."type" = 'CREDENTIALS' AND "accounts"."password_hash" IS NOT NULL) OR ("accounts"."type" <> 'CREDENTIALS' AND "accounts"."password_hash" IS NULL))
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "accounts_type_and_provider_account_id_unique" ON "accounts" USING btree ("type","provider_account_id");--> statement-breakpoint
CREATE UNIQUE INDEX "accounts_user_id_and_type_unique" ON "accounts" USING btree ("user_id","type");--> statement-breakpoint
INSERT INTO "accounts" ("user_id", "type", "provider_account_id", "password_hash", "created_at")
SELECT "id", 'CREDENTIALS', "email", "password_hash", "created_at"
FROM "users";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "password_hash";
