import { t } from "elysia";

import { HttpStatus } from "@/core/http";
import { makeService } from "@/core/registry";
import { defineRoute } from "@/core/route";

import { OAuthAuthorizeQuery, OAuthProviderParams } from "../dto";
import { sanitizeRedirectPath } from "../oauth.redirect";
import type { OAuthActions } from "../oauth.routes";
import { OAuthTransactions } from "../oauth.transaction";

const transactions = makeService(OAuthTransactions);

export const authorizeRoute = ({ startOAuthFlow }: OAuthActions) =>
  defineRoute({
    params: OAuthProviderParams,
    query: OAuthAuthorizeQuery,
    response: t.Void(),
    summary: "Start OAuth sign-in",

    action: ({ params, query }) =>
      startOAuthFlow.execute({
        provider: params.provider,
        redirectTo: sanitizeRedirectPath(query.redirectTo),
      }),

    postAction: ({ cookie, output, set }) => {
      transactions.write(cookie, output.transaction);

      set.status = HttpStatus.Found;
      set.headers.location = output.authorizationUrl;
    },
  });
