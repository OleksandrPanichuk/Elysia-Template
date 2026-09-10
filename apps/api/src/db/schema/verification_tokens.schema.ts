import {
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { usersSchema } from "./users.schema";

export const verificationTokenTypeEnum = pgEnum("verification_token_type", [
  "email_verification",
  "password_reset",
]);

export const verificationTokensSchema = pgTable(
  "verification_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => usersSchema.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull().unique(),
    type: verificationTokenTypeEnum("type").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("verification_tokens_user_id_and_type_idx").on(
      table.userId,
      table.type,
    ),
  ],
);

export type VerificationTokenRow = typeof verificationTokensSchema.$inferSelect;
export type InsertVerificationTokenRow =
  typeof verificationTokensSchema.$inferInsert;
export type VerificationTokenType =
  (typeof verificationTokenTypeEnum.enumValues)[number];
