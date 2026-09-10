import { Elysia } from "elysia";

import { UnauthorizedError } from "@/core/errors";
import { makeService } from "@/core/registry";

import { readSessionCookie } from "./session.cookie";
import { SessionsService } from "./sessions.service";

export const sessionsPlugin = new Elysia({ name: "session-auth" })
  .macro({
    auth: {
      resolve: async ({ cookie }) => {
        const sessions = makeService(SessionsService);
        const session = await sessions.validate(readSessionCookie(cookie));

        if (!session) {
          throw new UnauthorizedError("Authentication required");
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
