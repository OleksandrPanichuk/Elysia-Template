import { Elysia } from "elysia";

import type { AuthUser } from "@/core/auth";
import { UnauthorizedError } from "@/core/errors";
import { makeService } from "@/core/registry";

import { UserEntity } from "./user.entity";
import { EmailNotVerifiedError } from "./users.errors";
import { UsersService } from "./users.service";

interface VerifiedEmailContext {
  user?: AuthUser;
}

export const usersPlugin = new Elysia({ name: "verified-email" })
  .macro({
    verifiedEmail: {
      beforeHandle: async (raw: unknown) => {
        const { user } = raw as VerifiedEmailContext;

        if (!user) {
          throw new UnauthorizedError("Authentication required");
        }

        const current = await makeService(UsersService).getById(user.id);

        if (!UserEntity.isEmailVerified(current)) {
          throw new EmailNotVerifiedError(
            "Verify your email address to continue",
          );
        }
      },
    },
  })
  .as("global");
