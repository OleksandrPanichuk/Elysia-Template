import { makeService } from "@/core/registry";
import { UseCase } from "@/core/use-case";

import type { OAuthProviderName } from "../oauth.constants";
import { buildCallbackUrl } from "../oauth.redirect";
import { getOAuthProvider } from "../oauth.registry";
import { type OAuthTransaction, OAuthTransactions } from "../oauth.transaction";

export interface StartOAuthFlowUseCaseOptions {
  provider: OAuthProviderName;
  redirectTo: string | null;
  linkUserId?: string | null;
}

export interface StartedOAuthFlow {
  authorizationUrl: string;
  transaction: OAuthTransaction;
}

type Options = StartOAuthFlowUseCaseOptions;
type Result = StartedOAuthFlow;

export class StartOAuthFlowUseCase extends UseCase<Options, Result> {
  private readonly transactions = makeService(OAuthTransactions);

  public execute({
    provider,
    redirectTo,
    linkUserId = null,
  }: Options): Promise<Result> {
    const oauthProvider = getOAuthProvider(provider);
    const transaction = this.transactions.issue({
      provider,
      redirectTo,
      linkUserId,
    });

    const authorizationUrl = oauthProvider.buildAuthorizationUrl({
      state: transaction.state,
      nonce: transaction.nonce,
      codeChallenge: this.transactions.challengeFor(transaction.codeVerifier),
      redirectUri: buildCallbackUrl(provider),
    });

    return Promise.resolve({ authorizationUrl, transaction });
  }
}
