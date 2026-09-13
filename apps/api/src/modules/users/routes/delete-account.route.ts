import { defineRoute } from "@/core/route";
import { clearSessionCookie } from "@/modules/sessions";

import { DeleteAccountInput } from "../dto";
import { UserMessageModel } from "../user.model";
import { DELETE_ACCOUNT_RATE_LIMIT } from "../users.constants";
import type { UsersActions } from "../users.routes";

export const deleteAccountRoute = ({ deleteAccount }: UsersActions) =>
  defineRoute({
    body: DeleteAccountInput,
    response: UserMessageModel,
    summary: "Delete your account",
    auth: true,
    rateLimit: {
      ...DELETE_ACCOUNT_RATE_LIMIT,
      scope: "users:delete-account",
      key: ({ user }) => `user:${user.id}`,
    },

    action: ({ body, user }) =>
      deleteAccount.execute({
        userId: user.id,
        email: body.email,
        password: body.password,
      }),

    postAction: ({ cookie }) => {
      clearSessionCookie(cookie);

      return { message: "ok" };
    },
  });
