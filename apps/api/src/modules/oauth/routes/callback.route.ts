import { t } from "elysia";

import { AppError } from "@/core/errors";
import { HttpStatus } from "@/core/http";
import { make } from "@/core/registry";
import { defineRoute } from "@/core/route";
import { writeSessionCookie } from "@/modules/sessions";
import { ErrorReporter } from "@/platform/error-reporting";
import { getClientInfo, getRequestContext } from "@/shared";

import { OAuthCallbackQuery, OAuthProviderParams } from "../dto";
import { OAuthTransactionInvalidError } from "../oauth.errors";
import { resolveAppErrorUrl, resolveAppUrl } from "../oauth.redirect";
import type { OAuthActions } from "../oauth.routes";
import { OAuthTransaction } from "../oauth-transaction.entity";

const OAUTH_DENIED_CODE = "OAUTH_DENIED";
const OAUTH_FAILED_CODE = "OAUTH_FAILED";
const OAUTH_INVALID_CODE = "OAUTH_TRANSACTION_INVALID";

interface CallbackOutcome {
  redirectTo: string | null;
  errorCode: string | null;
  session: { token: string; expiresAt: number } | null;
}

export const callbackRoute = ({
  completeOAuthFlow,
  linkOAuthAccount,
}: OAuthActions) =>
  defineRoute({
    params: OAuthProviderParams,
    query: OAuthCallbackQuery,
    response: t.Void(),
    summary: "Complete OAuth sign-in",

    action: async ({
      params,
      query,
      cookie,
      request,
      server,
      log,
    }): Promise<CallbackOutcome> => {
      let transaction: OAuthTransaction;

      try {
        if (!query.state) {
          throw new OAuthTransactionInvalidError("Invalid sign-in attempt");
        }

        transaction = OAuthTransaction.consume(
          cookie,
          params.provider,
          query.state,
        );
      } catch {
        return {
          redirectTo: null,
          errorCode: OAUTH_INVALID_CODE,
          session: null,
        };
      }

      if (query.error || !query.code) {
        return {
          redirectTo: transaction.redirectTo,
          errorCode: query.error ? OAUTH_DENIED_CODE : OAUTH_FAILED_CODE,
          session: null,
        };
      }

      try {
        if (transaction.linkUserId) {
          await linkOAuthAccount.execute({
            userId: transaction.linkUserId,
            provider: params.provider,
            code: query.code,
            codeVerifier: transaction.codeVerifier,
            nonce: transaction.nonce,
          });

          return {
            redirectTo: transaction.redirectTo,
            errorCode: null,
            session: null,
          };
        }

        const created = await completeOAuthFlow.execute({
          provider: params.provider,
          code: query.code,
          codeVerifier: transaction.codeVerifier,
          nonce: transaction.nonce,
          ...getClientInfo(request, server),
        });

        return {
          redirectTo: transaction.redirectTo,
          errorCode: null,
          session: {
            token: created.token,
            expiresAt: created.session.expiresAt,
          },
        };
      } catch (error) {
        if (!(error instanceof AppError)) {
          log.error(
            { err: error, provider: params.provider },
            "oauth callback failed",
          );

          make(ErrorReporter).report(error, {
            source: "oauth-callback",
            requestId: getRequestContext()?.requestId,
            tags: { provider: params.provider },
          });
        }

        return {
          redirectTo: transaction.redirectTo,
          errorCode: error instanceof AppError ? error.code : OAUTH_FAILED_CODE,
          session: null,
        };
      }
    },

    postAction: ({ cookie, output, set }) => {
      if (output.session) {
        writeSessionCookie(cookie, output.session);
      }

      set.status = HttpStatus.Found;
      set.headers.location = output.errorCode
        ? resolveAppErrorUrl(output.redirectTo, output.errorCode)
        : resolveAppUrl(output.redirectTo);
    },
  });
