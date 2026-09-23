import z from "zod";

import { EnvSchema, NodeEnv, setEnv, withDerivedDefaults } from "@/configs";

if (Bun.env.NODE_ENV === NodeEnv.Production) {
  console.error(
    "Refusing to seed: NODE_ENV is production. Seeders create accounts with a shared, published password.",
  );
  process.exit(1);
}

const parsed = EnvSchema.safeParse(Bun.env);

if (!parsed.success) {
  console.error(`Invalid environment:\n${z.prettifyError(parsed.error)}`);
  process.exit(1);
}

setEnv(withDerivedDefaults(parsed.data));
