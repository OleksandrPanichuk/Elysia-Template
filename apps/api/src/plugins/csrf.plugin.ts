import { Elysia } from "elysia";

import { getEnv } from "@/configs";
import { ForbiddenError } from "@/core/errors";
import { getSessionCookieName } from "@/modules/sessions";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export const csrfPlugin = new Elysia({ name: "csrf" })
  .onBeforeHandle(({ request, cookie }) => {
    if (SAFE_METHODS.has(request.method)) {
      return;
    }

    if (!cookie[getSessionCookieName()]?.value) {
      return;
    }

    const site = request.headers.get("sec-fetch-site");

    if (site === "same-origin" || site === "none") {
      return;
    }

    const origin = request.headers.get("origin");

    if (!origin || !getEnv().CORS_ORIGIN.includes(origin)) {
      throw new ForbiddenError("Untrusted request origin");
    }
  })
  .as("global");
