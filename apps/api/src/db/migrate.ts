import { migrate } from "drizzle-orm/bun-sql/migrator";
import z from "zod";

import { createDatabase } from "./client";

const { DATABASE_URL } = z
  .object({ DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }) })
  .parse(Bun.env);

const db = createDatabase(DATABASE_URL);

try {
  await migrate(db, {
    migrationsFolder: new URL("../../drizzle", import.meta.url).pathname,
  });
  console.log("Migrations applied");
} finally {
  await db.close();
}
