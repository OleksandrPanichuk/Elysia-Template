import { t } from "elysia";

import { HttpStatus } from "@/core/http";
import { defineRoute } from "@/core/route";

import { OAuthAuthorizeQuery, OAuthProviderParams } from "../dto";
import { sanitizeRedirectPath } from "../oauth.redirect";
import type { OAuthActions } from "../oauth.routes";
import { OAuthTransaction } from "../oauth-transaction.entity";

export const linkRoute = ({ startOAuthFlow }: OAuthActions) =>
  defineRoute({
    params: OAuthProviderParams,
    query: OAuthAuthorizeQuery,
    response: t.Void(),
    summary: "Start linking an OAuth provider",
    auth: true,

    action: ({ params, query, user }) =>
      startOAuthFlow.execute({
        provider: params.provider,
        redirectTo: sanitizeRedirectPath(query.redirectTo),
        linkUserId: user.id,
      }),

    postAction: ({ cookie, output, set }) => {
      OAuthTransaction.write(cookie, output.transaction);

      set.status = HttpStatus.Found;
      set.headers.location = output.authorizationUrl;
    },
  });
