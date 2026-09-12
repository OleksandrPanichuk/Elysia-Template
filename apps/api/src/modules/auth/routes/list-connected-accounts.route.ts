import { t } from "elysia";

import { defineRoute } from "@/core/route";
import { AccountEntity } from "@/modules/accounts";

import { ConnectedAccountModel } from "../auth.model";
import type { AuthActions } from "../auth.routes";

export const listConnectedAccountsRoute = ({
  listConnectedAccounts,
}: AuthActions) =>
  defineRoute({
    response: t.Array(ConnectedAccountModel),
    summary: "List connected accounts",
    auth: true,

    action: ({ user }) => listConnectedAccounts.execute({ userId: user.id }),

    postAction: ({ output }) => {
      const canDisconnect = output.length > 1;

      return output.map((account) =>
        AccountEntity.normalize(account, canDisconnect),
      );
    },
  });
