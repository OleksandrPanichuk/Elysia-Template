import { sql } from "drizzle-orm";
import {
  check,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { usersSchema } from "./users.schema";

export const accountTypeEnum = pgEnum("account_type", ["CREDENTIALS"]);

export const accountsSchema = pgTable(
  "accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => usersSchema.id, { onDelete: "cascade" }),
    type: accountTypeEnum("type").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    passwordHash: text("password_hash"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("accounts_type_and_provider_account_id_unique").on(
      table.type,
      table.providerAccountId,
    ),
    uniqueIndex("accounts_user_id_and_type_unique").on(
      table.userId,
      table.type,
    ),
    check(
      "accounts_credentials_password_hash_check",
      sql`(${table.type} = 'CREDENTIALS' AND ${table.passwordHash} IS NOT NULL) OR (${table.type} <> 'CREDENTIALS' AND ${table.passwordHash} IS NULL)`,
    ),
  ],
);

export type AccountRow = typeof accountsSchema.$inferSelect;
export type InsertAccountRow = typeof accountsSchema.$inferInsert;
export type AccountType = (typeof accountTypeEnum.enumValues)[number];
