import Elysia from "elysia";

import { getEnv } from "@/configs";

export const envPlugin = new Elysia({
  name: "env",
})
  .decorate("env", getEnv())
  .as("global");
