import { makeRepository } from "@/core/registry";
import { UseCase } from "@/core/use-case";
import { AccountsRepository } from "@/modules/accounts";
import { UserEntity } from "@/modules/users";

import type { OAuthProviderName } from "../oauth.constants";
import { AccountAlreadyLinkedError } from "../oauth.errors";
import { buildCallbackUrl } from "../oauth.redirect";
import { getOAuthProvider } from "../oauth.registry";

export interface LinkOAuthAccountUseCaseOptions {
  userId: string;
  provider: OAuthProviderName;
  code: string;
  codeVerifier: string;
  nonce: string;
}

type Options = LinkOAuthAccountUseCaseOptions;
type Result = void;

export class LinkOAuthAccountUseCase extends UseCase<Options, Result> {
  private readonly accountsRepository = makeRepository(AccountsRepository);

  public async execute({
    userId,
    provider,
    code,
    codeVerifier,
    nonce,
  }: Options): Promise<Result> {
    const oauthProvider = getOAuthProvider(provider);
    const { accountType } = oauthProvider;

    const identity = await oauthProvider.exchange({
      code,
      codeVerifier,
      nonce,
      redirectUri: buildCallbackUrl(provider),
    });

    const claimed = await this.accountsRepository.findByProviderAccountId(
      accountType,
      identity.providerAccountId,
    );

    if (claimed) {
      if (claimed.userId === userId) return;

      throw new AccountAlreadyLinkedError(
        "This provider account is already linked to another user",
      );
    }

    const existing = await this.accountsRepository.findByUserIdAndType(
      userId,
      accountType,
    );

    if (existing) {
      throw new AccountAlreadyLinkedError(
        "This provider is already linked to your account",
      );
    }

    await this.accountsRepository.insertOAuthAccount({
      userId,
      type: accountType,
      providerAccountId: identity.providerAccountId,
      providerEmail: UserEntity.normalizeEmail(identity.email),
    });
  }
}
