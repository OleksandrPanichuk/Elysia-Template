import { Elysia } from "elysia";

import { UnauthorizedError } from "@/core/errors";
import { makeService } from "@/core/registry";

import { readSessionCookie, writeSessionCookie } from "./session.cookie";
import { SessionsService } from "./sessions.service";

export const sessionsPlugin = new Elysia({ name: "session-auth" })
  .macro({
    auth: {
      resolve: async ({ cookie }) => {
        const token = readSessionCookie(cookie);
        const validated = await makeService(SessionsService).validate(token);

        if (!validated) {
          throw new UnauthorizedError("Authentication required");
        }

        const { session, extended } = validated;

        if (extended && token) {
          writeSessionCookie(cookie, { token, expiresAt: session.expiresAt });
        }

        return {
          user: {
            id: session.userId,
          },
        };
      },
    },
  })
  .as("global");
