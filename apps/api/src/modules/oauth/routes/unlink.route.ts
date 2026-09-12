import { defineRoute } from "@/core/route";

import { OAuthProviderParams } from "../dto";
import { OAuthMessageModel } from "../oauth.model";
import type { OAuthActions } from "../oauth.routes";

export const unlinkRoute = ({ unlinkOAuthAccount }: OAuthActions) =>
  defineRoute({
    params: OAuthProviderParams,
    response: OAuthMessageModel,
    summary: "Unlink an OAuth provider",
    auth: true,

    action: ({ params, user }) =>
      unlinkOAuthAccount.execute({
        userId: user.id,
        provider: params.provider,
      }),
    postAction: () => ({ message: "ok" }),
  });
